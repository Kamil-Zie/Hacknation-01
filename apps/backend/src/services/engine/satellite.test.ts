// T-028 DM-014 DM-004 assessSatellite tests: NDVI/NDMI vs crop expectations per month (ADR-007 §5)
import assert from 'node:assert/strict';

import { test } from 'vitest';

import { assessSatellite } from '@/services/engine/satellite';

test('winter wheat in June: expected ranges come from DM-004 for month D', () => {
  const result = assessSatellite({ ndvi: 0.75, ndmi: 0.25 }, 'winter_wheat', '2026-06-10');
  assert.deepEqual(result.expected, { ndviMin: 0.65, ndviMax: 0.89, ndmiMin: 0.16, ndmiMax: 0.4 });
  assert.equal(result.ndviAssessment, 'normal');
  assert.equal(result.ndmiAssessment, 'normal');
});

test('below, normal and above are decided by the range edges', () => {
  const at = (ndvi: number) => assessSatellite({ ndvi, ndmi: null }, 'winter_wheat', '2026-06-10');
  assert.equal(at(0.3).ndviAssessment, 'below');
  assert.equal(at(0.65).ndviAssessment, 'normal');
  assert.equal(at(0.89).ndviAssessment, 'normal');
  assert.equal(at(0.95).ndviAssessment, 'above');
});

test('a missing index is unknown, not below', () => {
  const result = assessSatellite({ ndvi: 0.7, ndmi: null }, 'winter_wheat', '2026-06-10');
  assert.equal(result.ndmiAssessment, 'unknown');
  assert.equal(
    assessSatellite({ ndvi: null, ndmi: 0.2 }, 'maize', '2026-04-20').ndviAssessment,
    'unknown',
  );
});

test('maize in April: bare soil, low NDVI is normal', () => {
  const result = assessSatellite({ ndvi: 0.15, ndmi: 0 }, 'maize', '2026-04-20');
  assert.equal(result.ndviAssessment, 'normal');
});

test('unknown crop throws', () => {
  assert.throws(() => assessSatellite({ ndvi: 0.5, ndmi: 0.1 }, 'quinoa', '2026-06-10'));
});
