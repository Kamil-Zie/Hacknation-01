// T-014 DM-006 Drought class and soil moisture agreement tests (ADR-007 section 6, 5a)
import { describe, expect, it } from 'vitest';

import { classifyDrought, soilMoistureAgreement } from './classify.js';
import type { WaterBalanceWindow } from './kbw.js';

function kbw60(percentile: number): WaterBalanceWindow {
  return {
    days: 60,
    from: '2024-05-17',
    to: '2024-07-15',
    precipitationMm: 80,
    et0Mm: 240,
    etcMm: 200,
    kbwMm: -120,
    normKbwMm: -60,
    anomalyMm: -60,
    percentile,
    precipitationNormPct: 70,
    meanTmaxC: 27,
    normTmaxC: 25,
  };
}

const summer = '2024-07-15';

describe('classifyDrought', () => {
  it('returns severe for percentile 5', () => {
    const result = classifyDrought({ kbw60: kbw60(5), soilWater: null, analysisDate: summer });
    expect(result.droughtClass).toBe('severe');
    expect(result.droughtClassLabel).toBe('Susza silna');
    expect(result.isOutOfSeason).toBe(false);
  });

  it('returns moderate for percentile 25', () => {
    const result = classifyDrought({ kbw60: kbw60(25), soilWater: null, analysisDate: summer });
    expect(result.droughtClass).toBe('moderate');
    expect(result.droughtClassLabel).toBe('Susza umiarkowana');
  });

  it('returns moderate for Dr > RAW at percentile 50', () => {
    const result = classifyDrought({
      kbw60: kbw60(50),
      soilWater: { depletionMm: 60, rawMm: 52 },
      analysisDate: summer,
    });
    expect(result.droughtClass).toBe('moderate');
  });

  it('returns moderate for Dr > RAW at percentile 41', () => {
    const result = classifyDrought({
      kbw60: kbw60(41),
      soilWater: { depletionMm: 60, rawMm: 52 },
      analysisDate: summer,
    });
    expect(result.droughtClass).toBe('moderate');
  });

  it('returns none for Dr > RAW at percentile 60 and keeps the stress in evidence', () => {
    const result = classifyDrought({
      kbw60: kbw60(60),
      soilWater: { depletionMm: 60, rawMm: 52 },
      analysisDate: summer,
    });
    expect(result.droughtClass).toBe('none');
    const stress = result.evidence.find((e) => e.label.startsWith('Deficyt wody w glebie'));
    expect(stress?.value).toBe(60);
    expect(stress?.note).toContain('bieżący stres wodny');
  });

  it('returns severe for Dr > RAW at percentile 25', () => {
    const result = classifyDrought({
      kbw60: kbw60(25),
      soilWater: { depletionMm: 60, rawMm: 52 },
      analysisDate: summer,
    });
    expect(result.droughtClass).toBe('severe');
    expect(result.evidence.map((e) => e.label)).toContain(
      'Deficyt wody w glebie (Dr) wobec progu RAW',
    );
  });

  it('ignores soil water without depletion', () => {
    const result = classifyDrought({
      kbw60: kbw60(50),
      soilWater: { depletionMm: null, rawMm: 52 },
      analysisDate: summer,
    });
    expect(result.droughtClass).toBe('none');
    expect(result.evidence).toHaveLength(2);
  });

  it('returns none for a normal balance', () => {
    const result = classifyDrought({
      kbw60: kbw60(60),
      soilWater: { depletionMm: 10, rawMm: 52 },
      analysisDate: summer,
    });
    expect(result.droughtClass).toBe('none');
    expect(result.droughtClassLabel).toBe('Brak suszy');
  });

  it('returns unknown without KBW 60', () => {
    const result = classifyDrought({ kbw60: null, soilWater: null, analysisDate: summer });
    expect(result.droughtClass).toBe('unknown');
    expect(result.droughtClassLabel).toBe('Brak danych');
    expect(result.evidence).toEqual([]);
  });

  it('marks December as out of season', () => {
    const result = classifyDrought({
      kbw60: kbw60(60),
      soilWater: null,
      analysisDate: '2024-12-10',
    });
    expect(result.isOutOfSeason).toBe(true);
  });
});

describe('soilMoistureAgreement', () => {
  it('confirms drought when dry and contradicts when wet', () => {
    expect(soilMoistureAgreement('severe', 'dry')).toBe('confirms');
    expect(soilMoistureAgreement('moderate', 'dry')).toBe('confirms');
    expect(soilMoistureAgreement('severe', 'wet')).toBe('contradicts');
    expect(soilMoistureAgreement('moderate', 'normal')).toBe('neutral');
  });

  it('confirms no drought when wet or normal and contradicts when dry', () => {
    expect(soilMoistureAgreement('none', 'wet')).toBe('confirms');
    expect(soilMoistureAgreement('none', 'normal')).toBe('confirms');
    expect(soilMoistureAgreement('none', 'dry')).toBe('contradicts');
  });

  it('is neutral for unknown assessment or class', () => {
    expect(soilMoistureAgreement('severe', 'unknown')).toBe('neutral');
    expect(soilMoistureAgreement('unknown', 'dry')).toBe('neutral');
  });
});
