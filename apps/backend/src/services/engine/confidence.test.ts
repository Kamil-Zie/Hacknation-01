// T-014 DM-006 Confidence score tests (ADR-007 section 10, ADR-008)
import { describe, expect, it } from 'vitest';

import { computeConfidence, type ConfidenceInput } from './confidence.js';

const base: ConfidenceInput = {
  available: {
    meteo: true,
    soil: true,
    sentinel2: true,
    soilMoisture: true,
    terrain: true,
    hydrology: true,
    parcel: true,
  },
  sceneAgeDays: 5,
  ndmiAssessment: null,
  soilMoistureAgreement: null,
  droughtClass: 'none',
  areaHa: 5,
  isOutOfSeason: false,
  usedMeteoFallback: false,
};

describe('computeConfidence', () => {
  it('gives 1.0 high with all sources and no penalties', () => {
    const result = computeConfidence(base);
    expect(result.confidenceScore).toBe(1);
    expect(result.confidence).toBe('high');
    expect(result.missingIndicators).toEqual([]);
    expect(result.usedIndicators).toHaveLength(7);
    expect(result.confidenceReasons).toEqual([]);
  });

  it('lowers the score and lists missing indicators without soil and satellite', () => {
    const result = computeConfidence({
      ...base,
      available: { ...base.available, soil: false, sentinel2: false },
      sceneAgeDays: null,
    });
    expect(result.confidenceScore).toBe(0.65);
    expect(result.confidence).toBe('medium');
    expect(result.missingIndicators).toEqual(['Gleba', 'Zdjęcia satelitarne roślinności']);
    expect(result.usedIndicators).not.toContain('Gleba');
    expect(result.confidenceReasons).toHaveLength(2);
  });

  it('penalizes an old scene', () => {
    const result = computeConfidence({ ...base, sceneAgeDays: 25 });
    expect(result.confidenceScore).toBe(0.95);
    expect(result.confidenceReasons).toHaveLength(1);
  });

  it('does not penalize a scene of exactly 20 days', () => {
    expect(computeConfidence({ ...base, sceneAgeDays: 20 }).confidenceScore).toBe(1);
  });

  it('penalizes NDMI contradicting severe drought', () => {
    const result = computeConfidence({ ...base, droughtClass: 'severe', ndmiAssessment: 'normal' });
    expect(result.confidenceScore).toBe(0.9);
  });

  it('penalizes NDMI below when there is no drought', () => {
    const result = computeConfidence({ ...base, ndmiAssessment: 'below' });
    expect(result.confidenceScore).toBe(0.9);
  });

  it('penalizes both contradicting satellite sources extra', () => {
    const result = computeConfidence({
      ...base,
      droughtClass: 'severe',
      ndmiAssessment: 'above',
      soilMoistureAgreement: 'contradicts',
    });
    expect(result.confidenceScore).toBe(0.75);
    expect(result.confidence).toBe('medium');
    expect(result.confidenceReasons).toContain('Dane satelitarne nie potwierdzają bilansu');
  });

  it('adds a bonus when both satellite sources agree, capped at 1', () => {
    const agree = computeConfidence({
      ...base,
      ndmiAssessment: 'normal',
      soilMoistureAgreement: 'confirms',
    });
    expect(agree.confidenceScore).toBe(1);
    const withPenalty = computeConfidence({
      ...base,
      sceneAgeDays: 30,
      ndmiAssessment: 'normal',
      soilMoistureAgreement: 'confirms',
    });
    expect(withPenalty.confidenceScore).toBe(1);
  });

  it('penalizes small parcel, out of season and meteo fallback', () => {
    expect(computeConfidence({ ...base, areaHa: 0.3 }).confidenceScore).toBe(0.95);
    expect(computeConfidence({ ...base, isOutOfSeason: true }).confidenceScore).toBe(0.9);
    expect(computeConfidence({ ...base, usedMeteoFallback: true }).confidenceScore).toBe(0.95);
    const all = computeConfidence({
      ...base,
      areaHa: 0.3,
      isOutOfSeason: true,
      usedMeteoFallback: true,
    });
    expect(all.confidenceScore).toBe(0.8);
    expect(all.confidenceReasons).toHaveLength(3);
  });

  it('applies high, medium and low thresholds', () => {
    const without = (...keys: (keyof ConfidenceInput['available'])[]) => {
      const available = { ...base.available };
      for (const key of keys) available[key] = false;
      return computeConfidence({ ...base, available });
    };
    const high = without('soil');
    expect([high.confidenceScore, high.confidence]).toEqual([0.8, 'high']);
    const medium = without('soil', 'sentinel2', 'hydrology', 'parcel');
    expect([medium.confidenceScore, medium.confidence]).toEqual([0.55, 'medium']);
    const low = without('soil', 'sentinel2', 'hydrology', 'parcel', 'soilMoisture');
    expect([low.confidenceScore, low.confidence]).toEqual([0.45, 'low']);
  });

  it('clamps the score at 0', () => {
    const result = computeConfidence({
      ...base,
      available: {
        meteo: false,
        soil: false,
        sentinel2: false,
        soilMoisture: false,
        terrain: false,
        hydrology: false,
        parcel: false,
      },
      isOutOfSeason: true,
    });
    expect(result.confidenceScore).toBe(0);
    expect(result.confidence).toBe('low');
  });
});
