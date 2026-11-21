// T-004 runSource tests: cache hit, timeout, network error after retry, missing (in-memory cache, no Atlas)
import assert from 'node:assert/strict';

import { test } from 'vitest';

import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';
import { HttpStatusError, runSource } from '@/services/sources/runSource';

function memoryCache(): SourceCacheStore {
  const store = new Map<string, CachedEntry>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, _sourceId, payload, _ttlMs, dataPeriod) => {
      store.set(key, { payload, dataPeriod, fetchedAt: new Date() });
    },
  };
}

test('second identical call returns cache without calling the fetcher', async () => {
  const cache = memoryCache();
  let calls = 0;
  const fetcher = async () => {
    calls += 1;
    return { data: { value: 1 }, dataPeriod: '2025-05-01' };
  };
  const first = await runSource({ sourceId: 'elevation', key: 'k1', fetcher, cache });
  const second = await runSource({ sourceId: 'elevation', key: 'k1', fetcher, cache });
  assert.equal(first.status, 'ok');
  assert.equal(second.status, 'cached');
  assert.deepEqual(second.data, { value: 1 });
  assert.equal(second.dataPeriod, '2025-05-01');
  assert.equal(calls, 1);
});

test('timeout gives status timeout without throwing', async () => {
  const fetcher = (signal: AbortSignal) =>
    new Promise<null>((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason));
    });
  const result = await runSource({
    sourceId: 'meteo',
    key: 'k2',
    fetcher,
    timeoutMs: 50,
    cache: memoryCache(),
  });
  assert.equal(result.status, 'timeout');
  assert.equal(result.data, null);
});

test('slow first attempt is cut by attemptTimeoutMs and the retry succeeds (cold start)', async () => {
  let calls = 0;
  const fetcher = (signal: AbortSignal) => {
    calls += 1;
    if (calls === 1) {
      return new Promise<null>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason));
      });
    }
    return Promise.resolve({ data: { ok: true } });
  };
  const result = await runSource({
    sourceId: 'uldk',
    key: 'k-cold',
    fetcher,
    timeoutMs: 500,
    attemptTimeoutMs: 50,
    cache: memoryCache(),
  });
  assert.equal(result.status, 'ok');
  assert.equal(calls, 2);
});

test('network error is retried once and gives status error', async () => {
  let calls = 0;
  const fetcher = async (): Promise<null> => {
    calls += 1;
    throw new TypeError('fetch failed');
  };
  const result = await runSource({ sourceId: 'uldk', key: 'k3', fetcher, cache: memoryCache() });
  assert.equal(result.status, 'error');
  assert.equal(calls, 2);
});

test('4xx is not retried', async () => {
  let calls = 0;
  const fetcher = async (): Promise<null> => {
    calls += 1;
    throw new HttpStatusError(404);
  };
  const result = await runSource({ sourceId: 'uldk', key: 'k5', fetcher, cache: memoryCache() });
  assert.equal(result.status, 'error');
  assert.equal(calls, 1);
});

test('eumetsat is always missing and the fetcher is never called', async () => {
  let calls = 0;
  const result = await runSource({
    sourceId: 'eumetsat',
    key: 'k6',
    fetcher: async () => {
      calls += 1;
      return { data: { value: 1 } };
    },
    cache: memoryCache(),
  });
  assert.equal(result.status, 'missing');
  assert.equal(result.data, null);
  assert.equal(result.fetchedAt, null);
  assert.equal(calls, 0);
});

test('null result gives status missing and is not cached', async () => {
  const cache = memoryCache();
  const result = await runSource({
    sourceId: 'soilgrids',
    key: 'k4',
    fetcher: async () => null,
    cache,
  });
  assert.equal(result.status, 'missing');
  assert.equal(await cache.get('k4'), null);
});
