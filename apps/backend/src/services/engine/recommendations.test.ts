// T-016 DM-009 Recommendations engine tests (ADR-007 §9)
import { describe, expect, it } from 'vitest';

import { getCrop } from './crops.js';
import { computeRecommendations } from './recommendations.js';
import type { RecommendationsInput } from './recommendations.js';

const wheat = getCrop('winter_wheat');
const maize = getCrop('maize');
if (!wheat || !maize) throw new Error('crop missing');

const CATEGORY_ORDER = ['retention_landscape', 'retention_soil', 'agrotechnics', 'irrigation'];

const base: RecommendationsInput = {
  analysisDate: '2024-06-10',
  crop: wheat,
  areaHa: 2.4,
  centroid: { lat: 51.1, lon: 17.0 },
  droughtClass: 'severe',
  vulnerability: {
    vulnerabilityClass: 'high',
    criticalMonths: [6, 7],
    criticalMonthsLabel: 'czerwiec–lipiec',
  },
  soil: {
    sandPct: 82,
    siltPct: 10,
    clayPct: 8,
    socPct: 0.9,
    category: 'very_light',
    categoryLabel: 'Gleba bardzo lekka',
  },
  tawMm: 48,
  rawMm: 52,
  depletionMm: 60,
  terrain: {
    slopePct: 3,
    aspect: 'S',
    elevationDiffM: 5,
    lowestPoint: { lat: 51.099, lon: 17.001 },
  },
  hydro: {
    nearestDitchDistanceM: 200,
    nearestDitchPoint: { lat: 51.098, lon: 17.002 },
    hasReservoirWithin1km: false,
  },
  etc7DayMeanMm: 5.2,
};

const sandy = base;

const clay: RecommendationsInput = {
  ...base,
  droughtClass: 'none',
  vulnerability: { vulnerabilityClass: 'low', criticalMonths: [], criticalMonthsLabel: null },
  soil: {
    sandPct: 25,
    siltPct: 35,
    clayPct: 40,
    socPct: 2.2,
    category: 'heavy',
    categoryLabel: 'Gleba ciężka',
  },
  tawMm: 150,
  rawMm: 52,
  depletionMm: 18,
  terrain: { slopePct: 0.5, aspect: null, elevationDiffM: 1, lowestPoint: null },
};

function ids(input: RecommendationsInput): string[] {
  return computeRecommendations(input).map((r) => r.ruleId);
}

