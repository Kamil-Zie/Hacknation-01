// T-017 API-004 DM-006 DM-007 DM-008 DM-009 Engine composition (ADR-009): NASA POWER series gives percentile, anomaly, class, vulnerability; the current series gives current values and soil moisture
import { classifyDrought, soilMoistureAgreement } from '@/services/engine/classify';
import type {
  DroughtClass,
  Evidence,
  SoilMoistureAgreement,
  ClassifyResult,
} from '@/services/engine/classify';
import { computeCauses } from '@/services/engine/causes';
import type { Cause } from '@/services/engine/causes';
import { computeConfidence } from '@/services/engine/confidence';
import type { ConfidenceLevel, IndicatorKey } from '@/services/engine/confidence';
import { getKcForDate, getStageForDate } from '@/services/engine/crops';
import type { Crop } from '@/services/engine/crops';
import { fmt } from '@/services/engine/format';
import { addDays, computeCurrentWindow, computeKbwWindows } from '@/services/engine/kbw';
import type { CurrentWindow, DailyWeather, WaterBalanceWindow } from '@/services/engine/kbw';
import { computeRecommendations } from '@/services/engine/recommendations';
import type { Recommendation } from '@/services/engine/recommendations';
import { computeSoilWater } from '@/services/engine/soil';
import type { SoilLayer, SoilWaterCapacity } from '@/services/engine/soil';
import { computeVulnerability } from '@/services/engine/vulnerability';
import type { VulnerabilityResult } from '@/services/engine/vulnerability';
import { computeSoilWaterBalance } from '@/services/engine/water-demand';
import type { SoilWaterBalance } from '@/services/engine/water-demand';
import { computeEra5LandSoilMoisture } from '@/services/sources/era5land';
import type { Era5LandSoilMoisture } from '@/services/sources/era5land';
import type { MeteoDay, MeteoOutcome } from '@/services/sources/meteo.source';
import { computeSoilMoisture, round1 } from '@/services/sources/nasaPower.source';
import type { SoilMoisture } from '@/services/sources/nasaPower.source';
import type { ParcelData } from '@/services/sources/uldk.source';

const ETC_MEAN_DAYS = 7;
const NO_CLIMATOLOGY_PENALTY = 0.1;
// Same thresholds as engine/confidence.ts (private there); used only for the extra penalty below.
const HIGH_THRESHOLD = 0.8;
const MEDIUM_THRESHOLD = 0.55;
const MODERATE_LABEL = 'Susza umiarkowana';
const OUT_OF_SEASON_NOTE = 'poza okresem wegetacji, ocena orientacyjna';

export type SoilMoistureDto = Omit<Era5LandSoilMoisture, 'fallback'> & {
  fallback: boolean;
  agreement: SoilMoistureAgreement;
};

export type AssessmentDto = {
  droughtClass: DroughtClass;
  droughtClassLabel: string;
  isOutOfSeason: boolean;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  confidenceReasons: string[];
  summary: string;
  kbw30: WaterBalanceWindow | null;
  kbw60: WaterBalanceWindow | null;
  soilWater: SoilWaterBalance | null;
  cropStage: { code: string; name: string; kc: number; isCritical: boolean };
  satellite: null;
  soilMoistureSatellite: SoilMoistureDto | null;
  evidence: Evidence[];
};

export type EngineInput = {
  crop: Crop;
  analysisDate: string;
  parcel: ParcelData;
  meteo: MeteoOutcome;
  soilLayers: SoilLayer[] | null;
  // Indicators decided by the source statuses (the rest is derived from the engine results).
  available: Pick<Record<IndicatorKey, boolean>, 'sentinel2' | 'terrain' | 'hydrology'>;
};

export type EngineFlags = {
  hasCurrent: boolean;
  hasClimatology: boolean;
  isClimatologyIncomplete: boolean; // NASA series present but too short for the percentile
  usedMeteoFallback: boolean;
  hasSoilMoisture: boolean;
  isSoilMoistureFromEra5: boolean;
};

export type EngineOutput = {
  assessment: AssessmentDto;
  vulnerability: Omit<VulnerabilityResult, 'gaps'>;
  causes: Cause[];
  recommendations: Recommendation[];
  flags: EngineFlags;
};

