// T-015 DM-008 Causes engine: rule-based water deficit causes with evidence (ADR-007 §8)
import type { Evidence } from './classify.js';
import { getKcForDate, getStageForDate } from './crops.js';
import type { Crop } from './crops.js';
import { fmt } from './format.js';
import type { WaterBalanceWindow } from './kbw.js';
import type { VulnerabilitySoil } from './vulnerability.js';

export type CauseCode =
  | 'precip_deficit_heat'
  | 'low_soil_retention'
  | 'surface_runoff'
  | 'crop_water_demand'
  | 'low_vegetation_moisture';

export type CauseSeverity = 'low' | 'medium' | 'high';

export type Cause = {
  code: CauseCode;
  title: string;
  description: string;
  severity: CauseSeverity;
  evidence: Evidence[];
};

export type CausesTerrain = {
  slopePct: number;
  aspect: string | null;
  elevationDiffM: number | null;
};

export type CausesSatellite = {
  ndmi: number | null;
  ndmiAssessment: 'below' | 'normal' | 'above' | 'unknown';
  sceneDate: string;
  expected: { ndmiMin: number; ndmiMax: number };
};

export type CausesInput = {
  analysisDate: string;
  crop: Crop;
  kbw30: WaterBalanceWindow | null;
  kbw60: WaterBalanceWindow | null;
  soil: VulnerabilitySoil | null;
  tawMm: number | null;
  terrain: CausesTerrain | null;
  satellite: CausesSatellite | null;
};

// ADR-007 §8 conditions.
const PRECIP_PERCENTILE_MAX = 30;
const TMAX_EXCESS_C = 1;
const PRECIP_NORM_PCT_MAX = 70;
const TAW_LOW_MM = 100;
const SAND_HIGH_PCT = 65;
const SLOPE_MIN_PCT = 2;

// Severity thresholds (not defined by ADR-007, simple project assumptions):
// precip: high at percentile <= 10, medium <= 20, else low.
// soil: high at TAW < 60 mm or sand >= 80%, medium at TAW < 100 mm or sand >= 65%.
// runoff: high at slope >= 5%, medium >= 3%, else low.
// crop: medium when the stage is critical and ETc > precipitation, else low.
// vegetation: high when NDMI < expected min - 0.1, else medium.
const PRECIP_HIGH_PERCENTILE = 10;
const PRECIP_MEDIUM_PERCENTILE = 20;
const TAW_HIGH_MM = 60;
const SAND_VERY_HIGH_PCT = 80;
const SLOPE_HIGH_PCT = 5;
const SLOPE_MEDIUM_PCT = 3;
const NDMI_HIGH_MARGIN = 0.1;

const SOILGRIDS_VERSION = 'SoilGrids 2.0';
const ELEVATION_VERSION = 'Copernicus DEM';
const SEVERITY_ORDER: Record<CauseSeverity, number> = { high: 0, medium: 1, low: 2 };
const CODE_ORDER: CauseCode[] = [
  'precip_deficit_heat',
  'low_soil_retention',
  'surface_runoff',
  'crop_water_demand',
  'low_vegetation_moisture',
];

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function period(window: WaterBalanceWindow): string {
  return `${window.from}/${window.to}`;
}