describe('computeRecommendations', () => {
  it('sandy severe field gets all landscape, soil, agro rules and justified irrigation', () => {
    const recs = computeRecommendations(sandy);
    expect(recs.map((r) => r.ruleId)).toEqual([
      'R-LAND-01',
      'R-LAND-02',
      'R-LAND-03',
      'R-SOIL-01',
      'R-SOIL-02',
      'R-AGRO-01',
      'R-AGRO-02',
      'R-AGRO-03',
      'R-AGRO-04',
      'R-IRR-01',
    ]);
    const irr = recs.find((r) => r.ruleId === 'R-IRR-01');
    expect(irr?.irrigation).toEqual({
      isJustified: true,
      netDoseMm: 52,
      grossDoseMm: 69.3,
      doseM3PerHa: 693,
      window: 'najbliższe 3–5 dni, rano lub wieczorem',
      nextCheckInDays: 10,
    });
    expect(irr?.action).toContain('5 m³/dobę');
    expect(recs.find((r) => r.ruleId === 'R-LAND-02')?.where).toBe(
      'wzdłuż południowej granicy działki (w dół spadku)',
    );
    expect(recs.find((r) => r.ruleId === 'R-LAND-01')?.location).toEqual({
      lat: 51.098,
      lon: 17.002,
    });
  });

  it('keeps ADR category order, sequential order, evidence and numbers in why', () => {
    for (const input of [sandy, clay, { ...sandy, hydro: null }]) {
      const recs = computeRecommendations(input);
      const cats = recs.map((r) => CATEGORY_ORDER.indexOf(r.category));
      expect(cats).toEqual([...cats].sort((a, b) => a - b));
      expect(recs.map((r) => r.order)).toEqual(recs.map((_, i) => i + 1));
      for (const r of recs) {
        expect(r.evidence.length).toBeGreaterThanOrEqual(1);
        expect(r.why).toMatch(/\d/);
        expect(r.ruleId.length).toBeLessThanOrEqual(12);
        expect(r.irrigation === null).toBe(r.category !== 'irrigation');
      }
      expect(recs.filter((r) => r.category === 'irrigation')).toHaveLength(1);
    }
  });

  it('clay field with no drought gets a shorter set and unjustified irrigation with numbers', () => {
    const recs = computeRecommendations(clay);
    expect(recs.length).toBeLessThan(computeRecommendations(sandy).length);
    expect(recs.map((r) => r.ruleId)).toEqual(['R-IRR-01']);
    const irr = recs[0]!;
    expect(irr.irrigation).toEqual({
      isJustified: false,
      netDoseMm: null,
      grossDoseMm: null,
      doseM3PerHa: null,
      window: null,
      nextCheckInDays: null,
    });
    expect(irr.why).toContain('deficyt glebowy 18 mm < próg 52 mm');
    expect(irr.action).toContain('zgody wodnoprawnej');
  });

  it('without hydro skips R-LAND-01 and R-LAND-03 only', () => {
    const withHydro = ids(sandy);
    const without = ids({ ...sandy, hydro: null });
    expect(without).not.toContain('R-LAND-01');
    expect(without).not.toContain('R-LAND-03');
    expect(without).toEqual(withHydro.filter((id) => id !== 'R-LAND-01' && id !== 'R-LAND-03'));
  });

  it('returns an empty list when drought class and vulnerability are both unknown', () => {
    expect(
      computeRecommendations({
        ...sandy,
        droughtClass: 'unknown',
        vulnerability: {
          vulnerabilityClass: 'unknown',
          criticalMonths: [],
          criticalMonthsLabel: null,
        },
      }),
    ).toEqual([]);
  });

  it('computes the irrigation dose from Dr 60 and RAW 52', () => {
    const irr = computeRecommendations(sandy).find((r) => r.ruleId === 'R-IRR-01');
    expect(irr?.irrigation?.netDoseMm).toBe(52);
    expect(irr?.irrigation?.grossDoseMm).toBe(69.3);
    expect(irr?.irrigation?.doseM3PerHa).toBe(693);
    expect(irr?.why).toContain('60 mm');
  });

  it('marks irrigation unjustified when Dr is below RAW', () => {
    const irr = computeRecommendations({ ...sandy, depletionMm: 40 }).find(
      (r) => r.ruleId === 'R-IRR-01',
    );
    expect(irr?.irrigation?.isJustified).toBe(false);
  });

  it('marks irrigation unjustified outside the critical stage or season', () => {
    const early = computeRecommendations({ ...sandy, analysisDate: '2024-03-01' }).find(
      (r) => r.ruleId === 'R-IRR-01',
    );
    expect(early?.irrigation?.isJustified).toBe(false);
    expect(early?.why).toContain('IV–IX');
    const maizeJune = computeRecommendations({ ...sandy, crop: maize }).find(
      (r) => r.ruleId === 'R-IRR-01',
    );
    expect(maizeJune?.irrigation?.isJustified).toBe(false);
    expect(maizeJune?.why).toContain('nie jest krytyczna');
  });

  it('reports missing soil data for irrigation instead of a dose', () => {
    const irr = computeRecommendations({ ...sandy, depletionMm: null, rawMm: null }).find(
      (r) => r.ruleId === 'R-IRR-01',
    );
    expect(irr?.irrigation?.isJustified).toBe(false);
    expect(irr?.irrigation?.netDoseMm).toBeNull();
    expect(irr?.why).toContain('Brak danych');
  });

  it('skips data-dependent rules when their data is null', () => {
    const recs = ids({ ...sandy, terrain: null, soil: null, tawMm: null });
    expect(recs).not.toContain('R-LAND-02');
    expect(recs).not.toContain('R-LAND-03');
    expect(recs).not.toContain('R-AGRO-02');
    expect(recs).not.toContain('R-AGRO-03');
    expect(recs).not.toContain('R-SOIL-01');
  });

  it('applies thresholds: ditch beyond 300 m, small area, maize is not harvested in summer', () => {
    const recs = ids({
      ...sandy,
      crop: maize,
      areaHa: 0.6,
      hydro: { nearestDitchDistanceM: 350, nearestDitchPoint: null, hasReservoirWithin1km: false },
    });
    expect(recs).not.toContain('R-LAND-01');
    expect(recs).not.toContain('R-LAND-03');
    expect(recs).not.toContain('R-SOIL-02');
    const withReservoir = ids({
      ...sandy,
      hydro: { nearestDitchDistanceM: null, nearestDitchPoint: null, hasReservoirWithin1km: true },
    });
    expect(withReservoir).not.toContain('R-LAND-01');
    expect(withReservoir).not.toContain('R-LAND-03');
  });
});