export function computeEngine(input: EngineInput): EngineOutput {
  const { crop, analysisDate, parcel, meteo } = input;
  const kc = (date: string): number => getKcForDate(crop, date);
  const current = meteo.current;
  const isFallback = current.source === 'nasa_power';
  const climatology: DailyWeather[] | null = meteo.climatology?.series ?? null;

  const capacity = computeCapacity(input.soilLayers, crop);

  // (a) NASA POWER series: percentile, norm, anomaly and vulnerability.
  const nasaKbw = climatology ? computeKbwWindows(climatology, analysisDate, kc) : null;
  const vulnerability = computeVulnerability(
    climatology ?? [],
    analysisDate,
    kc,
    capacity?.rawMm ?? null,
    capacity?.soil ?? null,
  );

  // (b) current series: current values of the 30 and 60 day windows.
  const cur30 = computeCurrentWindow(current.series, analysisDate, 30, kc);
  const cur60 = computeCurrentWindow(current.series, analysisDate, 60, kc);
  const kbw30 = composeWindow(nasaKbw?.kbw30 ?? null, cur30, isFallback);
  const kbw60 = composeWindow(nasaKbw?.kbw60 ?? null, cur60, isFallback);

  const balanceSeries = mergeSeries(climatology ?? [], current.series);
  const { soilWater } = computeSoilWaterBalance(
    balanceSeries,
    analysisDate,
    kc,
    capacity?.tawMm ?? null,
    capacity?.rawMm ?? null,
  );

  const classified = classifyWithFallback(
    classifyDrought({ kbw60, soilWater, analysisDate }),
    kbw60,
    soilWater,
    analysisDate,
  );

  const sm = computeMoisture(meteo, capacity, analysisDate);
  const agreement = soilMoistureAgreement(classified.droughtClass, sm?.assessment ?? 'unknown');
  const soilMoisture: SoilMoistureDto | null = sm ? { ...sm, agreement } : null;

  const hasClimatology = climatology !== null;
  const usedMeteoFallback = isFallback && current.source !== null;
  const confidence = computeConfidence({
    available: {
      ...input.available,
      meteo: current.source !== null,
      soil: capacity !== null,
      soilMoisture: soilMoisture !== null,
      parcel: true,
    },
    sceneAgeDays: null,
    ndmiAssessment: null,
    soilMoistureAgreement: soilMoisture ? agreement : null,
    droughtClass: classified.droughtClass,
    areaHa: parcel.areaHa,
    isOutOfSeason: classified.isOutOfSeason,
    usedMeteoFallback,
  });
  const lowered = hasClimatology
    ? confidence
    : lowerConfidence(confidence.confidenceScore, confidence.confidenceReasons);

  const stage = getStageForDate(crop, analysisDate);
  const cropStage = {
    code: stage?.code ?? 'out_of_season',
    name: stage?.name ?? 'Poza okresem wegetacji',
    kc: kc(analysisDate),
    isCritical: stage?.isCritical ?? false,
  };

  const evidenceSource = isFallback ? 'nasa_power' : 'meteo';
  const evidence: Evidence[] = [
    ...classified.evidence,
    ...windowEvidence('KBW 30 dni', cur30 ?? kbw30, evidenceSource),
    ...(kbw60 ? [] : windowEvidence('KBW 60 dni (bieżący)', cur60, evidenceSource)),
    ...moistureEvidence(soilMoisture),
  ];

  const causes = computeCauses({
    analysisDate,
    crop,
    kbw30,
    kbw60,
    soil: capacity?.soil ?? null,
    tawMm: capacity?.tawMm ?? null,
    terrain: null,
    satellite: null,
  });
  const recommendations = computeRecommendations({
    analysisDate,
    crop,
    areaHa: parcel.areaHa,
    centroid: parcel.centroid,
    droughtClass: classified.droughtClass,
    vulnerability,
    soil: capacity?.soil ?? null,
    tawMm: capacity?.tawMm ?? null,
    rawMm: capacity?.rawMm ?? null,
    depletionMm: soilWater?.depletionMm ?? null,
    terrain: null,
    hydro: null,
    etc7DayMeanMm: etcMean(current.series, analysisDate, kc),
  });

  // DM-007 has no `gaps` field (internal engine diagnostics).
  const vulnerabilityDto: Omit<VulnerabilityResult, 'gaps'> & { gaps?: string[] } = {
    ...vulnerability,
  };
  delete vulnerabilityDto.gaps;
  return {
    assessment: {
      droughtClass: classified.droughtClass,
      droughtClassLabel: classified.droughtClassLabel,
      isOutOfSeason: classified.isOutOfSeason,
      confidence: lowered.confidence,
      confidenceScore: lowered.confidenceScore,
      confidenceReasons: lowered.confidenceReasons,
      summary: buildSummary(classified, kbw60, cur60, crop.name),
      kbw30,
      kbw60,
      soilWater,
      cropStage,
      satellite: null,
      soilMoistureSatellite: soilMoisture,
      evidence,
    },
    vulnerability: vulnerabilityDto,
    causes,
    recommendations,
    flags: {
      hasCurrent: current.source !== null,
      hasClimatology,
      isClimatologyIncomplete: hasClimatology && nasaKbw?.kbw60 === null,
      usedMeteoFallback,
      hasSoilMoisture: soilMoisture !== null,
      isSoilMoistureFromEra5: soilMoisture !== null && !soilMoisture.fallback,
    },
  };
}

