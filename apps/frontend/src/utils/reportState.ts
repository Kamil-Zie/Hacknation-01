// UI-S-003 Report state helpers: alert levels for metric cards and the soil water slider position
import type { IndexAssessment, SatelliteSoilMoisture, Severity } from '@/api/types';

export type AlertLevel = Severity | 'ok' | 'unknown';

export const ALERT_TEXT: Record<AlertLevel, string> = {
  high: 'Bardzo sucho',
  medium: 'Za sucho',
  low: 'Trochę sucho',
  ok: 'W normie',
  unknown: 'Brak oceny',
};

const KBW_HIGH_PERCENTILE = 10;
const KBW_MEDIUM_PERCENTILE = 25;
const KBW_LOW_PERCENTILE = 40;

export function kbwAlert(percentile: number): AlertLevel {
  if (percentile <= KBW_HIGH_PERCENTILE) return 'high';
  if (percentile <= KBW_MEDIUM_PERCENTILE) return 'medium';
  if (percentile <= KBW_LOW_PERCENTILE) return 'low';
  return 'ok';
}

export function indexAlert(assessment: IndexAssessment): AlertLevel {
  if (assessment === 'below') return 'medium';
  return assessment === 'unknown' ? 'unknown' : 'ok';
}

export function soilMoistureAlert(assessment: SatelliteSoilMoisture['assessment']): AlertLevel {
  if (assessment === 'dry') return 'medium';
  return assessment === 'unknown' ? 'unknown' : 'ok';
}

export interface SoilWaterState {
  /** 0..100, position of the dot on the Sucho - Mokro bar */
  position: number;
  level: AlertLevel | 'wet';
  label: string;
}

// Bar: 0 = soil dried out (depletion = TAW), 50 = start of the "W normie" zone
// (depletion = RAW, stress threshold), 80 = no depletion.
const NORM_START = 50;
const NORM_END = 80;
const MIN_POSITION = 4;

export function soilWaterState(
  depletionMm: number | null,
  tawMm: number,
  rawMm: number,
): SoilWaterState {
  if (depletionMm === null) return { position: NORM_START, level: 'unknown', label: 'Brak oceny' };
  if (depletionMm <= 0) return { position: NORM_END, level: 'wet', label: 'Mokro' };
  if (depletionMm <= rawMm) {
    const position = NORM_START + (1 - depletionMm / rawMm) * (NORM_END - NORM_START);
    return { position, level: 'ok', label: 'W normie' };
  }
  const span = Math.max(tawMm - rawMm, 1);
  const position = Math.max(
    MIN_POSITION,
    NORM_START - ((depletionMm - rawMm) / span) * (NORM_START - MIN_POSITION),
  );
  const isVeryDry = depletionMm - rawMm >= span / 2;
  return {
    position,
    level: isVeryDry ? 'high' : 'medium',
    label: isVeryDry ? 'Bardzo sucho' : 'Za sucho',
  };
}
