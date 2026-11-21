// T-014 DM-006 Drought class from KBW 60 percentile and soil depletion (ADR-007 section 6, 5a)
import type { WaterBalanceWindow } from './kbw.js';

export type EvidenceSourceId =
  | 'uldk'
  | 'meteo'
  | 'sentinel2'
  | 'nasa_power'
  | 'era5land'
  | 'eumetsat'
  | 'soilgrids'
  | 'elevation'
  | 'overpass'
  | 'engine';

export type Evidence = {
  label: string;
  value: number | string | null;
  unit: string | null;
  sourceId: EvidenceSourceId;
  dataDate: string;
  note?: string | null;
};

export type DroughtClass = 'none' | 'moderate' | 'severe' | 'unknown';
export type SoilMoistureAssessment = 'dry' | 'normal' | 'wet' | 'unknown';
export type SoilMoistureAgreement = 'confirms' | 'contradicts' | 'neutral';

export type ClassifySoilWater = { depletionMm: number | null; rawMm: number };

export type ClassifyInput = {
  kbw60: WaterBalanceWindow | null;
  soilWater: ClassifySoilWater | null;
  analysisDate: string;
};

export type ClassifyResult = {
  droughtClass: DroughtClass;
  droughtClassLabel: string;
  isOutOfSeason: boolean;
  evidence: Evidence[];
};

// ADR-007 section 6 thresholds (percentile of KBW 60 against the 10-year reference).
const SEVERE_PERCENTILE = 10;
const SEVERE_WITH_DEPLETION_PERCENTILE = 30;
const MODERATE_PERCENTILE = 30;
// Coordinator decision 2026-11-21 14:20 (ADR-007 §6): Dr > RAW alone gives moderate only at percentile <= 50;
// above that it stays in evidence as current plant water stress and the class comes from the percentile.
const MODERATE_WITH_DEPLETION_PERCENTILE = 50;

const LABELS: Record<DroughtClass, string> = {
  none: 'Brak suszy',
  moderate: 'Susza umiarkowana',
  severe: 'Susza silna',
  unknown: 'Brak danych',
};

export function isOutOfSeasonDate(analysisDate: string): boolean {
  const month = Number(analysisDate.slice(5, 7));
  return month >= 11 || month <= 2;
}

export function classifyDrought(input: ClassifyInput): ClassifyResult {
  const { kbw60, soilWater, analysisDate } = input;
  const isOutOfSeason = isOutOfSeasonDate(analysisDate);
  if (!kbw60) {
    return {
      droughtClass: 'unknown',
      droughtClassLabel: LABELS.unknown,
      isOutOfSeason,
      evidence: [],
    };
  }

  const depletion = soilWater?.depletionMm ?? null;
  const depletionExceedsRaw =
    soilWater !== null && depletion !== null && depletion > soilWater.rawMm;
  const percentile = kbw60.percentile;

  let droughtClass: DroughtClass = 'none';
  if (
    percentile <= SEVERE_PERCENTILE ||
    (depletionExceedsRaw && percentile <= SEVERE_WITH_DEPLETION_PERCENTILE)
  ) {
    droughtClass = 'severe';
  } else if (
    percentile <= MODERATE_PERCENTILE ||
    (depletionExceedsRaw && percentile <= MODERATE_WITH_DEPLETION_PERCENTILE)
  ) {
    droughtClass = 'moderate';
  }

  const period = `${kbw60.from}–${kbw60.to}`;
  const evidence: Evidence[] = [
    { label: 'KBW 60 dni', value: kbw60.kbwMm, unit: 'mm', sourceId: 'engine', dataDate: period },
    {
      label: 'Percentyl KBW 60 dni',
      value: percentile,
      unit: 'percentyl',
      sourceId: 'engine',
      dataDate: period,
      note: 'Pozycja na tle tego samego okresu z 10 poprzednich lat',
    },
  ];
  if (soilWater && depletion !== null) {
    evidence.push({
      label: 'Deficyt wody w glebie (Dr) wobec progu RAW',
      value: depletion,
      unit: 'mm',
      sourceId: 'engine',
      dataDate: analysisDate,
      note:
        depletionExceedsRaw && droughtClass === 'none'
          ? `Próg RAW: ${soilWater.rawMm} mm; bieżący stres wodny rośliny, ale wynik na tle 10 lat jest typowy (percentyl ${percentile}), więc nie zmienia klasy`
          : `Próg RAW: ${soilWater.rawMm} mm`,
    });
  }

  return { droughtClass, droughtClassLabel: LABELS[droughtClass], isOutOfSeason, evidence };
}

// ADR-007 section 5a: soil moisture confirms or contradicts the class, never changes it.
export function soilMoistureAgreement(
  droughtClass: DroughtClass,
  assessment: SoilMoistureAssessment,
): SoilMoistureAgreement {
  if (assessment === 'unknown' || droughtClass === 'unknown') return 'neutral';
  if (droughtClass === 'none') return assessment === 'dry' ? 'contradicts' : 'confirms';
  return assessment === 'dry' ? 'confirms' : assessment === 'wet' ? 'contradicts' : 'neutral';
}