function precipDeficitHeat(
  kbw30: WaterBalanceWindow | null,
  kbw60: WaterBalanceWindow | null,
): Cause | null {
  if (!kbw60 || kbw60.percentile > PRECIP_PERCENTILE_MAX) return null;
  const tmax = kbw30?.meanTmaxC ?? null;
  const tmaxNorm = kbw30?.normTmaxC ?? null;
  const hot = tmax !== null && tmaxNorm !== null && tmax > tmaxNorm + TMAX_EXCESS_C;
  const dry =
    kbw60.precipitationNormPct !== null && kbw60.precipitationNormPct < PRECIP_NORM_PCT_MAX;
  if (!hot && !dry) return null;

  const date60 = period(kbw60);
  const evidence: Evidence[] = [
    {
      label: 'Opad 60 dni',
      value: round(kbw60.precipitationMm),
      unit: 'mm',
      sourceId: 'meteo',
      dataDate: date60,
    },
  ];
  if (kbw60.precipitationNormPct !== null) {
    evidence.push({
      label: 'Opad 60 dni względem normy',
      value: round(kbw60.precipitationNormPct, 0),
      unit: '%',
      sourceId: 'meteo',
      dataDate: date60,
    });
  }
  if (kbw30 && tmax !== null && tmaxNorm !== null) {
    evidence.push({
      label: 'Średnia Tmax 30 dni',
      value: round(tmax),
      unit: '°C',
      sourceId: 'meteo',
      dataDate: period(kbw30),
      note: `norma ${fmt(tmaxNorm)} °C`,
    });
  }
  evidence.push({
    label: 'Ewapotranspiracja uprawy 60 dni (ETc)',
    value: round(kbw60.etcMm),
    unit: 'mm',
    sourceId: 'engine',
    dataDate: date60,
  });

  const severity: CauseSeverity =
    kbw60.percentile <= PRECIP_HIGH_PERCENTILE
      ? 'high'
      : kbw60.percentile <= PRECIP_MEDIUM_PERCENTILE
        ? 'medium'
        : 'low';
  const normPart =
    kbw60.precipitationNormPct !== null ? ` (${fmt(kbw60.precipitationNormPct, 0)}% normy)` : '';
  const heatPart =
    hot && tmax !== null && tmaxNorm !== null
      ? `, a średnia temperatura maksymalna ostatnich 30 dni wyniosła ${fmt(tmax)} °C przy normie ${fmt(tmaxNorm)} °C`
      : '';
  return {
    code: 'precip_deficit_heat',
    title: 'Deficyt opadów przy wysokiej temperaturze',
    description: `W ostatnich 60 dniach spadło ${fmt(kbw60.precipitationMm, 0)} mm deszczu${normPart}${heatPart}. Bilans wodny jest na poziomie ${fmt(kbw60.percentile, 0)}. percentyla z wielolecia.`,
    severity,
    evidence,
  } satisfies Cause;
}

function lowSoilRetention(soil: VulnerabilitySoil | null, tawMm: number | null): Cause | null {
  const lowTaw = tawMm !== null && tawMm < TAW_LOW_MM;
  const sandy = soil !== null && soil.sandPct >= SAND_HIGH_PCT;
  if (!lowTaw && !sandy) return null;

  const evidence: Evidence[] = [];
  if (soil) {
    evidence.push(
      {
        label: 'Udział piasku',
        value: round(soil.sandPct, 0),
        unit: '%',
        sourceId: 'soilgrids',
        dataDate: SOILGRIDS_VERSION,
      },
      {
        label: 'Węgiel organiczny (SOC)',
        value: round(soil.socPct, 2),
        unit: '%',
        sourceId: 'soilgrids',
        dataDate: SOILGRIDS_VERSION,
      },
    );
  }
  if (tawMm !== null) {
    evidence.push({
      label: 'Dostępna woda w strefie korzeni (TAW)',
      value: round(tawMm, 0),
      unit: 'mm',
      sourceId: 'engine',
      dataDate: SOILGRIDS_VERSION,
    });
  }

  const veryLow =
    (tawMm !== null && tawMm < TAW_HIGH_MM) ||
    (soil !== null && soil.sandPct >= SAND_VERY_HIGH_PCT);
  const severity: CauseSeverity = veryLow ? 'high' : 'medium';
  const parts: string[] = [];
  if (soil) parts.push(`Gleba ma ${fmt(soil.sandPct, 0)}% piasku`);
  if (tawMm !== null) {
    parts.push(
      `${parts.length ? 'i zatrzymuje' : 'Gleba zatrzymuje'} tylko ${fmt(tawMm, 0)} mm wody w strefie korzeni`,
    );
  }
  return {
    code: 'low_soil_retention',
    title: 'Niska retencja wody w glebie',
    description: `${parts.join(' ')}.`,
    severity,
    evidence,
  } satisfies Cause;
}

function surfaceRunoff(terrain: CausesTerrain | null): Cause | null {
  if (!terrain || terrain.slopePct < SLOPE_MIN_PCT) return null;
  const evidence: Evidence[] = [
    {
      label: 'Spadek terenu',
      value: round(terrain.slopePct),
      unit: '%',
      sourceId: 'elevation',
      dataDate: ELEVATION_VERSION,
    },
  ];
  if (terrain.aspect) {
    evidence.push({
      label: 'Kierunek spadku',
      value: terrain.aspect,
      unit: null,
      sourceId: 'elevation',
      dataDate: ELEVATION_VERSION,
    });
  }
  if (terrain.elevationDiffM !== null) {
    evidence.push({
      label: 'Różnica wysokości na działce',
      value: round(terrain.elevationDiffM),
      unit: 'm',
      sourceId: 'elevation',
      dataDate: ELEVATION_VERSION,
    });
  }
  const severity: CauseSeverity =
    terrain.slopePct >= SLOPE_HIGH_PCT
      ? 'high'
      : terrain.slopePct >= SLOPE_MEDIUM_PCT
        ? 'medium'
        : 'low';
  const aspectPart = terrain.aspect ? ` w kierunku: ${terrain.aspect}` : '';
  return {
    code: 'surface_runoff',
    title: 'Odpływ powierzchniowy ze spadku terenu',
    description: `Teren ma spadek ${fmt(terrain.slopePct)}%${aspectPart}, więc część wody z opadu spływa z pola zamiast wsiąkać.`,
    severity,
    evidence,
  } satisfies Cause;
}

