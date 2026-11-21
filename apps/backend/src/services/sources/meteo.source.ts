// T-010 T-037 DM-011 DM-012 DM-015 meteo source (ADR-009): Open-Meteo archive D-90..D (daily meteo + ERA5-Land soil moisture, one request), NASA POWER 10-year climatology always, NASA fallback for the current window
import { HttpStatusError, runSource } from '@/services/sources/runSource';
import type { SourceCacheStore } from '@/services/sources/cache.service';
import { SHORT_TTL_MS, SOURCE_TTL_MS } from '@/services/sources/catalog';
import { fetchNasaPowerDaily, toMeteoFallbackSeries } from '@/services/sources/nasaPower.source';
import type { NasaPowerDay } from '@/services/sources/nasaPower.source';
import type { SourceResult } from '@/services/sources/types';

const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const TIMEZONE = 'Europe/Warsaw';
const DAILY_VARIABLES = [
  'precipitation_sum',
  'temperature_2m_mean',
  'temperature_2m_max',
  'temperature_2m_min',
  'et0_fao_evapotranspiration',
];
const HOURLY_VARIABLES = [
  'soil_moisture_0_to_7cm',
  'soil_moisture_7_to_28cm',
  'soil_moisture_28_to_100cm',
];
const DAY_MS = 24 * 60 * 60 * 1000;
const CURRENT_WINDOW_DAYS = 90; // ADR-009: current window D-90..D
const FRESH_DATA_DAYS = 7;
const METEO_TIMEOUT_MS = 15000; // one 90-day request
const FALLBACK_CONFIDENCE_PENALTY = 0.05;
const FALLBACK_LIMITATION =
  'Pogoda i wilgotność gleby z zapasowego źródła NASA POWER (ok. 50 km, dane do ok. 3 dni wstecz), ET0 metodą FAO-56 Penman-Monteith (dla ostatnich dni bez pomiaru promieniowania szacowanego z temperatur)';
const SPLIT_LIMITATION =
  'Stan bieżący (opad, ET0, KBW, wilgotność gleby) pochodzi z Open-Meteo (ERA5 i ERA5-Land, ok. 9 km), a ocena na tle 10 lat (percentyl, anomalia, klasa, podatność) z NASA POWER (ok. 50 km, ET0 metodą FAO-56 Penman-Monteith po obu stronach porównania), więc percentyl opisuje region, a nie samą działkę. Normę KBW pokazano jako bieżący KBW minus anomalia z NASA POWER, żeby obie wartości były na tej samej skali.';
const NO_CLIMATOLOGY_GAP = {
  sourceId: 'nasa_power' as const,
  what: 'Brak wieloletniej klimatologii z NASA POWER (10 lat)',
  impact:
    'Nie policzono percentyla, anomalii i podatności wieloletniej; raport pokazuje sam stan bieżący, pewność obniżona',
};

export type MeteoDay = {
  date: string; // YYYY-MM-DD
  precipitationMm: number | null;
  tmeanC: number | null;
  tmaxC: number | null;
  tminC: number | null;
  et0Mm: number | null;
  // ERA5-Land daily means, m3/m3; null for the fallback series.
  sm0to7: number | null;
  sm7to28: number | null;
  sm28to100: number | null;
};

export type MeteoDeps = {
  cache?: SourceCacheStore;
  fetchFn?: typeof fetch; // used for both Open-Meteo and the NASA POWER fallback
};

export type MeteoDataGap = { sourceId: 'nasa_power'; what: string; impact: string }; // DM-012

export type MeteoOutcome = {
  // Current window D-90..D (never contains days after D): Open-Meteo, or NASA POWER when Open-Meteo failed.
  current: {
    series: MeteoDay[];
    source: 'open-meteo' | 'nasa_power' | null; // null when both sources failed
    fallback: boolean;
  };
  // 10-year NASA POWER series (ET0 FAO-56 Penman-Monteith) for percentile, anomaly, vulnerability; null without NASA.
  climatology: { series: MeteoDay[] } | null;
  nasaSeries: NasaPowerDay[] | null; // raw NASA series for computeSoilMoisture
  confidencePenalty: number; // 0.05 when fallback, else 0
  limitations: string[];
  sources: SourceResult<null>[]; // meteo (role current) and nasa_power (climatology, or fallback)
  dataGaps: MeteoDataGap[]; // filled when NASA POWER is missing
};

type OpenMeteoResponse = {
  daily?: { time?: string[] } & Record<string, (number | string | null)[] | undefined>;
  hourly?: { time?: string[] } & Record<string, (number | string | null)[] | undefined>;
};

