// T-018 DM-001 limitations tests: base list present, extras merged without duplicates
import assert from 'node:assert/strict';

import { test } from 'vitest';

import { BASE_LIMITATIONS, buildLimitations } from '@/services/report/limitations';

test('base limitations contain no duplicates and mention SoilGrids 250 m', () => {
  assert.equal(new Set(BASE_LIMITATIONS).size, BASE_LIMITATIONS.length);
  assert.equal(
    BASE_LIMITATIONS.some((item) => item.includes('250 m')),
    true,
  );
});

test('buildLimitations appends new extras and skips duplicates', () => {
  const first = BASE_LIMITATIONS[0] as string;
  const merged = buildLimitations([first, 'Nowe ograniczenie', 'Nowe ograniczenie']);
  assert.equal(merged.length, BASE_LIMITATIONS.length + 1);
  assert.equal(merged.at(-1), 'Nowe ograniczenie');
});
