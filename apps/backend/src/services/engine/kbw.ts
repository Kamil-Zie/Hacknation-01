// T-009 DM-013 KBW engine: water balance windows, 10-year norm, anomaly, percentile

export type DailyWeather = {
  date: string;
  precipitationMm: number | null;
  et0Mm: number | null;
  tmaxC: number | null;
};

export type WaterBalanceWindow = {
  days: number;
  from: string;
  to: string;
  precipitationMm: number;
  et0Mm: number;
  etcMm: number;
  kbwMm: number;
  normKbwMm: number;
  anomalyMm: number;
  percentile: number;
  precipitationNormPct: number | null;
  meanTmaxC: number | null;
  normTmaxC: number | null;
};

export type KbwResult = {
  kbw30: WaterBalanceWindow | null;
  kbw60: WaterBalanceWindow | null;
  gaps: string[];
};

export const MAX_MISSING_FRACTION = 0.1;
export const MIN_REFERENCE_SAMPLES = 35;
const REFERENCE_YEARS = 10;
const REFERENCE_OFFSETS = [-15, -10, -5, 0, 5, 10, 15];
const DAY_MS = 86_400_000;

type WindowSums = {
  precipitationMm: number;
  et0Mm: number;
  etcMm: number;
  kbwMm: number;
  meanTmaxC: number | null;
};

type WindowOutcome = { ok: true; sums: WindowSums } | { ok: false; reason: string };

export function addDays(date: string, delta: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10);
}

function isLeap(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function sumWindow(
  byDate: Map<string, DailyWeather>,
  end: string,
  n: number,
  kcForDate: (date: string) => number,
): WindowOutcome {
  let precipitation = 0;
  let et0 = 0;
  let etc = 0;
  let tmaxSum = 0;
  let tmaxCount = 0;
  let missing = 0;
  for (let i = n - 1; i >= 0; i -= 1) {
    const date = addDays(end, -i);
    const day = byDate.get(date);
    if (!day || day.precipitationMm === null || day.et0Mm === null) {
      missing += 1;
      continue;
    }
    precipitation += day.precipitationMm;
    et0 += day.et0Mm;
    etc += day.et0Mm * kcForDate(date);
    if (day.tmaxC !== null) {
      tmaxSum += day.tmaxC;
      tmaxCount += 1;
    }
  }
  if (missing / n > MAX_MISSING_FRACTION) {
    return { ok: false, reason: `${missing} of ${n} days missing in window ending ${end}` };
  }
  return {
    ok: true,
    sums: {
      precipitationMm: precipitation,
      et0Mm: et0,
      etcMm: etc,
      kbwMm: precipitation - etc,
      meanTmaxC: tmaxCount > 0 ? tmaxSum / tmaxCount : null,
    },
  };
}

function referenceEndDates(analysisDate: string): string[] {
  const year = Number(analysisDate.slice(0, 4));
  const monthDay = analysisDate.slice(5);
  const ends: string[] = [];
  for (let k = 1; k <= REFERENCE_YEARS; k += 1) {
    const refYear = year - k;
    const md = monthDay === '02-29' && !isLeap(refYear) ? '02-28' : monthDay;
    const base = `${refYear}-${md}`;
    for (const offset of REFERENCE_OFFSETS) ends.push(addDays(base, offset));
  }
  return ends;
}

function computeWindow(
  byDate: Map<string, DailyWeather>,
  analysisDate: string,
  n: number,
  kcForDate: (date: string) => number,
  gaps: string[],
): WaterBalanceWindow | null {
  const current = sumWindow(byDate, analysisDate, n, kcForDate);
  if (!current.ok) {
    gaps.push(`kbw${n}: ${current.reason}`);
    return null;
  }

  const samples: WindowSums[] = [];
  for (const end of referenceEndDates(analysisDate)) {
    const sample = sumWindow(byDate, end, n, kcForDate);
    if (sample.ok) samples.push(sample.sums);
  }
  if (samples.length < MIN_REFERENCE_SAMPLES) {
    gaps.push(
      `kbw${n}: only ${samples.length} complete reference samples (need ${MIN_REFERENCE_SAMPLES})`,
    );
    return null;
  }

  const kbw = current.sums.kbwMm;
  const normKbw = median(samples.map((s) => s.kbwMm));
  const normPrecipitation = median(samples.map((s) => s.precipitationMm));
  const tmaxMeans = samples.map((s) => s.meanTmaxC).filter((v): v is number => v !== null);
  const atOrBelow = samples.filter((s) => s.kbwMm <= kbw).length;

  return {
    days: n,
    from: addDays(analysisDate, -(n - 1)),
    to: analysisDate,
    precipitationMm: round1(current.sums.precipitationMm),
    et0Mm: round1(current.sums.et0Mm),
    etcMm: round1(current.sums.etcMm),
    kbwMm: round1(kbw),
    normKbwMm: round1(normKbw),
    anomalyMm: round1(kbw - normKbw),
    percentile: Math.round((100 * atOrBelow) / samples.length),
    precipitationNormPct:
      normPrecipitation > 0
        ? round1((100 * current.sums.precipitationMm) / normPrecipitation)
        : null,
    meanTmaxC: current.sums.meanTmaxC === null ? null : round1(current.sums.meanTmaxC),
    normTmaxC: tmaxMeans.length > 0 ? round1(median(tmaxMeans)) : null,
  };
}

export type CurrentWindow = {
  days: number;
  from: string;
  to: string;
  precipitationMm: number;
  et0Mm: number;
  etcMm: number;
  kbwMm: number;
  meanTmaxC: number | null;
};

// ADR-009: current-window values only (no 10-year norm), from the current series (Open-Meteo D-90..D).
// Returns null when more than MAX_MISSING_FRACTION of the days are missing.
export function computeCurrentWindow(
  series: DailyWeather[],
  analysisDate: string,
  days: number,
  kcForDate: (date: string) => number,
): CurrentWindow | null {
  const byDate = new Map<string, DailyWeather>();
  for (const day of series) {
    if (day.date <= analysisDate) byDate.set(day.date, day);
  }
  const outcome = sumWindow(byDate, analysisDate, days, kcForDate);
  if (!outcome.ok) return null;
  const { sums } = outcome;
  return {
    days,
    from: addDays(analysisDate, -(days - 1)),
    to: analysisDate,
    precipitationMm: round1(sums.precipitationMm),
    et0Mm: round1(sums.et0Mm),
    etcMm: round1(sums.etcMm),
    kbwMm: round1(sums.kbwMm),
    meanTmaxC: sums.meanTmaxC === null ? null : round1(sums.meanTmaxC),
  };
}

export type KbwPoint = { date: string; kbwMm: number };
export type KbwBandPoint = { date: string; p10: number; p50: number; p90: number };

const MIN_CLIMATOLOGY_YEARS = 8;

function indexByDate(series: DailyWeather[]): Map<string, DailyWeather> {
  return new Map(series.map((day) => [day.date, day]));
}

// T-038 DM-001 charts: KBW60 ending on each day from..to (one point per day).
// Days whose 60-day window has more than MAX_MISSING_FRACTION of days missing are skipped.
export function kbw60DailySeries(
  series: DailyWeather[],
  from: string,
  to: string,
  kcForDate: (date: string) => number,
): KbwPoint[] {
  const byDate = indexByDate(series);
  const points: KbwPoint[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const outcome = sumWindow(byDate, date, 60, kcForDate);
    if (outcome.ok) points.push({ date, kbwMm: round1(outcome.sums.kbwMm) });
  }
  return points;
}

// Linear-interpolation percentile (the same as numpy default) of an ascending array.
function percentile(sorted: number[], p: number): number {
  const pos = p * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo);
}

