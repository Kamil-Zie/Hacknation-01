// T-037 DM-015 DM-011 nasa_power source: one NASA POWER daily point request (soil wetness, rain, temperature, humidity, wind, radiation), soil moisture with 10-year percentile, FAO-56 Penman-Monteith ET0 (Hargreaves only when inputs are missing)
import { HttpStatusError, runSource } from '@/services/sources/runSource';
import type { SourceCacheStore } from '@/services/sources/cache.service';
import { SHORT_TTL_MS, SOURCE_TTL_MS } from '@/services/sources/catalog';
import type { SourceResult } from '@/services/sources/types';

const POWER_URL = 'https://power.larc.nasa.gov/api/temporal/daily/point';
const PARAMETERS =
  'GWETTOP,GWETROOT,GWETPROF,PRECTOTCORR,T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PS';
const MISSING_VALUE = -999;
const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_YEARS = 10;
const EXTRA_DAYS_BEFORE = 75;
const WINDOW_HALF_DAYS = 15;
const MEAN_DAYS = 7;
const MIN_PERCENTILE_SAMPLES = 30;
const FRESH_DATA_DAYS = 7;
const DRY_PERCENTILE = 20;
const WET_PERCENTILE = 80;
const DRY_ROOT_PCT = 30;
const WET_ROOT_PCT = 70;
const GSC = 0.082; // solar constant, MJ m-2 min-1 (FAO-56)
const LAMBDA_INV = 0.408; // MJ m-2 d-1 to mm d-1 (FAO-56)
const SIGMA = 4.903e-9; // Stefan-Boltzmann, MJ K-4 m-2 d-1 (FAO-56)
const ALBEDO = 0.23; // grass reference crop (FAO-56)
const KRS_INTERIOR = 0.16; // Hargreaves radiation coefficient, interior locations (FAO-56 eq. 50)

export type NasaPowerDay = {
  date: string; // YYYY-MM-DD
  gwetTop: number | null; // 0-1
  gwetRoot: number | null;
  gwetProf: number | null;
  precipitationMm: number | null;
  t2m: number | null;
  tmaxC: number | null;
  tminC: number | null;
  rhPct: number | null; // RH2M, %
  windMs: number | null; // WS2M, m/s at 2 m
  solarMj: number | null; // ALLSKY_SFC_SW_DWN, MJ m-2 d-1 (lags a few days behind the rest)
  pressureKpa: number | null; // PS, kPa
};

export type Et0Method = 'penman-monteith' | 'penman-monteith-rs-estimated' | 'hargreaves';

export type NasaPowerDeps = {
  cache?: SourceCacheStore;
  fetchFn?: typeof fetch;
};

// DM-015 without `agreement` (decided by the engine against the KBW class).
export type SoilMoisture = {
  label: string;
  valuePct: number;
  rootZonePct: number | null;
  profilePct: number | null;
  percentile: number | null;
  normRootZonePct: number | null;
  anomalyPp: number | null;
  assessment: 'dry' | 'normal' | 'wet' | 'unknown';
  observedAt: string;
  ageDays: number;
  product: string;
  collectionId: string;
  granuleId: null;
  resolutionKm: number;
  depthLabel: string;
  distanceKm: null;
};

export type MeteoFallbackDay = {
  date: string;
  precipitationMm: number | null;
  tmaxC: number | null;
  tminC: number | null;
  et0Mm: number | null;
  et0Method: Et0Method | null;
};

type PowerResponse = {
  properties?: { parameter?: Record<string, Record<string, number> | undefined> };
};

