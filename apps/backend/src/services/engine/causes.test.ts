// T-015 DM-008 Causes engine tests (ADR-007 §8)
import { describe, expect, it } from 'vitest';

import { computeCauses } from './causes.js';
import type { CausesInput } from './causes.js';
import { getCrop } from './crops.js';
import type { WaterBalanceWindow } from './kbw.js';

function window(days: number, overrides: Partial<WaterBalanceWindow>): WaterBalanceWindow {
  return {
    days,
    from: days === 30 ? '2024-06-16' : '2024-05-17',
    to: '2024-07-15',
    precipitationMm: 40,
    et0Mm: 120,
    etcMm: 100,
    kbwMm: -60,
    normKbwMm: -30,
    anomalyMm: -30,
    percentile: 50,
    precipitationNormPct: 100,
    meanTmaxC: 24,
    normTmaxC: 24,
    ...overrides,
  };
}

const wheat = getCrop('winter_wheat');
if (!wheat) throw new Error('winter_wheat missing');

const empty: CausesInput = {
  analysisDate: '2024-07-15',
  crop: wheat,
  kbw30: null,
  kbw60: null,
  soil: null,
  tawMm: null,
  terrain: null,
  satellite: null,
};

const sandySoil = {
  sandPct: 82,
  siltPct: 10,
  clayPct: 8,
  socPct: 0.9,
  category: 'very_light' as const,
  categoryLabel: 'Gleba bardzo lekka',
};

const sandyDry: CausesInput = {
  ...empty,
  kbw30: window(30, { precipitationMm: 30, etcMm: 90, meanTmaxC: 28, normTmaxC: 25 }),
  kbw60: window(60, { percentile: 8, precipitationMm: 44, precipitationNormPct: 55 }),
  soil: sandySoil,
  tawMm: 48,
};

describe('computeCauses', () => {
  it('returns precip and soil causes with numeric evidence, sorted by severity', () => {
    const causes = computeCauses(sandyDry);
    const codes = causes.map((c) => c.code);
    expect(codes.slice(0, 2)).toEqual(['precip_deficit_heat', 'low_soil_retention']);
    expect(
      causes.every((c) => c.severity === 'high' || c.severity === 'medium' || c.severity === 'low'),
    ).toBe(true);
    const order = { high: 0, medium: 1, low: 2 };
    for (let i = 1; i < causes.length; i += 1) {
      expect(order[causes[i]!.severity]).toBeGreaterThanOrEqual(order[causes[i - 1]!.severity]);
    }
    const soil = causes.find((c) => c.code === 'low_soil_retention');
    expect(soil?.severity).toBe('high');
    expect(soil?.evidence.map((e) => e.value)).toEqual(expect.arrayContaining([82, 48]));
    expect(soil?.description).toContain('82% piasku');
    expect(soil?.description).toContain('48 mm');
    const precip = causes.find((c) => c.code === 'precip_deficit_heat');
    expect(precip?.severity).toBe('high');
    expect(precip?.evidence.map((e) => e.value)).toEqual(expect.arrayContaining([44, 55, 28]));
    expect(causes.every((c) => c.evidence.length >= 1)).toBe(true);
  });

  it('omits surface_runoff without terrain', () => {
    expect(computeCauses(sandyDry).some((c) => c.code === 'surface_runoff')).toBe(false);
  });

  it('omits low_vegetation_moisture without satellite', () => {
    expect(computeCauses(sandyDry).some((c) => c.code === 'low_vegetation_moisture')).toBe(false);
  });

  it('returns surface_runoff medium for slope 4%', () => {
    const causes = computeCauses({
      ...empty,
      terrain: { slopePct: 4, aspect: 'południe', elevationDiffM: 6 },
    });
    const runoff = causes.find((c) => c.code === 'surface_runoff');
    expect(runoff?.severity).toBe('medium');
    expect(runoff?.evidence.map((e) => e.sourceId)).toEqual([
      'elevation',
      'elevation',
      'elevation',
    ]);
  });

  it('returns low_vegetation_moisture high when NDMI is far below range', () => {
    const causes = computeCauses({
      ...empty,
      satellite: {
        ndmi: 0.02,
        ndmiAssessment: 'below',
        sceneDate: '2024-07-10',
        expected: { ndmiMin: 0.16, ndmiMax: 0.4 },
      },
    });
    const veg = causes.find((c) => c.code === 'low_vegetation_moisture');
    expect(veg?.severity).toBe('high');
    expect(veg?.evidence[0]?.dataDate).toBe('2024-07-10');
  });

  it('returns crop_water_demand for a critical stage (winter wheat in June)', () => {
    const causes = computeCauses({ ...empty, analysisDate: '2024-06-10' });
    expect(causes.map((c) => c.code)).toEqual(['crop_water_demand']);
    expect(causes[0]?.severity).toBe('low');
  });

  it('returns nothing and does not throw with only the crop outside critical stage', () => {
    expect(computeCauses(empty)).toEqual([]);
  });
});