// T-038 DM-001 charts (ADR-009): for each date (a day of the analysis year) p10/p50/p90 of the
// KBW60 ending on the same calendar day in each of the 10 years before it (29 Feb -> 28 Feb
// in non-leap years). Points with fewer than MIN_CLIMATOLOGY_YEARS complete years are skipped.
export function kbw60Climatology(
  series: DailyWeather[],
  dates: string[],
  kcForDate: (date: string) => number,
): KbwBandPoint[] {
  const byDate = indexByDate(series);
  const points: KbwBandPoint[] = [];
  for (const date of dates) {
    const year = Number(date.slice(0, 4));
    const monthDay = date.slice(5);
    const values: number[] = [];
    for (let k = 1; k <= REFERENCE_YEARS; k += 1) {
      const refYear = year - k;
      const md = monthDay === '02-29' && !isLeap(refYear) ? '02-28' : monthDay;
      const outcome = sumWindow(byDate, `${refYear}-${md}`, 60, kcForDate);
      if (outcome.ok) values.push(outcome.sums.kbwMm);
    }
    if (values.length < MIN_CLIMATOLOGY_YEARS) continue;
    values.sort((a, b) => a - b);
    points.push({
      date,
      p10: round1(percentile(values, 0.1)),
      p50: round1(percentile(values, 0.5)),
      p90: round1(percentile(values, 0.9)),
    });
  }
  return points;
}

export function computeKbwWindows(
  series: DailyWeather[],
  analysisDate: string,
  kcForDate: (date: string) => number,
): KbwResult {
  const byDate = new Map<string, DailyWeather>();
  for (const day of series) {
    if (day.date <= analysisDate) byDate.set(day.date, day);
  }
  const gaps: string[] = [];
  return {
    kbw30: computeWindow(byDate, analysisDate, 30, kcForDate, gaps),
    kbw60: computeWindow(byDate, analysisDate, 60, kcForDate, gaps),
    gaps,
  };
}
