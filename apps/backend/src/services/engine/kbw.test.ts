// T-009 DM-013 KBW engine tests: hand-computed fixtures
import { describe, expect, it } from 'vitest';

import { addDays, computeCurrentWindow, computeKbwWindows, type DailyWeather } from './kbw.js';

const kc1 = () => 1;

// Daily series from `from` to `to`; precipitation chosen per date.
function buildSeries(
  from: string,
  to: string,
  precip: (date: string) => number | null = () => 2,
): DailyWeather[] {
  const out: DailyWeather[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    out.push({ date: d, precipitationMm: precip(d), et0Mm: 3, tmaxC: 20 });
  }
  return out;
}

// Prior years P = 2 mm/day, year of D P = 1 mm/day; ET0 = 3, Kc = 1.
const dryYear = (year: string) => (date: string) => (date.startsWith(year) ? 1 : 2);

describe('computeCurrentWindow', () => {
  it('sums the current window without norm or percentile', () => {
    const series = buildSeries('2024-04-01', '2024-07-15');
    expect(computeCurrentWindow(series, '2024-07-15', 30, kc1)).toEqual({
      days: 30,
      from: '2024-06-16',
      to: '2024-07-15',
      precipitationMm: 60,
      et0Mm: 90,
      etcMm: 90,
      kbwMm: -30,
      meanTmaxC: 20,
    });
  });

  it('returns null when more than 10% of the days are missing', () => {
    const series = buildSeries('2024-04-01', '2024-07-15', (d) => (d > '2024-07-05' ? null : 2));
    expect(computeCurrentWindow(series, '2024-07-15', 30, kc1)).toBeNull();
  });
});

describe('computeKbwWindows', () => {
  it('computes KBW, norm, anomaly and percentile for a hand-computed fixture', () => {
    const series = buildSeries('2013-01-01', '2024-07-15', dryYear('2024'));
    const { kbw30, kbw60, gaps } = computeKbwWindows(series, '2024-07-15', kc1);

    expect(gaps).toEqual([]);
    expect(kbw30).toEqual({
      days: 30,
      from: '2024-06-16',
      to: '2024-07-15',
      precipitationMm: 30,
      et0Mm: 90,
      etcMm: 90,
      kbwMm: -60,
      normKbwMm: -30,
      anomalyMm: -30,
      percentile: 0,
      precipitationNormPct: 50,
      meanTmaxC: 20,
      normTmaxC: 20,
    });
    expect(kbw60?.kbwMm).toBe(-120);
    expect(kbw60?.normKbwMm).toBe(-60);
    expect(kbw60?.from).toBe('2024-05-17');
  });

  it('uses Kc to scale ET0 and gives percentile 100 for a wet window', () => {
    const series = buildSeries('2013-01-01', '2024-07-15', (d) => (d.startsWith('2024') ? 5 : 2));
    const { kbw30 } = computeKbwWindows(series, '2024-07-15', () => 0.5);
    // P=150, ETc=45, KBW=105; norm = 60 - 45 = 15
    expect(kbw30?.kbwMm).toBe(105);
    expect(kbw30?.etcMm).toBe(45);
    expect(kbw30?.normKbwMm).toBe(15);
    expect(kbw30?.percentile).toBe(100);
  });

  it('ignores days after the analysis date', () => {
    const base = buildSeries('2013-01-01', '2024-07-15', dryYear('2024'));
    const withFuture = [...base, ...buildSeries('2024-07-16', '2024-12-31', () => 500)];
    expect(computeKbwWindows(withFuture, '2024-07-15', kc1)).toEqual(
      computeKbwWindows(base, '2024-07-15', kc1),
    );
  });

  it('returns null with a reason when more than 10% of days are missing', () => {
    const series = buildSeries('2013-01-01', '2024-07-15', (d) =>
      d >= '2024-07-01' && d <= '2024-07-04' ? null : d.startsWith('2024') ? 1 : 2,
    );
    const { kbw30, kbw60, gaps } = computeKbwWindows(series, '2024-07-15', kc1);
    expect(kbw30).toBeNull(); // 4/30 = 13.3%
    expect(kbw60).not.toBeNull(); // 4/60 = 6.7%
    expect(gaps).toHaveLength(1);
    expect(gaps[0]).toContain('kbw30');
  });

  it('returns null when history is too short for the reference distribution', () => {
    const series = buildSeries('2020-01-01', '2024-07-15');
    const { kbw30, kbw60, gaps } = computeKbwWindows(series, '2024-07-15', kc1);
    expect(kbw30).toBeNull();
    expect(kbw60).toBeNull();
    expect(gaps[0]).toContain('reference samples');
  });

  it('handles D = 29.02 in a leap year using 28.02 in other years', () => {
    const series = buildSeries('2013-01-01', '2024-02-29', dryYear('2024'));
    const { kbw30, gaps } = computeKbwWindows(series, '2024-02-29', kc1);
    expect(gaps).toEqual([]);
    expect(kbw30?.from).toBe('2024-01-31');
    expect(kbw30?.kbwMm).toBe(-60);
    expect(kbw30?.normKbwMm).toBe(-30);
  });

  it('handles D = 1.01 with a window crossing the year boundary', () => {
    const series = buildSeries('2013-01-01', '2025-01-01', dryYear('2024'));
    const { kbw30, gaps } = computeKbwWindows(series, '2025-01-01', kc1);
    expect(gaps).toEqual([]);
    expect(kbw30?.from).toBe('2024-12-03');
    expect(kbw30?.to).toBe('2025-01-01');
    // 29 days of 2024 at 1 - 3 = -2, plus 2025-01-01 at 2 - 3 = -1
    expect(kbw30?.kbwMm).toBe(-59);
  });
});
