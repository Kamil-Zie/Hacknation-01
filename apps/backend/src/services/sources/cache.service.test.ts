// T-049 in-process cache layer: hit without Mongo, TTL expiry, LRU size limit
import assert from 'node:assert/strict';

import { afterEach, beforeEach, test, vi } from 'vitest';

import {
  MEMORY_CACHE_MAX_ENTRIES,
  clearMemoryCache,
  getCached,
  setCached,
} from '@/services/sources/cache.service';

// Mongo is not connected in tests (readyState 0), so every hit below comes from memory.
beforeEach(() => clearMemoryCache());
afterEach(() => vi.useRealTimers());

test('a value set in the process is read back without Mongo', async () => {
  await setCached('k1', 'nasa_power', { series: [1, 2, 3] }, 60_000, '2016-01-01/2026-05-25');
  const entry = await getCached('k1');
  assert.deepEqual(entry?.payload, { series: [1, 2, 3] });
  assert.equal(entry?.dataPeriod, '2016-01-01/2026-05-25');
});

test('entries expire after their TTL', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-21T12:00:00Z'));
  await setCached('k2', 'meteo', { ok: true }, 1_000, null);
  assert.ok(await getCached('k2'));
  vi.setSystemTime(new Date('2026-11-21T12:00:02Z'));
  assert.equal(await getCached('k2'), null);
});

test('size is limited and the least recently used entry is evicted', async () => {
  for (let i = 0; i < MEMORY_CACHE_MAX_ENTRIES; i += 1) {
    await setCached(`k-${i}`, 'uldk', { i }, 60_000, null);
  }
  // Touch the oldest entry so k-1 becomes the least recently used one.
  assert.ok(await getCached('k-0'));
  await setCached('k-new', 'uldk', { i: 'new' }, 60_000, null);
  assert.ok(await getCached('k-0'));
  assert.equal(await getCached('k-1'), null);
  assert.ok(await getCached('k-new'));
});
