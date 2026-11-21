// T-011 T-076 DM-004 Crop table tests: completeness, stage lookup, Kc over the new year
import { describe, expect, it } from 'vitest';

import { CROPS, OUT_OF_SEASON_KC, getCrop, getKcForDate, getStageForDate } from './crops.js';

const CATEGORIES = [
  'cereals',
  'oilseeds',
  'root',
  'maize',
  'legumes',
  'vegetables',
  'orchards',
  'grassland',
];

describe('CROPS', () => {
  it('has at least 20 crops with unique codes and a valid category', () => {
    expect(CROPS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(CROPS.map((c) => c.code)).size).toBe(CROPS.length);
    for (const crop of CROPS) expect(CATEGORIES).toContain(crop.category);
  });

  it('returns Kc mid in the critical stage of new crops', () => {
    expect(getKcForDate(getCrop('pea')!, '2026-06-15')).toBe(1.15);
    expect(getKcForDate(getCrop('carrot')!, '2026-07-20')).toBe(1.05);
    expect(getKcForDate(getCrop('apple')!, '2026-05-15')).toBe(1.2);
  });

  it('has complete fields for every crop', () => {
    for (const crop of CROPS) {
      expect(crop.kcMid).toBeGreaterThan(0);
      expect(crop.rootDepthM).toBeGreaterThan(0);
      expect(crop.depletionFraction).toBeGreaterThan(0);
      expect(crop.stages.some((s) => s.isCritical)).toBe(true);
      expect(crop.expectedIndices.map((i) => i.month)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      ]);
    }
  });
});

describe('getKcForDate / getStageForDate', () => {
  const wheat = getCrop('winter_wheat')!;

  it('uses Kc ini in the stage spanning the new year (January)', () => {
    expect(getStageForDate(wheat, '2026-01-15')?.code).toBe('autumn_dormancy');
    expect(getKcForDate(wheat, '2026-01-15')).toBe(wheat.kcIni);
  });

  it('uses Kc mid in a critical stage (June)', () => {
    expect(getStageForDate(wheat, '2026-06-10')?.code).toBe('heading_flowering');
    expect(getKcForDate(wheat, '2026-06-10')).toBe(1.15);
  });

  it('interpolates between Kc ini and mid before the critical stages', () => {
    const kc = getKcForDate(wheat, '2026-04-15');
    expect(kc).toBeGreaterThan(wheat.kcIni);
    expect(kc).toBeLessThan(wheat.kcMid);
  });

  it('returns out-of-season Kc outside all stages', () => {
    expect(getStageForDate(wheat, '2026-08-15')).toBeNull();
    expect(getKcForDate(wheat, '2026-08-15')).toBe(OUT_OF_SEASON_KC);
  });

  it('returns null for an unknown crop', () => {
    expect(getCrop('banana')).toBeNull();
  });
});
