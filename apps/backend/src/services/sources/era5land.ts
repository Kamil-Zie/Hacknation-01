// T-037 DM-015 DM-011 era5land: pure ERA5-Land soil moisture (m3/m3 -> % of plot water capacity), 10-year percentile, assessment (ADR-008 v2)
import { median, percentileOf, round1 } from '@/services/sources/nasaPower.source';
import type { MeteoDay } from '@/services/sources/meteo.source';

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_YEARS = 10;
const WINDOW_HALF_DAYS = 15;
const MEAN_DAYS = 7;
const MIN_PERCENTILE_SAMPLES = 30;
const DRY_PERCENTILE = 20;
const WET_PERCENTILE = 80;
const DRY_ROOT_PCT = 30;
const WET_ROOT_PCT = 70;
// Layer thickness in cm: 0-7, 7-28, 28-100.
const THICKNESS = { top: 7, mid: 21, deep: 72 };

// DM-015 without `agreement` (decided by the engine against the KBW class).
export type Era5LandSoilMoisture = {
  label: string;
  valuePct: number | null;
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
  theta0to7M3: number | null;
  theta7to28M3: number | null;
  theta28to100M3: number | null;
  thetaFcM3: number | null;
  thetaWpM3: number | null;
  fallback: false;
};

export type Era5LandOutcome = {
  soilMoisture: Era5LandSoilMoisture | null;
  // For sources[] (sourceId era5land): ok, or missing when the series has no soil moisture.
  status: 'ok' | 'missing';
};

type Layers = { top: number | null; mid: number | null; deep: number | null };

export function computeEra5LandSoilMoisture(
  series: MeteoDay[],
  analysisDate: string,
  thetaFc: number | null,
  thetaWp: number | null,
): Era5LandOutcome {
  const byDate = new Map(series.map((day) => [day.date, day]));
  const analysis = new Date(`${analysisDate}T00:00:00Z`);

  // Last day <= D with a valid 0-7 cm value.
  const observed = [...series]
    .filter((day) => day.date <= analysisDate && day.sm0to7 !== null)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (!observed) return { soilMoisture: null, status: 'missing' };
  const observedDate = new Date(`${observed.date}T00:00:00Z`);

  const meanOf = (pick: (day: MeteoDay) => number | null): number | null => {
    const values: number[] = [];
    for (let i = 0; i < MEAN_DAYS; i += 1) {
      const day = byDate.get(toIso(new Date(observedDate.getTime() - i * DAY_MS)));
      const value = day ? pick(day) : null;
      if (value !== null) values.push(value);
    }
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
  };
  const theta: Layers = {
    top: meanOf((day) => day.sm0to7),
    mid: meanOf((day) => day.sm7to28),
    deep: meanOf((day) => day.sm28to100),
  };
  const fc = thetaFc !== null && thetaWp !== null && thetaFc > thetaWp ? thetaFc : null;
  const wp = fc === null ? null : thetaWp;
  const toPct = (value: number | null): number | null =>
    value === null || fc === null || wp === null
      ? null
      : round1(Math.min(100, Math.max(0, ((value - wp) / (fc - wp)) * 100)));

  const rootTheta = rootZoneTheta(theta);
  const rootPct = toPct(rootTheta);
  const history = historicalRootValues(byDate, analysis);
  const hasHistory = rootTheta !== null && history.length >= MIN_PERCENTILE_SAMPLES;
  const percentile = hasHistory && rootTheta !== null ? percentileOf(history, rootTheta) : null;
  const normPct = hasHistory ? toPct(median(history)) : null;

  return {
    status: 'ok',
    soilMoisture: {
      label: 'Wilgotność gleby',
      valuePct: toPct(theta.top),
      rootZonePct: rootPct,
      profilePct: toPct(profileTheta(theta)),
      percentile,
      normRootZonePct: normPct,
      anomalyPp: rootPct !== null && normPct !== null ? round1(rootPct - normPct) : null,
      assessment: assess(percentile, rootPct),
      observedAt: `${observed.date}T00:00:00.000Z`,
      ageDays: Math.round((analysis.getTime() - observedDate.getTime()) / DAY_MS),
      product: 'ERA5-Land (Copernicus C3S) przez Open-Meteo, 0–100 cm',
      // DM-015 collectionId is string(60)
      collectionId: 'open-meteo archive: soil_moisture 0-7/7-28/28-100cm',
      granuleId: null,
      resolutionKm: 9,
      depthLabel: '0–7 cm i strefa korzeniowa (7–100 cm)',
      distanceKm: null,
      theta0to7M3: round3(theta.top),
      theta7to28M3: round3(theta.mid),
      theta28to100M3: round3(theta.deep),
      thetaFcM3: fc,
      thetaWpM3: wp,
      fallback: false,
    },
  };
}

// Thickness-weighted mean of 7-28 and 28-100 cm; needs both layers.
function rootZoneTheta(theta: Layers): number | null {
  const { mid, deep } = theta;
  if (mid === null || deep === null) return null;
  return (mid * THICKNESS.mid + deep * THICKNESS.deep) / (THICKNESS.mid + THICKNESS.deep);
}

function profileTheta(theta: Layers): number | null {
  const { top, mid, deep } = theta;
  if (top === null || mid === null || deep === null) return null;
  const total = THICKNESS.top + THICKNESS.mid + THICKNESS.deep;
  return (top * THICKNESS.top + mid * THICKNESS.mid + deep * THICKNESS.deep) / total;
}

// Daily root-zone theta from the +-15 day window around D in each of the 10 previous years.
function historicalRootValues(byDate: Map<string, MeteoDay>, analysis: Date): number[] {
  const values: number[] = [];
  for (let year = 1; year <= HISTORY_YEARS; year += 1) {
    const center = new Date(analysis);
    center.setUTCFullYear(center.getUTCFullYear() - year);
    for (let offset = -WINDOW_HALF_DAYS; offset <= WINDOW_HALF_DAYS; offset += 1) {
      const day = byDate.get(toIso(new Date(center.getTime() + offset * DAY_MS)));
      const value = day
        ? rootZoneTheta({ top: null, mid: day.sm7to28, deep: day.sm28to100 })
        : null;
      if (value !== null) values.push(value);
    }
  }
  return values;
}

function assess(
  percentile: number | null,
  rootPct: number | null,
): Era5LandSoilMoisture['assessment'] {
  if (percentile === null && rootPct === null) return 'unknown';
  if (
    (percentile !== null && percentile <= DRY_PERCENTILE) ||
    (rootPct !== null && rootPct <= DRY_ROOT_PCT)
  ) {
    return 'dry';
  }
  if (
    (percentile !== null && percentile >= WET_PERCENTILE) ||
    (rootPct !== null && rootPct >= WET_ROOT_PCT)
  ) {
    return 'wet';
  }
  return 'normal';
}

function round3(value: number | null): number | null {
  return value === null ? null : Math.round(value * 1000) / 1000;
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}
