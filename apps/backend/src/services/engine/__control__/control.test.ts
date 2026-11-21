// T-036 DM-006 DM-007 Control tests: engine results against values calculated by hand (ADR-007)
import { describe, expect, it } from 'vitest';

import { classifyDrought } from '../classify.js';
import { computeConfidence, type ConfidenceInput } from '../confidence.js';
import {
  computeCurrentWindow,
  computeKbwWindows,
  type DailyWeather,
  type WaterBalanceWindow,
} from '../kbw.js';
import { computeSoilWater, saxtonRawls } from '../soil.js';
import { computeVulnerability } from '../vulnerability.js';

function dayList(from: string, to: string): string[] {
  const out: string[] = [];
  for (
    let t = Date.parse(`${from}T00:00:00Z`);
    t <= Date.parse(`${to}T00:00:00Z`);
    t += 86_400_000
  ) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

describe('control: KBW (ADR-007 section 3, FAO-56 ETc = Kc * ET0)', () => {
  it('10-day window ending 2025-06-10 gives KBW = -32.2 mm', () => {
    // Hand calculation (days 06-01 .. 06-10):
    //   P   = 0+0+12.4+0+0+3.2+0+0+0.6+0                 = 16.2 mm
    //   ET0 days 1-5 = 4.0+4.5+3.0+5.0+5.5               = 22.0 mm, Kc = 1.0 -> ETc = 22.0
    //   ET0 days 6-10 = 3.5+4.5+5.0+4.0+5.0              = 22.0 mm, Kc = 1.2 -> ETc = 26.4
    //   ETc = 22.0 + 26.4 = 48.4 mm;  KBW = P - ETc = 16.2 - 48.4 = -32.2 mm
    const precipitation = [0, 0, 12.4, 0, 0, 3.2, 0, 0, 0.6, 0];
    const et0 = [4.0, 4.5, 3.0, 5.0, 5.5, 3.5, 4.5, 5.0, 4.0, 5.0];
    const series: DailyWeather[] = dayList('2025-06-01', '2025-06-10').map((date, i) => ({
      date,
      precipitationMm: precipitation[i]!,
      et0Mm: et0[i]!,
      tmaxC: 25,
    }));
    const kc = (date: string): number => (date <= '2025-06-05' ? 1.0 : 1.2);
    const window = computeCurrentWindow(series, '2025-06-10', 10, kc);
    expect(window).not.toBeNull();
    expect(window!.precipitationMm).toBeCloseTo(16.2, 1);
    expect(window!.et0Mm).toBeCloseTo(44.0, 1);
    expect(window!.etcMm).toBeCloseTo(48.4, 1);
    expect(window!.kbwMm).toBeCloseTo(-32.2, 1);
    expect(window!.meanTmaxC).toBe(25);
  });

  it('percentile, norm and anomaly against a reference set with known ranks', () => {
    // Series: no rain, Kc = 1, ET0 constant within a year. Reference years 2015..2024 have
    // ET0 = 1..10 mm/day, so every 60-day KBW of year 2014+e equals -60*e (e = 1..10):
    //   -60, -120, ..., -600; each value appears in 7 samples (7 window ends) = 70 samples.
    // Current year 2025 has ET0 = 5.5 -> KBW60 = -60 * 5.5 = -330 mm (D = 2025-07-15).
    // Samples <= -330: e = 6..10 -> 5 years * 7 = 35 of 70 -> percentile = 50.
    // Norm = median of 70 values = mean of 35th and 36th ascending (-360, -300) = -330 mm,
    // anomaly = -330 - (-330) = 0.
    const series: DailyWeather[] = dayList('2015-01-01', '2025-07-15').map((date) => {
      const year = Number(date.slice(0, 4));
      return {
        date,
        precipitationMm: 0,
        et0Mm: year === 2025 ? 5.5 : year - 2014,
        tmaxC: 20,
      };
    });
    const result = computeKbwWindows(series, '2025-07-15', () => 1);
    expect(result.gaps).toEqual([]);
    expect(result.kbw60).not.toBeNull();
    expect(result.kbw60!.kbwMm).toBe(-330);
    expect(result.kbw60!.normKbwMm).toBe(-330);
    expect(result.kbw60!.anomalyMm).toBe(0);
    expect(result.kbw60!.percentile).toBe(50);
    // KBW30 analogous: -30*e, current -165; samples <= -165: e >= 6 (-180) -> 35 of 70 -> 50.
    expect(result.kbw30!.kbwMm).toBe(-165);
    expect(result.kbw30!.percentile).toBe(50);
  });
});

describe('control: Saxton & Rawls 2006 (ADR-007 section 4)', () => {
  // Source of the formulas: Saxton K.E., Rawls W.J. (2006), Soil Sci. Soc. Am. J. 70:1569-1578,
  // Eq. 1-2 (theta1500, theta33). Reference for the sand case: ADR-007 (sand 85/clay 5/OM 1:
  // theta33 about 0.087, theta1500 about 0.034, TAW about 53 mm per 1 m). For the textures
  // below, the typical ranges of the USDA texture classes from the SPAW/Saxton-Rawls tables
  // are used as a sanity check: sandy loam FC 0.17-0.21, PWP 0.07-0.10; clay loam FC 0.33-0.38,
  // PWP 0.19-0.23. Tolerance for the comparison with published values: +-0.02 m3/m3.
  const cases = [
    {
      name: 'loamy sand 85/5/OM1 (ADR-007 example)',
      sand: 0.85,
      clay: 0.05,
      om: 1,
      // theta1500t = -0.0204 + 0.02435 + 0.006 + 0.00425 - 0.00065 + 0.00289 + 0.031 = 0.04744
      //   theta1500 = 0.04744 + (0.14*0.04744 - 0.02) = 0.04744 - 0.013358 = 0.034082
      // theta33t = -0.21335 + 0.00975 + 0.011 + 0.0051 - 0.00135 + 0.01921 + 0.299 = 0.12936
      //   theta33 = 0.12936 + (1.283*0.12936^2 - 0.374*0.12936 - 0.015) = 0.12936 - 0.041911 = 0.087449
      fc: 0.0874,
      wp: 0.0341,
      published: { fc: 0.087, wp: 0.034 },
    },
    {
      name: 'sandy loam 60/13/OM1.5 (like Bronowice)',
      sand: 0.6,
      clay: 0.13,
      om: 1.5,
      // theta1500t = -0.0144 + 0.06331 + 0.009 + 0.0045 - 0.002535 + 0.005304 + 0.031 = 0.096179
      //   theta1500 = 0.096179 + (0.14*0.096179 - 0.02) = 0.096179 - 0.006535 = 0.089644
      // theta33t = -0.1506 + 0.02535 + 0.0165 + 0.0054 - 0.005265 + 0.035256 + 0.299 = 0.225641
      //   theta33 = 0.225641 + (1.283*0.225641^2 - 0.374*0.225641 - 0.015)
      //           = 0.225641 + (0.065323 - 0.084391 - 0.015) = 0.191573
      fc: 0.1916,
      wp: 0.0896,
      published: { fc: 0.19, wp: 0.09 },
    },
    {
      name: 'clay loam 30/35/OM2',
      sand: 0.3,
      clay: 0.35,
      om: 2,
      // theta1500t = -0.0072 + 0.17045 + 0.012 + 0.003 - 0.0091 + 0.00714 + 0.031 = 0.20729
      //   theta1500 = 0.20729 + (0.14*0.20729 - 0.02) = 0.20729 + 0.009021 = 0.216311
      // theta33t = -0.0753 + 0.06825 + 0.022 + 0.0036 - 0.0189 + 0.04746 + 0.299 = 0.34611
      //   theta33 = 0.34611 + (1.283*0.34611^2 - 0.374*0.34611 - 0.015)
      //           = 0.34611 + (0.153693 - 0.129445 - 0.015) = 0.355358
      fc: 0.3554,
      wp: 0.2163,
      published: { fc: 0.355, wp: 0.215 },
    },
  ];

  it.each(cases)('theta33 and theta1500 for $name', ({ sand, clay, om, fc, wp, published }) => {
    const result = saxtonRawls(sand, clay, om);
    expect(result.fieldCapacity).toBeCloseTo(fc, 3);
    expect(result.wiltingPoint).toBeCloseTo(wp, 3);
    expect(Math.abs(result.fieldCapacity - published.fc)).toBeLessThanOrEqual(0.02);
    expect(Math.abs(result.wiltingPoint - published.wp)).toBeLessThanOrEqual(0.02);
  });

  it('TAW and RAW for winter wheat (Zr 1.2 m capped to 1 m, p 0.55), sandy loam 60/13/OM1.5', () => {
    // One layer 0-100 cm (SOC = 1.5 / 1.724 so that OM = 1.5 %).
    // TAW = 1000 * (0.191573 - 0.089644) * 1.0 = 101.9 mm; RAW = 0.55 * 101.929 = 56.06 mm.
    const socPct = 1.5 / 1.724;
    const outcome = computeSoilWater(
      [{ topCm: 0, bottomCm: 100, sandPct: 60, clayPct: 13, socPct }],
      1.2,
      0.55,
    );
    expect(outcome.result).not.toBeNull();
    expect(outcome.result!.tawMm).toBeCloseTo(101.9, 0);
    expect(outcome.result!.rawMm).toBeCloseTo(56.1, 0);
    expect(outcome.result!.soil.category).toBe('medium');
  });

  it('TAW for the ADR-007 sand example is about 53 mm per metre', () => {
    // 1000 * (0.087449 - 0.034082) = 53.4 mm
    const outcome = computeSoilWater(
      [{ topCm: 0, bottomCm: 100, sandPct: 85, clayPct: 5, socPct: 1 / 1.724 }],
      1.0,
      0.55,
    );
    expect(outcome.result!.tawMm).toBeCloseTo(53.4, 0);
    expect(outcome.result!.soil.category).toBe('very_light');
  });
});

function windowWithPercentile(percentile: number): WaterBalanceWindow {
  return {
    days: 60,
    from: '2025-05-16',
    to: '2025-07-14',
    precipitationMm: 50,
    et0Mm: 200,
    etcMm: 220,
    kbwMm: -170,
    normKbwMm: -100,
    anomalyMm: -70,
    percentile,
    precipitationNormPct: 60,
    meanTmaxC: 28,
    normTmaxC: 25,
  };
}

describe('control: drought class (ADR-007 section 6)', () => {
  // Rules: severe = P<=10 or (Dr>RAW and P<=30); moderate = P<=30 or (Dr>RAW and P<=50); else none.
  // RAW = 50 mm in the soil cases below.
  const dry = { depletionMm: 60, rawMm: 50 };
  const atRaw = { depletionMm: 50, rawMm: 50 };
  const wet = { depletionMm: 10, rawMm: 50 };
  const table: [number, { depletionMm: number | null; rawMm: number } | null, string][] = [
    [10, null, 'severe'], // boundary P=10
    [11, null, 'moderate'], // just above 10
    [30, null, 'moderate'], // boundary P=30
    [31, null, 'none'], // just above 30
    [50, wet, 'none'],
    [31, dry, 'moderate'], // Dr 60 > RAW 50, P>30
    [31, atRaw, 'none'], // Dr = RAW is not > RAW
    [30, dry, 'severe'], // Dr>RAW and P<=30
    [11, dry, 'severe'],
    [50, dry, 'moderate'], // boundary P=50
    [51, dry, 'none'], // above 50 Dr > RAW stays in evidence only
  ];

  it.each(table)('percentile %i with soil %j gives %s', (percentile, soilWater, expected) => {
    const result = classifyDrought({
      kbw60: windowWithPercentile(percentile),
      soilWater,
      analysisDate: '2025-07-15',
    });
    expect(result.droughtClass).toBe(expected);
    expect(result.isOutOfSeason).toBe(false);
  });

  it('gives unknown without KBW60 and flags out-of-season dates (XI-II)', () => {
    expect(
      classifyDrought({ kbw60: null, soilWater: null, analysisDate: '2025-07-15' }).droughtClass,
    ).toBe('unknown');
    const winter = classifyDrought({
      kbw60: windowWithPercentile(20),
      soilWater: null,
      analysisDate: '2025-12-15',
    });
    expect(winter.droughtClass).toBe('moderate');
    expect(winter.isOutOfSeason).toBe(true);
  });
});

describe('control: multi-year vulnerability (ADR-007 section 7)', () => {
  // Years 2015..2024, whole-year constant daily balance (Kc = 1, P = 0):
  //   deficit year: ET0 = 1.0 -> min 60-day KBW in IV-IX = -60 < -3*RAW(17) = -51 -> season with deficit;
  //                 monthly KBW Apr..Sep = -30..-31 < -25 -> deficit month
  //   neutral year: ET0 = 0 -> KBW = 0, no deficit
  //   near-miss year: ET0 = 0.8 -> 60-day KBW = -48 > -51, month -24..-24.8 > -25: no deficit
  // Class: 0-2 seasons low, 3-5 medium, >=6 high; critical months = deficit in >= 50% of years.
  function build(deficitYears: number[], nearMissYears: number[] = []): DailyWeather[] {
    return dayList('2015-01-01', '2024-12-31').map((date) => {
      const year = Number(date.slice(0, 4));
      const et0 = deficitYears.includes(year) ? 1 : nearMissYears.includes(year) ? 0.8 : 0;
      return { date, precipitationMm: 0, et0Mm: et0, tmaxC: 20 };
    });
  }
  const years = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024];

  it.each([
    [0, 'low', []],
    [2, 'low', []],
    [3, 'medium', []],
    [5, 'medium', [4, 5, 6, 7, 8, 9]],
    [6, 'high', [4, 5, 6, 7, 8, 9]],
  ] as [number, string, number[]][])(
    '%i deficit seasons give class %s',
    (count, expectedClass, expectedCritical) => {
      const deficit = years.slice(0, count);
      const result = computeVulnerability(build(deficit, [2024]), '2025-06-15', () => 1, 17, null);
      expect(result.yearsAnalyzed).toBe(10);
      expect(result.seasonsWithDeficit).toBe(count);
      expect(result.deficitYears).toEqual(deficit);
      expect(result.vulnerabilityClass).toBe(expectedClass);
      expect(result.criticalMonths).toEqual(expectedCritical);
    },
  );

  it('uses the -180 mm threshold and records a gap when there is no soil (RAW null)', () => {
    // Deficit year KBW60 = -60, not < -180 -> no season with deficit.
    const result = computeVulnerability(
      build([2015, 2016, 2017]),
      '2025-06-15',
      () => 1,
      null,
      null,
    );
    expect(result.seasonsWithDeficit).toBe(0);
    expect(result.gaps.some((g) => g.includes('no soil data'))).toBe(true);
  });

  it('returns unknown with fewer than 8 complete years', () => {
    const series = build([]).filter((d) => d.date >= '2019-01-01');
    const result = computeVulnerability(series, '2025-06-15', () => 1, 50, null);
    expect(result.vulnerabilityClass).toBe('unknown');
  });
});

