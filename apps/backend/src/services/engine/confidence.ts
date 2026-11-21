// T-014 DM-006 Assessment confidence from available sources and penalties (ADR-007 section 10, ADR-008)
import type { DroughtClass, SoilMoistureAgreement } from './classify.js';

export type IndicatorKey =
  'meteo' | 'soil' | 'sentinel2' | 'soilMoisture' | 'terrain' | 'hydrology' | 'parcel';

export type NdmiAssessment = 'below' | 'normal' | 'above' | 'unknown';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type ConfidenceInput = {
  available: Record<IndicatorKey, boolean>;
  sceneAgeDays: number | null;
  ndmiAssessment: NdmiAssessment | null;
  soilMoistureAgreement: SoilMoistureAgreement | null;
  droughtClass: DroughtClass;
  areaHa: number;
  isOutOfSeason: boolean;
  usedMeteoFallback: boolean;
};

export type ConfidenceResult = {
  confidence: ConfidenceLevel;
  confidenceScore: number;
  confidenceReasons: string[];
  usedIndicators: string[];
  missingIndicators: string[];
};

// Weights from ADR-007 section 10 with ADR-008 (ERA5-Land soil moisture replaces EUMETSAT SSM).
const INDICATORS: { key: IndicatorKey; weight: number; label: string }[] = [
  { key: 'meteo', weight: 0.35, label: 'Pogoda (opad i parowanie)' },
  { key: 'soil', weight: 0.2, label: 'Gleba' },
  { key: 'sentinel2', weight: 0.15, label: 'Zdjęcia satelitarne roślinności' },
  { key: 'soilMoisture', weight: 0.1, label: 'Wilgotność gleby' },
  { key: 'terrain', weight: 0.1, label: 'Ukształtowanie terenu' },
  { key: 'hydrology', weight: 0.05, label: 'Rowy i cieki wodne' },
  { key: 'parcel', weight: 0.05, label: 'Dane działki' },
];

const OLD_SCENE_DAYS = 20;
const SMALL_PARCEL_HA = 0.5;
const HIGH_THRESHOLD = 0.8;
const MEDIUM_THRESHOLD = 0.55;

const PENALTY_OLD_SCENE = 0.05;
const PENALTY_NDMI = 0.1;
const PENALTY_SOIL_MOISTURE = 0.1;
const PENALTY_BOTH_SATELLITE = 0.05;
const PENALTY_SMALL_PARCEL = 0.05;
const PENALTY_OUT_OF_SEASON = 0.1;
const PENALTY_METEO_FALLBACK = 0.05;
const BONUS_BOTH_AGREE = 0.05;

function ndmiContradicts(ndmi: NdmiAssessment | null, droughtClass: DroughtClass): boolean {
  if (ndmi === null) return false;
  if (droughtClass === 'severe') return ndmi === 'normal' || ndmi === 'above';
  if (droughtClass === 'none') return ndmi === 'below';
  return false;
}

function ndmiConfirms(ndmi: NdmiAssessment | null, droughtClass: DroughtClass): boolean {
  if (ndmi === null) return false;
  if (droughtClass === 'severe' || droughtClass === 'moderate') return ndmi === 'below';
  if (droughtClass === 'none') return ndmi === 'normal' || ndmi === 'above';
  return false;
}

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const reasons: string[] = [];
  const used: string[] = [];
  const missing: string[] = [];
  let score = 0;

  for (const indicator of INDICATORS) {
    if (input.available[indicator.key]) {
      score += indicator.weight;
      used.push(indicator.label);
    } else {
      missing.push(indicator.label);
      reasons.push(`Brak danych: ${indicator.label.toLowerCase()}.`);
    }
  }

  const penalize = (amount: number, reason: string): void => {
    score -= amount;
    reasons.push(reason);
  };

  if (input.sceneAgeDays !== null && input.sceneAgeDays > OLD_SCENE_DAYS) {
    penalize(
      PENALTY_OLD_SCENE,
      `Zdjęcie satelitarne jest sprzed ${input.sceneAgeDays} dni, starsze niż ${OLD_SCENE_DAYS} dni.`,
    );
  }

  const ndmiBad = ndmiContradicts(input.ndmiAssessment, input.droughtClass);
  if (ndmiBad) {
    penalize(
      PENALTY_NDMI,
      'Wilgotność roślin ze zdjęcia satelitarnego nie zgadza się z bilansem wody.',
    );
  }
  const moistureBad = input.soilMoistureAgreement === 'contradicts';
  if (moistureBad) {
    penalize(PENALTY_SOIL_MOISTURE, 'Wilgotność gleby nie zgadza się z bilansem wody.');
  }
  if (ndmiBad && moistureBad) {
    penalize(PENALTY_BOTH_SATELLITE, 'Dane satelitarne nie potwierdzają bilansu');
  }

  if (input.areaHa < SMALL_PARCEL_HA) {
    penalize(
      PENALTY_SMALL_PARCEL,
      'Działka jest mała (poniżej 0,5 ha), a dane mają większą siatkę.',
    );
  }
  if (input.isOutOfSeason) {
    penalize(PENALTY_OUT_OF_SEASON, 'Ocena poza okresem wegetacji jest orientacyjna.');
  }
  if (input.usedMeteoFallback) {
    penalize(
      PENALTY_METEO_FALLBACK,
      'Pogoda pochodzi ze źródła zapasowego (mniej dokładna siatka).',
    );
  }

  if (
    ndmiConfirms(input.ndmiAssessment, input.droughtClass) &&
    input.soilMoistureAgreement === 'confirms'
  ) {
    score += BONUS_BOTH_AGREE;
    reasons.push('Zdjęcie satelitarne i wilgotność gleby potwierdzają wynik bilansu.');
  }

  const confidenceScore = Math.round(Math.min(1, Math.max(0, score)) * 100) / 100;
  const confidence: ConfidenceLevel =
    confidenceScore >= HIGH_THRESHOLD
      ? 'high'
      : confidenceScore >= MEDIUM_THRESHOLD
        ? 'medium'
        : 'low';

  return {
    confidence,
    confidenceScore,
    confidenceReasons: reasons,
    usedIndicators: used,
    missingIndicators: missing,
  };
}
