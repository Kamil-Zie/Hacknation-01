// T-005 ULDK parser tests on real responses (fixtures) and cache behaviour (in-memory cache, no network)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { test } from 'vitest';

import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';
import { fetchParcelById, parseUldkResponse } from '@/services/sources/uldk.source';

const fixture = (name: string) => readFileSync(join(__dirname, '__fixtures__', name), 'utf8');

test('parses real ULDK response into DM-003 parcel', () => {
  const parcel = parseUldkResponse(fixture('uldk-061409_2.0009.612.txt'));
  assert.ok(parcel);
  assert.equal(parcel.id, '061409_2.0009.612');
  assert.equal(parcel.parcelNumber, '612');
  assert.equal(parcel.region, 'Bronowice');
  assert.equal(parcel.commune, 'Puławy');
  assert.equal(parcel.county, 'puławski');
  assert.equal(parcel.voivodeship, 'lubelskie');
  assert.equal(parcel.geometry.type, 'Polygon');
  assert.ok(parcel.areaHa > 0.1 && parcel.areaHa < 5);
  assert.ok(Math.abs(parcel.centroid.lat - 51.4396) < 0.01);
  assert.ok(Math.abs(parcel.centroid.lon - 21.9282) < 0.01);
  assert.equal(parcel.bbox.length, 4);
});

test('-1 response means no parcel (null)', () => {
  assert.equal(parseUldkResponse(fixture('uldk-not-found.txt')), null);
});

test('malformed response throws', () => {
  assert.throws(() => parseUldkResponse('<html>oops</html>'));
});

test('second fetchParcelById call is served from cache', async () => {
  const store = new Map<string, CachedEntry>();
  const cache: SourceCacheStore = {
    get: async (key) => store.get(key) ?? null,
    set: async (key, _sourceId, payload, _ttlMs, dataPeriod) => {
      store.set(key, { payload, dataPeriod, fetchedAt: new Date() });
    },
  };
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(fixture('uldk-061409_2.0009.612.txt'), { status: 200 });
  }) as typeof fetch;
  try {
    const first = await fetchParcelById('061409_2.0009.612', undefined, cache);
    const second = await fetchParcelById('061409_2.0009.612', undefined, cache);
    assert.equal(first.status, 'ok');
    assert.equal(second.status, 'cached');
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