export async function fetchNasaPowerDaily(
  lat: number,
  lon: number,
  analysisDate: string,
  signal?: AbortSignal,
  deps: NasaPowerDeps = {},
): Promise<SourceResult<NasaPowerDay[]>> {
  const end = new Date(`${analysisDate}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - HISTORY_YEARS);
  start.setTime(start.getTime() - EXTRA_DAYS_BEFORE * DAY_MS);
  // Vulnerability needs complete seasons of all 10 previous years, so never start after 1 Jan of year D-10.
  const firstSeason = Date.UTC(end.getUTCFullYear() - HISTORY_YEARS, 0, 1);
  if (start.getTime() > firstSeason) start.setTime(firstSeason);
  const startCompact = toCompact(start);
  const endCompact = toCompact(end);
  const latR = lat.toFixed(2);
  const lonR = lon.toFixed(2);
  const isFresh = end.getTime() > Date.now() - FRESH_DATA_DAYS * DAY_MS;
  const doFetch = deps.fetchFn ?? fetch;

  return runSource<NasaPowerDay[]>({
    sourceId: 'nasa_power',
    // v2: request has RH2M, WS2M, ALLSKY_SFC_SW_DWN, PS for Penman-Monteith (v1 entries lack them)
    key: `nasa_power:v2:${latR}:${lonR}:${startCompact}:${endCompact}`,
    ttlMs: isFresh ? SHORT_TTL_MS.nasa_power : SOURCE_TTL_MS.nasa_power,
    signal,
    cache: deps.cache,
    fetcher: async (fetchSignal) => {
      const url =
        `${POWER_URL}?parameters=${PARAMETERS}&community=AG&longitude=${lonR}&latitude=${latR}` +
        `&start=${startCompact}&end=${endCompact}&format=JSON`;
      const response = await doFetch(url, { signal: fetchSignal });
      if (!response.ok) throw new HttpStatusError(response.status);
      const series = parsePowerResponse((await response.json()) as PowerResponse);
      return series.length > 0
        ? { data: series, dataPeriod: `${toIso(start)}/${toIso(end)}` }
        : null;
    },
  });
}

export function parsePowerResponse(body: PowerResponse): NasaPowerDay[] {
  const parameter = body.properties?.parameter;
  const top = parameter?.GWETTOP;
  if (!parameter || !top) return [];
  const value = (name: string, key: string): number | null => {
    const raw = parameter[name]?.[key];
    return typeof raw === 'number' && raw !== MISSING_VALUE ? raw : null;
  };
  return Object.keys(top)
    .sort()
    .map((key) => ({
      date: `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6, 8)}`,
      gwetTop: value('GWETTOP', key),
      gwetRoot: value('GWETROOT', key),
      gwetProf: value('GWETPROF', key),
      precipitationMm: value('PRECTOTCORR', key),
      t2m: value('T2M', key),
      tmaxC: value('T2M_MAX', key),
      tminC: value('T2M_MIN', key),
      rhPct: value('RH2M', key),
      windMs: value('WS2M', key),
      solarMj: value('ALLSKY_SFC_SW_DWN', key),
      pressureKpa: value('PS', key),
    }));
}

export function computeSoilMoisture(
  series: NasaPowerDay[],
  analysisDate: string,
): SoilMoisture | null {
  const byDate = new Map(series.map((day) => [day.date, day]));
  const analysis = new Date(`${analysisDate}T00:00:00Z`);

  // Last day <= D with a valid 0-5 cm value.
  const observed = [...series]
    .filter((day) => day.date <= analysisDate && day.gwetTop !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!observed) return null;
  const observedDate = new Date(`${observed.date}T00:00:00Z`);

  const meanOf = (pick: (day: NasaPowerDay) => number | null): number | null => {
    const values: number[] = [];
    for (let i = 0; i < MEAN_DAYS; i += 1) {
      const day = byDate.get(toIso(new Date(observedDate.getTime() - i * DAY_MS)));
      const value = day ? pick(day) : null;
      if (value !== null) values.push(value);
    }
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };

  const top = meanOf((day) => day.gwetTop);
  if (top === null) return null;
  const root = meanOf((day) => day.gwetRoot);
  const profile = meanOf((day) => day.gwetProf);
  const rootPct = root === null ? null : round1(root * 100);

  const history = historicalRootValues(byDate, analysis);
  const hasHistory = rootPct !== null && history.length >= MIN_PERCENTILE_SAMPLES;
  const percentile = hasHistory && root !== null ? percentileOf(history, root) : null;
  const normPct = hasHistory ? round1(median(history) * 100) : null;
  const anomalyPp = rootPct !== null && normPct !== null ? round1(rootPct - normPct) : null;

  return {
    label: 'Wilgotność gleby',
    valuePct: round1(top * 100),
    rootZonePct: rootPct,
    profilePct: profile === null ? null : round1(profile * 100),
    percentile,
    normRootZonePct: normPct,
    anomalyPp,
    assessment: assess(percentile, rootPct),
    observedAt: `${observed.date}T00:00:00.000Z`,
    ageDays: Math.round((analysis.getTime() - observedDate.getTime()) / DAY_MS),
    product: 'NASA POWER daily, MERRA-2 (GWETTOP, GWETROOT, GWETPROF)',
    collectionId: 'POWER daily point AG: GWETTOP,GWETROOT,GWETPROF',
    granuleId: null,
    resolutionKm: 50,
    depthLabel: '0–5 cm i strefa korzeniowa (ok. 1 m)',
    distanceKm: null,
  };
}

// Extraterrestrial radiation Ra, MJ m-2 d-1 (FAO-56 eq. 21-25).
export function extraterrestrialRadiation(latDeg: number, dayOfYear: number): number {
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * dayOfYear) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * dayOfYear) / 365 - 1.39);
  const ws = Math.acos(Math.min(1, Math.max(-1, -Math.tan(phi) * Math.tan(delta))));
  return (
    ((24 * 60) / Math.PI) *
    GSC *
    dr *
    (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws))
  );
}

// Hargreaves-Samani ET0, mm/day (FAO-56 eq. 52).
export function hargreavesEt0(
  tmin: number,
  tmax: number,
  tmean: number,
  latDeg: number,
  dayOfYear: number,
): number {
  const ra = extraterrestrialRadiation(latDeg, dayOfYear);
  return 0.0023 * (tmean + 17.8) * Math.sqrt(Math.max(0, tmax - tmin)) * LAMBDA_INV * ra;
}

// Saturation vapour pressure e°(T), kPa (FAO-56 eq. 11).
function saturationVapourPressure(tC: number): number {
  return 0.6108 * Math.exp((17.27 * tC) / (tC + 237.3));
}

export type PenmanMonteithInput = {
  tmin: number; // °C
  tmax: number; // °C
  rhMeanPct: number; // %
  windMs: number; // m/s at 2 m
  pressureKpa: number;
  solarMj: number | null; // measured Rs; null = estimated from temperature range (FAO-56 eq. 50)
  latDeg: number;
  dayOfYear: number;
  elevationM?: number; // for Rso (FAO-56 eq. 37); 0 when unknown
};

// FAO-56 Penman-Monteith reference ET0, mm/day (eq. 6), daily step, G = 0.
export function penmanMonteithEt0(input: PenmanMonteithInput): number {
  const { tmin, tmax, rhMeanPct, windMs, pressureKpa, latDeg, dayOfYear: doy } = input;
  const tmean = (tmax + tmin) / 2;
  const delta = (4098 * saturationVapourPressure(tmean)) / Math.pow(tmean + 237.3, 2); // eq. 13
  const gamma = 0.000665 * pressureKpa; // eq. 8
  const es = (saturationVapourPressure(tmax) + saturationVapourPressure(tmin)) / 2; // eq. 12
  const ea = (Math.min(100, Math.max(0, rhMeanPct)) / 100) * es; // eq. 19 (RHmean)
  const ra = extraterrestrialRadiation(latDeg, doy);
  const rs = input.solarMj ?? KRS_INTERIOR * Math.sqrt(Math.max(0, tmax - tmin)) * ra; // eq. 50
  const rso = (0.75 + 2e-5 * (input.elevationM ?? 0)) * ra; // eq. 37
  const rns = (1 - ALBEDO) * rs; // eq. 38
  const relativeShortwave = rso > 0 ? Math.min(1, rs / rso) : 1;
  const rnl =
    SIGMA *
    ((Math.pow(tmax + 273.16, 4) + Math.pow(tmin + 273.16, 4)) / 2) *
    (0.34 - 0.14 * Math.sqrt(Math.max(0, ea))) *
    (1.35 * relativeShortwave - 0.35); // eq. 39
  const rn = rns - rnl; // eq. 40
  const et0 =
    (LAMBDA_INV * delta * rn + gamma * (900 / (tmean + 273)) * windMs * (es - ea)) /
    (delta + gamma * (1 + 0.34 * windMs));
  return Math.max(0, et0);
}

// ET0 for one NASA POWER day: Penman-Monteith when humidity, wind and pressure exist
// (Rs estimated from temperatures when radiation is not yet published), Hargreaves otherwise.
export function nasaDayEt0(
  day: NasaPowerDay,
  lat: number,
): { et0Mm: number; method: Et0Method } | null {
  if (day.tmaxC === null || day.tminC === null) return null;
  const doy = dayOfYear(day.date);
  if (day.rhPct !== null && day.windMs !== null && day.pressureKpa !== null) {
    const et0 = penmanMonteithEt0({
      tmin: day.tminC,
      tmax: day.tmaxC,
      rhMeanPct: day.rhPct,
      windMs: day.windMs,
      pressureKpa: day.pressureKpa,
      solarMj: day.solarMj,
      latDeg: lat,
      dayOfYear: doy,
    });
    return {
      et0Mm: et0,
      method: day.solarMj === null ? 'penman-monteith-rs-estimated' : 'penman-monteith',
    };
  }
  const tmean = day.t2m ?? (day.tmaxC + day.tminC) / 2;
  return { et0Mm: hargreavesEt0(day.tminC, day.tmaxC, tmean, lat, doy), method: 'hargreaves' };
}

export function toMeteoFallbackSeries(series: NasaPowerDay[], lat: number): MeteoFallbackDay[] {
  return series.map((day) => {
    const et0 = nasaDayEt0(day, lat);
    return {
      date: day.date,
      precipitationMm: day.precipitationMm,
      tmaxC: day.tmaxC,
      tminC: day.tminC,
      et0Mm: et0 === null ? null : Math.round(et0.et0Mm * 100) / 100,
      et0Method: et0?.method ?? null,
    };
  });
}

// Daily GWETROOT values (0-1) from the +-15 day window around D in each of the 10 previous years.
function historicalRootValues(byDate: Map<string, NasaPowerDay>, analysis: Date): number[] {
  const values: number[] = [];
  for (let year = 1; year <= HISTORY_YEARS; year += 1) {
    const center = new Date(analysis);
    center.setUTCFullYear(center.getUTCFullYear() - year);
    for (let offset = -WINDOW_HALF_DAYS; offset <= WINDOW_HALF_DAYS; offset += 1) {
      const value = byDate.get(toIso(new Date(center.getTime() + offset * DAY_MS)))?.gwetRoot;
      if (value !== null && value !== undefined) values.push(value);
    }
  }
  return values;
}

function assess(percentile: number | null, rootPct: number | null): SoilMoisture['assessment'] {
  if (rootPct === null) return 'unknown';
  if ((percentile !== null && percentile <= DRY_PERCENTILE) || rootPct <= DRY_ROOT_PCT) {
    return 'dry';
  }
  if ((percentile !== null && percentile >= WET_PERCENTILE) || rootPct >= WET_ROOT_PCT) {
    return 'wet';
  }
  return 'normal';
}

// Share of reference values below x (ties count half), 0-100.
export function percentileOf(values: number[], x: number): number {
  const eps = 1e-9;
  const below = values.filter((v) => v < x - eps).length;
  const equal = values.filter((v) => Math.abs(v - x) <= eps).length;
  return Math.round(((below + equal / 2) / values.length) * 100);
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function dayOfYear(date: string): number {
  const d = new Date(`${date}T00:00:00Z`);
  return Math.round((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / DAY_MS);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toCompact(date: Date): string {
  return toIso(date).replace(/-/g, '');
}
