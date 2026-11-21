// T-027 DM-014 Sentinel-2 source tests: STAC parsing, scale/offset, date filter, missing cases (no network)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { afterEach, test, vi } from 'vitest';

import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';
import {
  fetchSentinel2Scenes,
  parseSearchResponse,
  searchScenes,
} from '@/services/sources/sentinel2.source';

const fixture = JSON.parse(
  readFileSync(
    join(__dirname, '__fixtures__', 'sentinel2-search-bronowice-2026-06-10.json'),
    'utf8',
  ),
);
const geometry = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [21.9261, 51.4392],
      [21.9262, 51.439],
      [21.9304, 51.4399],
      [21.9261, 51.4392],
    ],
  ],
};
const parcel = { id: '061409_2.0009.612', geometry };

function memoryCache(): SourceCacheStore {
  const store = new Map<string, CachedEntry>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, _sourceId, payload, _ttlMs, dataPeriod) => {
      store.set(key, { payload, dataPeriod, fetchedAt: new Date() });
    },
  };
}

function mockFetch(body: unknown) {
  const mock = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal('fetch', mock);
  return mock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

test('parses scenes with assets, scale and offset, newest first', () => {
  const scenes = parseSearchResponse(fixture, '2026-06-10');
  assert.equal(scenes.length, 3);
  const first = scenes[0]!;
  assert.equal(first.id, 'S2A_34UEB_20260609_1_L2A');
  assert.equal(first.date, '2026-06-09');
  assert.ok(first.cloudCover > 34 && first.cloudCover < 35);
  assert.equal(first.epsg, 32634);
  assert.equal(first.assets.red.scale, 0.0001);
  assert.equal(first.assets.red.offset, -0.1);
  assert.match(first.assets.nir08.href, /B8A\.tif$/);
  assert.match(first.assets.swir16.href, /B11\.tif$/);
  assert.deepEqual(Object.keys(first.assets.scl), ['href']);
  assert.match(first.thumbnailUrl ?? '', /preview\.jpg$/);
  assert.deepEqual(
    scenes.map((s) => s.date),
    [...scenes.map((s) => s.date)].sort().reverse(),
  );
});

test('missing raster:bands gives scale 1 and offset 0; no thumbnail gives null', () => {
  const feature = structuredClone(fixture.features[0]);
  delete feature.assets.red['raster:bands'];
  delete feature.assets.thumbnail;
  const [scene] = parseSearchResponse({ features: [feature] }, '2026-06-10');
  assert.equal(scene?.assets.red.scale, 1);
  assert.equal(scene?.assets.red.offset, 0);
  assert.equal(scene?.thumbnailUrl, null);
});

test('scenes dated after D are filtered out', () => {
  const scenes = parseSearchResponse(fixture, '2026-06-08');
  assert.deepEqual(
    scenes.map((s) => s.date),
    ['2026-06-07'],
  );
});

test('searchScenes sends the STAC query with the D-45 window', async () => {
  const mock = mockFetch(fixture);
  const scenes = await searchScenes(geometry, '2026-06-10');
  assert.equal(scenes.length, 3);
  const [url, init] = mock.mock.calls[0] as unknown as [string, RequestInit];
  assert.equal(url, 'https://earth-search.aws.element84.com/v1/search');
  const body = JSON.parse(init.body as string);
  assert.deepEqual(body.collections, ['sentinel-2-l2a']);
  assert.equal(body.datetime, '2026-04-26T00:00:00Z/2026-06-10T23:59:59Z');
  assert.deepEqual(body.query, { 'eo:cloud_cover': { lt: 70 } });
  assert.equal(body.limit, 10);
  assert.deepEqual(body.intersects, geometry);
});

test('fetchSentinel2Scenes returns ok with dataPeriod of the newest scene', async () => {
  mockFetch(fixture);
  const result = await fetchSentinel2Scenes(parcel, '2026-06-10', undefined, {
    cache: memoryCache(),
  });
  assert.equal(result.status, 'ok');
  assert.equal(result.sourceId, 'sentinel2');
  assert.equal(result.dataPeriod, '2026-06-09');
  assert.equal(result.data?.length, 3);
});

test('no scenes gives missing with a Polish message', async () => {
  mockFetch({ type: 'FeatureCollection', features: [] });
  const result = await fetchSentinel2Scenes(parcel, '2026-06-10', undefined, {
    cache: memoryCache(),
  });
  assert.equal(result.status, 'missing');
  assert.equal(
    result.message,
    'Brak zdjęć z mniejszym zachmurzeniem niż 70% w 45 dniach przed 2026-06-10',
  );
});

test('date before the archive gives missing without a request', async () => {
  const mock = mockFetch(fixture);
  const result = await fetchSentinel2Scenes(parcel, '2016-10-31', undefined, {
    cache: memoryCache(),
  });
  assert.equal(result.status, 'missing');
  assert.equal(result.message, 'Archiwum Sentinel-2 L2A obejmuje daty od listopada 2016');
  assert.equal(mock.mock.calls.length, 0);
});