function cropWaterDemand(input: CausesInput): Cause | null {
  const { crop, analysisDate, kbw30 } = input;
  const stage = getStageForDate(crop, analysisDate);
  const critical = stage?.isCritical === true;
  const etcExceeds = kbw30 !== null && kbw30.etcMm > kbw30.precipitationMm;
  if (!critical && !etcExceeds) return null;

  const kc = getKcForDate(crop, analysisDate);
  const evidence: Evidence[] = [
    {
      label: 'Współczynnik uprawy (Kc)',
      value: kc,
      unit: null,
      sourceId: 'engine',
      dataDate: analysisDate,
    },
  ];
  if (kbw30) {
    evidence.push({
      label: 'Ewapotranspiracja uprawy 30 dni (ETc)',
      value: round(kbw30.etcMm),
      unit: 'mm',
      sourceId: 'engine',
      dataDate: period(kbw30),
      note: `opad 30 dni: ${fmt(kbw30.precipitationMm)} mm`,
    });
  }
  evidence.push({
    label: 'Faza rozwojowa',
    value: stage ? stage.name : 'poza sezonem wegetacji',
    unit: null,
    sourceId: 'engine',
    dataDate: analysisDate,
    note: critical ? 'faza krytyczna dla wody' : null,
  });

  const severity: CauseSeverity = critical && etcExceeds ? 'medium' : 'low';
  const phasePart =
    critical && stage
      ? `Uprawa jest w fazie krytycznej (${stage.name})`
      : 'Uprawa zużywa dużo wody';
  const balancePart = kbw30
    ? `: w 30 dni potrzebowała ${fmt(kbw30.etcMm, 0)} mm, a spadło ${fmt(kbw30.precipitationMm, 0)} mm`
    : '';
  return {
    code: 'crop_water_demand',
    title: 'Wysokie wymagania wodne uprawy',
    description: `${phasePart}${balancePart}. Współczynnik Kc to ${fmt(kc, 2)}.`,
    severity,
    evidence,
  } satisfies Cause;
}

function lowVegetationMoisture(satellite: CausesSatellite | null): Cause | null {
  if (!satellite || satellite.ndmiAssessment !== 'below') return null;
  const { ndmi, sceneDate, expected } = satellite;
  const evidence: Evidence[] = [
    {
      label: 'NDMI (wilgotność roślin)',
      value: ndmi,
      unit: null,
      sourceId: 'sentinel2',
      dataDate: sceneDate,
    },
    {
      label: 'Data sceny satelitarnej',
      value: sceneDate,
      unit: null,
      sourceId: 'sentinel2',
      dataDate: sceneDate,
    },
    {
      label: 'Oczekiwany zakres NDMI',
      value: `${fmt(expected.ndmiMin, 2)} do ${fmt(expected.ndmiMax, 2)}`,
      unit: null,
      sourceId: 'sentinel2',
      dataDate: sceneDate,
    },
  ];
  const severity: CauseSeverity =
    ndmi !== null && ndmi < expected.ndmiMin - NDMI_HIGH_MARGIN ? 'high' : 'medium';
  const ndmiPart = ndmi !== null ? `NDMI wynosi ${fmt(ndmi, 2)}` : 'NDMI jest niski';
  return {
    code: 'low_vegetation_moisture',
    title: 'Niska wilgotność roślin na zdjęciu satelitarnym',
    description: `${ndmiPart} (scena z ${sceneDate}), poniżej oczekiwanego zakresu ${fmt(expected.ndmiMin, 2)} do ${fmt(expected.ndmiMax, 2)} dla tej uprawy i miesiąca.`,
    severity,
    evidence,
  } satisfies Cause;
}

export function computeCauses(input: CausesInput): Cause[] {
  const causes: Cause[] = [
    precipDeficitHeat(input.kbw30, input.kbw60),
    lowSoilRetention(input.soil, input.tawMm),
    surfaceRunoff(input.terrain),
    cropWaterDemand(input),
    lowVegetationMoisture(input.satellite),
  ].filter((cause): cause is Cause => cause !== null);

  return causes.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      CODE_ORDER.indexOf(a.code) - CODE_ORDER.indexOf(b.code),
  );
}