export async function fetchMeteo(
  lat: number,
  lon: number,
  analysisDate: string,
  signal?: AbortSignal,
  deps: MeteoDeps = {},
): Promise<MeteoOutcome> {
  const end = new Date(`${analysisDate}T00:00:00Z`);
  const start = new Date(end.getTime() - CURRENT_WINDOW_DAYS * DAY_MS);
  const latR = lat.toFixed(2);
  const lonR = lon.toFixed(2);
  const isFresh = end.getTime() > Date.now() - FRESH_DATA_DAYS * DAY_MS;
  const doFetch = deps.fetchFn ?? fetch;

  const requestWindow = async (fetchSignal: AbortSignal) => {
    const url =
      `${ARCHIVE_URL}?latitude=${latR}&longitude=${lonR}&start_date=${toIso(start)}&end_date=${toIso(end)}` +
      `&daily=${DAILY_VARIABLES.join(',')}&hourly=${HOURLY_VARIABLES.join(',')}&timezone=${TIMEZONE}`;
    const response = await doFetch(url, { signal: fetchSignal });
    if (!response.ok) throw new HttpStatusError(response.status);
    return parseOpenMeteoResponse((await response.json()) as OpenMeteoResponse, analysisDate);
  };

  // Both sources always run in parallel; runSource never throws.
  const [meteo, nasa] = await Promise.all([
    runSource<MeteoDay[]>({
      sourceId: 'meteo',
      key: `meteo:${latR}:${lonR}:${toIso(start)}:${toIso(end)}`,
      ttlMs: isFresh ? SHORT_TTL_MS.meteo : SOURCE_TTL_MS.meteo,
      timeoutMs: METEO_TIMEOUT_MS,
      signal,
      cache: deps.cache,
      fetcher: async (fetchSignal) => {
        const series = await requestWindow(fetchSignal);
        return series.length > 0
          ? { data: series, dataPeriod: `${toIso(start)}/${toIso(end)}` }
          : null;
      },
    }),
    fetchNasaPowerDaily(lat, lon, analysisDate, signal, {
      cache: deps.cache,
      fetchFn: deps.fetchFn,
    }),
  ]);

  const nasaSeries = nasa.data ? nasa.data.filter((day) => day.date <= analysisDate) : null;
  const climatologySeries = nasaSeries ? toMeteoDays(nasaSeries, lat) : null;
  const meteoOk = (meteo.status === 'ok' || meteo.status === 'cached') && meteo.data;
  const fromDate = toIso(start);

  const current: MeteoOutcome['current'] = meteoOk
    ? { series: meteo.data!, source: 'open-meteo', fallback: false }
    : climatologySeries
      ? {
          series: climatologySeries.filter((day) => day.date >= fromDate),
          source: 'nasa_power',
          fallback: true,
        }
      : { series: [], source: null, fallback: true };

  const limitations: string[] = [];
  if (current.source === 'nasa_power') limitations.push(FALLBACK_LIMITATION);
  if (current.source !== null && nasaSeries) limitations.push(SPLIT_LIMITATION);

  return {
    current,
    climatology: climatologySeries ? { series: climatologySeries } : null,
    nasaSeries,
    confidencePenalty: current.source === 'nasa_power' ? FALLBACK_CONFIDENCE_PENALTY : 0,
    limitations,
    sources: [
      { ...meteo, data: null, role: 'current' },
      { ...nasa, data: null, role: current.source === 'nasa_power' ? 'fallback' : 'climatology' },
    ],
    dataGaps: nasaSeries ? [] : [NO_CLIMATOLOGY_GAP],
  };
}

// Maps one Open-Meteo response (daily + hourly) to daily rows, dropping days after D.
export function parseOpenMeteoResponse(body: OpenMeteoResponse, analysisDate: string): MeteoDay[] {
  const daily = body.daily;
  const dates = daily?.time ?? [];
  const numbers = (name: string): (number | null)[] =>
    (daily?.[name] ?? []).map((value) => (typeof value === 'number' ? value : null));
  const rain = numbers('precipitation_sum');
  const tmean = numbers('temperature_2m_mean');
  const tmax = numbers('temperature_2m_max');
  const tmin = numbers('temperature_2m_min');
  const et0 = numbers('et0_fao_evapotranspiration');
  const soil = dailyMeans(body.hourly, HOURLY_VARIABLES);

  const days: MeteoDay[] = [];
  dates.forEach((date, index) => {
    if (date > analysisDate) return;
    days.push({
      date,
      precipitationMm: rain[index] ?? null,
      tmeanC: tmean[index] ?? null,
      tmaxC: tmax[index] ?? null,
      tminC: tmin[index] ?? null,
      et0Mm: et0[index] ?? null,
      sm0to7: soil.get(`${date}|0`) ?? null,
      sm7to28: soil.get(`${date}|1`) ?? null,
      sm28to100: soil.get(`${date}|2`) ?? null,
    });
  });
  return days;
}

// Hourly values (local time, YYYY-MM-DDTHH:MM) -> mean per local day and variable; null hours are skipped.
function dailyMeans(hourly: OpenMeteoResponse['hourly'], variables: string[]): Map<string, number> {
  const sums = new Map<string, { sum: number; count: number }>();
  const times = hourly?.time ?? [];
  variables.forEach((name, layer) => {
    const values = hourly?.[name] ?? [];
    times.forEach((time, index) => {
      const value = values[index];
      if (typeof value !== 'number') return;
      const key = `${time.slice(0, 10)}|${layer}`;
      const entry = sums.get(key) ?? { sum: 0, count: 0 };
      sums.set(key, { sum: entry.sum + value, count: entry.count + 1 });
    });
  });
  return new Map([...sums].map(([key, { sum, count }]) => [key, sum / count]));
}

function toMeteoDays(series: NasaPowerDay[], lat: number): MeteoDay[] {
  const raw = new Map(series.map((day) => [day.date, day]));
  return toMeteoFallbackSeries(series, lat).map((day) => {
    const t2m = raw.get(day.date)?.t2m ?? null;
    const hasRange = day.tmaxC !== null && day.tminC !== null;
    return {
      date: day.date,
      precipitationMm: day.precipitationMm,
      tmeanC: t2m ?? (hasRange ? (day.tmaxC! + day.tminC!) / 2 : null),
      tmaxC: day.tmaxC,
      tminC: day.tminC,
      et0Mm: day.et0Mm,
      sm0to7: null,
      sm7to28: null,
      sm28to100: null,
    };
  });
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
