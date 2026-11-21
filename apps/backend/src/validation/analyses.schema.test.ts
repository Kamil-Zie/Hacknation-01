// T-018 API-005 id schema tests
import assert from 'node:assert/strict';

import { test } from 'vitest';

import { analysisIdParamsSchema } from '@/validation/analyses.schema';

test('accepts 24 hex chars', () => {
  assert.equal(analysisIdParamsSchema.safeParse({ id: '665f0c0ffee0000000000001' }).success, true);
});

test('rejects wrong length or non-hex', () => {
  for (const id of ['abc', '665f0c0ffee000000000000g', '665f0c0ffee00000000000012']) {
    assert.equal(analysisIdParamsSchema.safeParse({ id }).success, false);
  }
});