function computeCapacity(layers: SoilLayer[] | null, crop: Crop): SoilWaterCapacity | null {
  if (!layers) return null;
  return computeSoilWater(layers, crop.rootDepthM, crop.depletionFraction).result;
}

// ADR-009 point 3: current values from the current series, norm, anomaly, percentile and
// norms from NASA POWER (anomalyMm stays NASA minus NASA norm, one source on both sides).
function composeWindow(
  nasa: WaterBalanceWindow | null,
  current: CurrentWindow | null,
  isFallback: boolean,
): WaterBalanceWindow | null {
  if (!nasa) return null;
  if (!current || isFallback) return nasa;
  return {
    ...nasa,
    precipitationMm: current.precipitationMm,
    et0Mm: current.et0Mm,
    etcMm: current.etcMm,
    kbwMm: current.kbwMm,
    meanTmaxC: current.meanTmaxC ?? nasa.meanTmaxC,
  };
}

// Current days override NASA days of the same date, so the March 1 bucket start is covered.
function mergeSeries(climatology: DailyWeather[], current: MeteoDay[]): DailyWeather[] {
  const byDate = new Map<string, DailyWeather>();
  for (const day of climatology) byDate.set(day.date, day);
  for (const day of current) byDate.set(day.date, day);
  return [...byDate.values()];
}

// Without the percentile the class is unknown, unless the soil bucket alone shows stress (Dr > RAW).
function classifyWithFallback(
  classified: ClassifyResult,
  kbw60: WaterBalanceWindow | null,
  soilWater: SoilWaterBalance | null,
  analysisDate: string,
): ClassifyResult {
  const depletion = soilWater?.depletionMm ?? null;
  if (kbw60 || !soilWater || depletion === null || depletion <= soilWater.rawMm) return classified;
  return {
    ...classified,
    droughtClass: 'moderate',
    droughtClassLabel: MODERATE_LABEL,
    evidence: [
      {
        label: 'Deficyt wody w glebie (Dr) wobec progu RAW',
        value: depletion,
        unit: 'mm',
        sourceId: 'engine',
        dataDate: analysisDate,
        note: `Próg RAW: ${soilWater.rawMm} mm; brak wieloletnich danych do percentyla`,
      },
    ],
  };
}

// Soil moisture: ERA5-Land from the current series (percentile etc. from NASA, ADR-009),
// otherwise NASA POWER as the fallback (DM-015 fallback = true).
function computeMoisture(
  meteo: MeteoOutcome,
  capacity: SoilWaterCapacity | null,
  analysisDate: string,
): (Omit<Era5LandSoilMoisture, 'fallback'> & { fallback: boolean }) | null {
  const nasa: SoilMoisture | null = meteo.nasaSeries
    ? computeSoilMoisture(meteo.nasaSeries, analysisDate)
    : null;
  if (meteo.current.source === 'open-meteo') {
    const era = computeEra5LandSoilMoisture(
      meteo.current.series,
      analysisDate,
      capacity?.fieldCapacity ?? null,
      capacity?.wiltingPoint ?? null,
      nasa,
    );
    if (era.soilMoisture) return era.soilMoisture;
  }
  if (!nasa) return null;
  return {
    ...nasa,
    theta0to7M3: null,
    theta7to28M3: null,
    theta28to100M3: null,
    thetaFcM3: null,
    thetaWpM3: null,
    fallback: true,
  };
}

