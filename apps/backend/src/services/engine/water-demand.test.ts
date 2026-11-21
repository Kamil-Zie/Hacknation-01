// T-012 DM-006 Crop water demand tests: ETc and root-zone depletion, hand-computed fixtures
import { describe, expect, it } from 'vitest';

import { addDays, type DailyWeather } from './kbw.js';
import { computeSoilWaterBalance, dailyEtc } from './water-demand.js';

const kc1 = () => 1;

function buildSeries(
  from: string,
  to: string,
  precip: number | null,
  et0: number | null = 3,
): DailyWeather[] {
  const out: DailyWeather[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    out.push({ date: d, precipitationMm: precip, et0Mm: et0, tmaxC: 20 });
  }
  return out;
}

describe('dailyEtc', () => {
  it('multiplies ET0 by Kc', () => {
    expect(dailyEtc(4, 1.15)).toBeCloseTo(4.6, 10);
  });
});

describe('computeSoilWaterBalance', () => {
  it('accumulates Dr from 1 March (P=1, ET0=3, Kc=1 over 10 days = 20 mm)', () => {
    const series = buildSeries('2024-03-01', '2024-03-10', 1);
    const { soilWater, reason } = computeSoilWaterBalance(series, '2024-03-10', kc1, 100, 50);
    expect(reason).toBeNull();
    expect(soilWater).toEqual({ tawMm: 100, rawMm: 50, depletionMm: 20, isStressed: false });
  });

  it('flags stress when Dr exceeds RAW', () => {
    const series = buildSeries('2024-03-01', '2024-03-10', 0);
    const { soilWater } = computeSoilWaterBalance(series, '2024-03-10', kc1, 100, 25);
    expect(soilWater).toEqual({ tawMm: 100, rawMm: 25, depletionMm: 30, isStressed: true });
  });

  it('clamps Dr to TAW', () => {
    const series = buildSeries('2024-03-01', '2024-03-10', 0);
    const { soilWater } = computeSoilWaterBalance(series, '2024-03-10', kc1, 25, 12);
    expect(soilWater!.depletionMm).toBe(25);
  });

  it('clamps Dr to 0 when rain exceeds demand', () => {
    const series = buildSeries('2024-03-01', '2024-03-10', 5);
    const { soilWater } = computeSoilWaterBalance(series, '2024-03-10', kc1, 100, 50);
    expect(soilWater!.depletionMm).toBe(0);
    expect(soilWater!.isStressed).toBe(false);
  });

  it('ignores days after the analysis date', () => {
    const series = buildSeries('2024-03-01', '2024-03-20', 0);
    const { soilWater } = computeSoilWaterBalance(series, '2024-03-10', kc1, 100, 50);
    expect(soilWater!.depletionMm).toBe(30);
  });

  it('returns null depletion outside March-October', () => {
    const series = buildSeries('2024-03-01', '2024-12-10', 1);
    const { soilWater, reason } = computeSoilWaterBalance(series, '2024-12-10', kc1, 100, 50);
    expect(soilWater).toEqual({ tawMm: 100, rawMm: 50, depletionMm: null, isStressed: null });
    expect(reason).toEqual(expect.any(String));
  });

  it('skips single missing days but returns null above 10% gaps', () => {
    const series = buildSeries('2024-03-01', '2024-03-20', 1);
    series[3]!.precipitationMm = null;
    const ok = computeSoilWaterBalance(series, '2024-03-20', kc1, 100, 50);
    expect(ok.soilWater!.depletionMm).toBe(38);

    series[4]!.et0Mm = null;
    series[5]!.et0Mm = null;
    const bad = computeSoilWaterBalance(series, '2024-03-20', kc1, 100, 50);
    expect(bad.soilWater).toEqual({ tawMm: 100, rawMm: 50, depletionMm: null, isStressed: null });
    expect(bad.reason).toContain('missing');
  });

  it('returns null soilWater when there is no soil', () => {
    const series = buildSeries('2024-03-01', '2024-03-10', 1);
    const { soilWater, reason } = computeSoilWaterBalance(series, '2024-03-10', kc1, null, null);
    expect(soilWater).toBeNull();
    expect(reason).toEqual(expect.any(String));
  });
});
