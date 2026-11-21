// T-012 DM-006 Crop water demand (FAO-56): ETc = Kc·ET0 and root-zone depletion Dr
import { addDays, MAX_MISSING_FRACTION, type DailyWeather } from './kbw.js';

export type SoilWaterBalance = {
  tawMm: number;
  rawMm: number;
  depletionMm: number | null;
  isStressed: boolean | null;
};

export type SoilWaterBalanceOutcome = { soilWater: SoilWaterBalance | null; reason: string | null };

const SEASON_FIRST_MONTH = 3;
const SEASON_LAST_MONTH = 10;

// FAO-56 single crop coefficient approach: ETc = Kc * ET0 (mm/day).
export function dailyEtc(et0Mm: number, kc: number): number {
  return kc * et0Mm;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

// FAO-56 Eq. 85 simplified (ADR-007 section 4): no runoff, deep percolation or capillary rise
// beyond clamping. Dr starts at 0 (field capacity) on 1 March and is bounded to [0, TAW].
export function computeSoilWaterBalance(
  series: DailyWeather[],
  analysisDate: string,
  kcForDate: (date: string) => number,
  tawMm: number | null,
  rawMm: number | null,
): SoilWaterBalanceOutcome {
  if (tawMm === null || rawMm === null) {
    return { soilWater: null, reason: 'no soil data, soil water balance not computed' };
  }
  const noDepletion = (reason: string): SoilWaterBalanceOutcome => ({
    soilWater: { tawMm, rawMm, depletionMm: null, isStressed: null },
    reason,
  });

  const month = Number(analysisDate.slice(5, 7));
  if (month < SEASON_FIRST_MONTH || month > SEASON_LAST_MONTH) {
    return noDepletion('analysis date outside the March-October growing season');
  }

  const byDate = new Map<string, DailyWeather>();
  for (const day of series) byDate.set(day.date, day);

  const start = `${analysisDate.slice(0, 4)}-03-01`;
  let depletion = 0;
  let total = 0;
  let missing = 0;
  for (let date = start; date <= analysisDate; date = addDays(date, 1)) {
    total += 1;
    const day = byDate.get(date);
    if (!day || day.precipitationMm === null || day.et0Mm === null) {
      missing += 1;
      continue;
    }
    const next = depletion - day.precipitationMm + dailyEtc(day.et0Mm, kcForDate(date));
    depletion = Math.min(Math.max(next, 0), tawMm);
  }
  if (missing / total > MAX_MISSING_FRACTION) {
    return noDepletion(`${missing} of ${total} days missing since ${start}`);
  }
  return {
    soilWater: {
      tawMm,
      rawMm,
      depletionMm: round1(depletion),
      isStressed: depletion > rawMm,
    },
    reason: null,
  };
}