function lowerConfidence(score: number, reasons: string[]) {
  const confidenceScore = Math.round(Math.max(0, score - NO_CLIMATOLOGY_PENALTY) * 100) / 100;
  const confidence: ConfidenceLevel =
    confidenceScore >= HIGH_THRESHOLD
      ? 'high'
      : confidenceScore >= MEDIUM_THRESHOLD
        ? 'medium'
        : 'low';
  return {
    confidence,
    confidenceScore,
    confidenceReasons: [
      ...reasons,
      'Brak wieloletniej klimatologii z NASA POWER: nie oceniono percentyla i podatności (−0,1).',
    ],
  };
}

function windowEvidence(
  label: string,
  window: Pick<CurrentWindow, 'from' | 'to' | 'precipitationMm' | 'etcMm' | 'kbwMm'> | null,
  sourceId: 'meteo' | 'nasa_power',
): Evidence[] {
  if (!window) return [];
  return [
    {
      label,
      value: window.kbwMm,
      unit: 'mm',
      sourceId,
      dataDate: `${window.from}–${window.to}`,
      note: `opad ${fmt(window.precipitationMm)} mm minus ETc ${fmt(window.etcMm)} mm`,
    },
  ];
}

function moistureEvidence(sm: SoilMoistureDto | null): Evidence[] {
  if (!sm) return [];
  const sourceId = sm.fallback ? 'nasa_power' : 'era5land';
  const dataDate = sm.observedAt.slice(0, 10);
  const items: Evidence[] = [];
  if (sm.rootZonePct !== null) {
    items.push({
      label: 'Wilgotność gleby, strefa korzeniowa',
      value: sm.rootZonePct,
      unit: '%',
      sourceId,
      dataDate,
      note: `średnia 7 dni; ${sm.product}; wartość dla okolicy działki`,
    });
  }
  if (sm.valuePct !== null) {
    items.push({
      label: 'Wilgotność gleby, warstwa powierzchniowa',
      value: sm.valuePct,
      unit: '%',
      sourceId,
      dataDate,
      note: 'średnia 7 dni; warstwa powierzchniowa',
    });
  }
  return items;
}

function etcMean(series: MeteoDay[], analysisDate: string, kc: (date: string) => number) {
  const byDate = new Map(series.map((day) => [day.date, day]));
  const values: number[] = [];
  for (let i = 0; i < ETC_MEAN_DAYS; i += 1) {
    const date = addDays(analysisDate, -i);
    const et0 = byDate.get(date)?.et0Mm;
    if (et0 !== null && et0 !== undefined) values.push(et0 * kc(date));
  }
  return values.length > 0 ? round1(values.reduce((a, b) => a + b, 0) / values.length) : null;
}

// One Polish sentence with numbers; the out-of-season note is appended inside the sentence.
function buildSummary(
  classified: ClassifyResult,
  kbw60: WaterBalanceWindow | null,
  cur60: CurrentWindow | null,
  cropName: string,
): string {
  const note = classified.isOutOfSeason ? ` (${OUT_OF_SEASON_NOTE})` : '';
  const lead = `W ostatnich 60 dniach klimatyczny bilans wodny uprawy (${cropName.toLowerCase()}) wynosi`;
  if (kbw60) {
    const { percentile } = kbw60;
    const position =
      percentile <= 50
        ? `gorszy niż w ${100 - percentile}% porównywalnych okresów z 10 lat`
        : `lepszy niż w ${percentile}% porównywalnych okresów z 10 lat`;
    return `${lead} ${fmt(kbw60.kbwMm)} mm, czyli jest ${position} (percentyl ${percentile}) – ocena: ${classified.droughtClassLabel.toLowerCase()}${note}.`;
  }
  if (cur60) {
    return `${lead} ${fmt(cur60.kbwMm)} mm, ale bez danych wieloletnich nie oceniono, jak to wypada na tle 10 lat${note}.`;
  }
  return `Nie udało się policzyć klimatycznego bilansu wodnego, bo brakuje danych pogodowych${note}.`;
}
