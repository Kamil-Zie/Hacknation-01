// T-012 DM-007 Soil engine: Saxton-Rawls 2006 pedotransfer, TAW/RAW, soil category

export type SoilLayer = {
  topCm: number;
  bottomCm: number;
  sandPct: number | null;
  clayPct: number | null;
  socPct: number | null;
};

export type SoilCategory = 'very_light' | 'light' | 'medium' | 'heavy';

export type SoilProfile = {
  sandPct: number;
  siltPct: number;
  clayPct: number;
  socPct: number;
  category: SoilCategory;
  categoryLabel: string;
};

export type SoilWaterCapacity = {
  soil: SoilProfile;
  tawMm: number;
  rawMm: number;
  fieldCapacity: number;
  wiltingPoint: number;
};

export type SoilWaterOutcome = { result: SoilWaterCapacity | null; reason: string | null };

export const MAX_ROOT_DEPTH_M = 1.0;
export const MIN_COVERAGE_FRACTION = 0.5;
const SOC_TO_OM = 1.724;
const MAX_OM_PCT = 8;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

// Saxton & Rawls 2006, Soil Sci. Soc. Am. J. 70:1569-1578, Eq. 1-2.
// sand, clay as fractions (0-1), om in % (organic matter). Returns volumetric water content.
export function saxtonRawls(
  sand: number,
  clay: number,
  omPct: number,
): { fieldCapacity: number; wiltingPoint: number } {
  const om = Math.min(omPct, MAX_OM_PCT);
  const wp1500t =
    -0.024 * sand +
    0.487 * clay +
    0.006 * om +
    0.005 * sand * om -
    0.013 * clay * om +
    0.068 * sand * clay +
    0.031;
  const wiltingPoint = wp1500t + (0.14 * wp1500t - 0.02);
  const fc33t =
    -0.251 * sand +
    0.195 * clay +
    0.011 * om +
    0.006 * sand * om -
    0.027 * clay * om +
    0.452 * sand * clay +
    0.299;
  const fieldCapacity = fc33t + (1.283 * fc33t * fc33t - 0.374 * fc33t - 0.015);
  return { fieldCapacity, wiltingPoint };
}

// ADR-007 section 4: approximation of agronomic soil categories by sand content.
export function soilCategory(sandPct: number): { category: SoilCategory; label: string } {
  if (sandPct >= 80) return { category: 'very_light', label: 'bardzo lekka' };
  if (sandPct >= 65) return { category: 'light', label: 'lekka' };
  if (sandPct >= 35) return { category: 'medium', label: 'średnia' };
  return { category: 'heavy', label: 'ciężka' };
}

export function computeSoilWater(
  layers: SoilLayer[],
  rootDepthM: number,
  depletionFraction: number,
): SoilWaterOutcome {
  const depthM = Math.min(rootDepthM, MAX_ROOT_DEPTH_M);
  let covered = 0;
  let tawMm = 0;
  let sand = 0;
  let clay = 0;
  let soc = 0;
  let fc = 0;
  let wp = 0;
  for (const layer of layers) {
    if (layer.sandPct === null || layer.clayPct === null || layer.socPct === null) continue;
    const top = Math.min(layer.topCm / 100, depthM);
    const bottom = Math.min(layer.bottomCm / 100, depthM);
    const thickness = bottom - top;
    if (thickness <= 0) continue;
    const om = layer.socPct * SOC_TO_OM;
    const theta = saxtonRawls(layer.sandPct / 100, layer.clayPct / 100, om);
    covered += thickness;
    tawMm += 1000 * (theta.fieldCapacity - theta.wiltingPoint) * thickness;
    sand += layer.sandPct * thickness;
    clay += layer.clayPct * thickness;
    soc += layer.socPct * thickness;
    fc += theta.fieldCapacity * thickness;
    wp += theta.wiltingPoint * thickness;
  }
  if (covered === 0 || covered < MIN_COVERAGE_FRACTION * depthM) {
    return {
      result: null,
      reason: `soil layers with data cover ${round1(covered * 100)} cm of ${round1(depthM * 100)} cm root zone`,
    };
  }
  const sandPct = sand / covered;
  const clayPct = clay / covered;
  const category = soilCategory(sandPct);
  return {
    result: {
      soil: {
        sandPct: round1(sandPct),
        siltPct: round1(100 - sandPct - clayPct),
        clayPct: round1(clayPct),
        socPct: round1(soc / covered),
        category: category.category,
        categoryLabel: category.label,
      },
      tawMm: round1(tawMm),
      rawMm: round1(depletionFraction * tawMm),
      fieldCapacity: round3(fc / covered),
      wiltingPoint: round3(wp / covered),
    },
    reason: null,
  };
}
