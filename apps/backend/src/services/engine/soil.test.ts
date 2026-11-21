// T-012 DM-007 Soil engine tests: Saxton-Rawls reference values, TAW/RAW, missing data
import { describe, expect, it } from 'vitest';

import { computeSoilWater, saxtonRawls, soilCategory, type SoilLayer } from './soil.js';

const DEPTHS: [number, number][] = [
  [0, 5],
  [5, 15],
  [15, 30],
  [30, 60],
  [60, 100],
];

function uniformLayers(sand: number | null, clay: number | null, soc: number | null): SoilLayer[] {
  return DEPTHS.map(([topCm, bottomCm]) => ({
    topCm,
    bottomCm,
    sandPct: sand,
    clayPct: clay,
    socPct: soc,
  }));
}

describe('saxtonRawls', () => {
  it('matches the ADR reference for sand 85% / clay 5% / OM 1%', () => {
    const { fieldCapacity, wiltingPoint } = saxtonRawls(0.85, 0.05, 1);
    expect(fieldCapacity).toBeCloseTo(0.087, 2);
    expect(wiltingPoint).toBeCloseTo(0.034, 2);
  });

  it('gives plausible values for clay loam (S 30 / C 30 / OM 2.5)', () => {
    const { fieldCapacity, wiltingPoint } = saxtonRawls(0.3, 0.3, 2.5);
    expect(fieldCapacity).toBeGreaterThan(0.3);
    expect(fieldCapacity).toBeLessThan(0.36);
    expect(wiltingPoint).toBeGreaterThan(0.15);
    expect(wiltingPoint).toBeLessThan(0.2);
  });

  it('gives plausible values for silt loam (S 10 / C 15 / OM 2)', () => {
    const { fieldCapacity, wiltingPoint } = saxtonRawls(0.1, 0.15, 2);
    expect(fieldCapacity).toBeGreaterThan(0.28);
    expect(fieldCapacity).toBeLessThan(0.36);
    expect(wiltingPoint).toBeGreaterThan(0.08);
    expect(wiltingPoint).toBeLessThan(0.14);
  });
});

describe('soilCategory', () => {
  it('maps sand content to categories', () => {
    expect(soilCategory(85).category).toBe('very_light');
    expect(soilCategory(80).category).toBe('very_light');
    expect(soilCategory(70)).toEqual({ category: 'light', label: 'lekka' });
    expect(soilCategory(50).category).toBe('medium');
    expect(soilCategory(20)).toEqual({ category: 'heavy', label: 'ciężka' });
  });
});

describe('computeSoilWater', () => {
  it('computes TAW for the sand reference over 1 m (SOC 0.58% = OM 1%)', () => {
    const { result, reason } = computeSoilWater(uniformLayers(85, 5, 0.58), 1.0, 0.5);
    expect(reason).toBeNull();
    expect(result).not.toBeNull();
    expect(result!.fieldCapacity).toBeCloseTo(0.087, 2);
    expect(result!.wiltingPoint).toBeCloseTo(0.034, 2);
    expect(Math.abs(result!.tawMm - 53)).toBeLessThanOrEqual(3);
    expect(result!.rawMm).toBeCloseTo(result!.tawMm * 0.5, 0);
    expect(result!.soil).toEqual({
      sandPct: 85,
      siltPct: 10,
      clayPct: 5,
      socPct: 0.6,
      category: 'very_light',
      categoryLabel: 'bardzo lekka',
    });
  });

  it('scales TAW with root depth and caps it at 1 m', () => {
    const layers = uniformLayers(30, 30, 1.5);
    const half = computeSoilWater(layers, 0.5, 0.55).result!;
    const full = computeSoilWater(layers, 1.0, 0.55).result!;
    const deep = computeSoilWater(layers, 1.2, 0.55).result!;
    expect(full.tawMm).toBeGreaterThan(half.tawMm);
    expect(half.tawMm / full.tawMm).toBeCloseTo(0.5, 1);
    expect(deep.tawMm).toBe(full.tawMm);
  });

  it('computes RAW = p * TAW', () => {
    const { result } = computeSoilWater(uniformLayers(10, 15, 1.2), 1.0, 0.6);
    expect(result!.rawMm).toBeCloseTo(0.6 * result!.tawMm, 0);
  });

  it('skips layers with null values and still computes when coverage is enough', () => {
    const layers = uniformLayers(30, 30, 1.5);
    layers[4] = { ...layers[4]!, sandPct: null };
    const { result } = computeSoilWater(layers, 1.0, 0.55);
    expect(result).not.toBeNull();
  });

  it('returns null with a reason when data is missing or insufficient', () => {
    const none = computeSoilWater([], 1.0, 0.55);
    expect(none.result).toBeNull();
    expect(none.reason).toEqual(expect.any(String));

    const allNull = computeSoilWater(uniformLayers(null, null, null), 1.0, 0.55);
    expect(allNull.result).toBeNull();
    expect(allNull.reason).toEqual(expect.any(String));

    const partial = uniformLayers(30, 30, 1.5).map((layer, i) =>
      i < 4 ? { ...layer, clayPct: null } : layer,
    );
    const low = computeSoilWater(partial, 1.0, 0.55);
    expect(low.result).toBeNull();
    expect(low.reason).toContain('cover');
  });
});