describe('control: confidence (ADR-007 section 10, ADR-008, NASA fallback penalty)', () => {
  const all = {
    meteo: true,
    soil: true,
    sentinel2: true,
    soilMoisture: true,
    terrain: true,
    hydrology: true,
    parcel: true,
  };
  const base: ConfidenceInput = {
    available: all,
    sceneAgeDays: 5,
    ndmiAssessment: null,
    soilMoistureAgreement: null,
    droughtClass: 'none',
    areaHa: 5,
    isOutOfSeason: false,
    usedMeteoFallback: false,
  };

  it('weights add up to 1.00 with all sources', () => {
    // 0.35 + 0.20 + 0.15 + 0.10 + 0.10 + 0.05 + 0.05 = 1.00
    expect(computeConfidence(base).confidenceScore).toBe(1);
  });

  it('meteo + soil only = 0.55 -> medium (threshold 0.55)', () => {
    const result = computeConfidence({
      ...base,
      available: {
        ...all,
        sentinel2: false,
        soilMoisture: false,
        terrain: false,
        hydrology: false,
        parcel: false,
      },
    });
    expect(result.confidenceScore).toBe(0.55);
    expect(result.confidence).toBe('medium');
  });

  it('NASA fallback lowers the score by 0.05: 0.70 - 0.05 = 0.65', () => {
    // meteo 0.35 + soil 0.20 + terrain 0.10 + parcel 0.05 = 0.70, fallback -0.05
    const result = computeConfidence({
      ...base,
      available: { ...all, sentinel2: false, soilMoisture: false, hydrology: false },
      usedMeteoFallback: true,
    });
    expect(result.confidenceScore).toBe(0.65);
    expect(result.confidence).toBe('medium');
  });

  it('all penalties: 1.00 - 0.05 - 0.10 - 0.10 - 0.05 - 0.05 - 0.10 - 0.05 = 0.50 -> low', () => {
    // old scene -0.05, NDMI contradicts (severe + normal) -0.10, soil moisture contradicts -0.10,
    // both satellite -0.05, area 0.3 ha -0.05, out of season -0.10, NASA fallback -0.05
    const result = computeConfidence({
      ...base,
      sceneAgeDays: 25,
      ndmiAssessment: 'normal',
      soilMoistureAgreement: 'contradicts',
      droughtClass: 'severe',
      areaHa: 0.3,
      isOutOfSeason: true,
      usedMeteoFallback: true,
    });
    expect(result.confidenceScore).toBe(0.5);
    expect(result.confidence).toBe('low');
  });

  it('bonus +0.05 when both satellite sources confirm: 0.85 + 0.05 = 0.90 -> high', () => {
    // without terrain and hydrology: 1.00 - 0.10 - 0.05 = 0.85
    const result = computeConfidence({
      ...base,
      available: { ...all, terrain: false, hydrology: false },
      ndmiAssessment: 'below',
      soilMoistureAgreement: 'confirms',
      droughtClass: 'severe',
    });
    expect(result.confidenceScore).toBe(0.9);
    expect(result.confidence).toBe('high');
  });
});
