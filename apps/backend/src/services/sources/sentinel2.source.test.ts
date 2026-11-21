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
import {
  getPcToken,
  isPcHref,
  resetPcTokenCache,
  signPcHref,
} from '@/services/sources/sentinel2Pc';

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

// Fixture re-keyed the Planetary Computer way (B04, B08, B8A, B11, SCL; no raster:bands).
function pcBody() {
  const keys = { red: 'B04', nir: 'B08', nir08: 'B8A', swir16: 'B11', scl: 'SCL' } as const;
  return {
    features: fixture.features.map((feature: { assets: Record<string, { href: string }> }) => ({
      ...structuredClone(feature),
      properties: { ...(feature as never as { properties: object }).properties },
      assets: Object.fromEntries(
        Object.entries(keys).map(([from, to]) => [to, { href: feature.assets[from]!.href }]),
      ),
    })),
  };
}

function routedFetch(routes: Record<string, () => Response>) {
  const mock = vi.fn(async (url: string) => {
    const route = Object.entries(routes).find(([prefix]) => url.startsWith(prefix));
    return route ? route[1]() : new Response('{}', { status: 500 });
  });
  vi.stubGlobal('fetch', mock);
  return mock;
}

const PC_SEARCH = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
const PC_SAS = 'https://planetarycomputer.microsoft.com/api/sas/v1/token/sentinel-2-l2a';
const ES_SEARCH = 'https://earth-search.aws.element84.com/v1/search';
const sasBody = () =>
  new Response(JSON.stringify({ token: 'sv=1&sig=x', 'msft:expiry': '2099-01-01T00:00:00Z' }));

test('searchScenes prefers Planetary Computer and applies the post-04.00 reflectance offset', async () => {
  resetPcTokenCache();
  const mock = routedFetch({
    [PC_SEARCH]: () => new Response(JSON.stringify(pcBody())),
    [PC_SAS]: sasBody,
  });
  const scenes = await searchScenes(geometry, '2026-06-10');
  assert.equal(scenes.length, 3);
  assert.equal(scenes[0]!.assets.red.scale, 0.0001);
  assert.equal(scenes[0]!.assets.red.offset, -0.1);
  assert.equal(scenes[0]!.thumbnailUrl, null);
  assert.ok(!mock.mock.calls.some(([url]) => (url as string).startsWith(ES_SEARCH)));
});

test('searchScenes falls back to Earth Search when the PC search fails or the SAS endpoint fails', async () => {
  resetPcTokenCache();
  let mock = routedFetch({
    [PC_SEARCH]: () => new Response('{}', { status: 503 }),
    [PC_SAS]: sasBody,
    [ES_SEARCH]: () => new Response(JSON.stringify(fixture)),
  });
  assert.equal((await searchScenes(geometry, '2026-06-10')).length, 3);
  assert.ok(mock.mock.calls.some(([url]) => (url as string).startsWith(ES_SEARCH)));

  resetPcTokenCache();
  mock = routedFetch({
    [PC_SEARCH]: () => new Response(JSON.stringify(pcBody())),
    [PC_SAS]: () => new Response('{}', { status: 500 }),
    [ES_SEARCH]: () => new Response(JSON.stringify(fixture)),
  });
  assert.equal((await searchScenes(geometry, '2026-06-10')).length, 3);
  assert.match(scenesHref(await searchScenes(geometry, '2026-06-10')), /earth|amazonaws|sentinel/);
});

test('Earth Search fallback uses offset 0 (COGs already have the -1000 DN offset removed)', async () => {
  resetPcTokenCache();
  routedFetch({
    [PC_SEARCH]: () => new Response('{}', { status: 503 }),
    [PC_SAS]: sasBody,
    [ES_SEARCH]: () => new Response(JSON.stringify(fixture)),
  });
  const [scene] = await searchScenes(geometry, '2026-06-10');
  for (const band of [
    scene!.assets.red,
    scene!.assets.nir,
    scene!.assets.nir08,
    scene!.assets.swir16,
  ]) {
    assert.equal(band.offset, 0);
  }
});

function scenesHref(scenes: Awaited<ReturnType<typeof searchScenes>>): string {
  return scenes[0]!.assets.red.href;
}

test('SAS token: appended to PC hrefs only and cached until expiry minus 5 minutes', async () => {
  resetPcTokenCache();
  const mock = routedFetch({ [PC_SAS]: sasBody });
  const first = await getPcToken();
  const second = await getPcToken();
  assert.equal(first, second);
  assert.equal(mock.mock.calls.length, 1);
  const href = 'https://sentinel2l2a01.blob.core.windows.net/x/B04.tif';
  assert.equal(signPcHref(href, first), `${href}?sv=1&sig=x`);
  assert.equal(signPcHref(`${href}?a=b`, first), `${href}?a=b&sv=1&sig=x`);
  assert.ok(isPcHref(href));
  assert.ok(!isPcHref('https://sentinel-cogs.s3.us-west-2.amazonaws.com/B04.tif'));

  // Past expiry minus 5 minutes a new token is requested.
  const expiry = Date.parse('2099-01-01T00:00:00Z');
  await getPcToken(undefined, fetch, () => expiry - 4 * 60 * 1000);
  assert.equal(mock.mock.calls.length, 2);
});

test('searchScenes sends the STAC query with the D-45 window', async () => {
  resetPcTokenCache();
  const mock = routedFetch({
    [PC_SEARCH]: () => new Response(JSON.stringify(fixture)),
    [ES_SEARCH]: () => new Response(JSON.stringify(fixture)),
    [PC_SAS]: sasBody,
  });
  const scenes = await searchScenes(geometry, '2026-06-10');
  assert.equal(scenes.length, 3);
  const call = mock.mock.calls.find(([url]) => (url as string).startsWith(ES_SEARCH));
  const [url, init] = call as unknown as [string, RequestInit];
  assert.equal(url, ES_SEARCH);
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
  assert.equal(result.reasonCode, 'NO_SCENE');
});

test('slow STAC server gives timeout with TIMEOUT, HTTP 429 gives RATE_LIMIT', async () => {
  vi.stubGlobal('fetch', (_url: unknown, init?: { signal?: AbortSignal }) =>
    Promise.reject(init?.signal?.reason ?? new DOMException('timeout', 'TimeoutError')),
  );
  const controller = new AbortController();
  controller.abort(new DOMException('budget', 'TimeoutError'));
  const timedOut = await fetchSentinel2Scenes(parcel, '2026-06-10', controller.signal, {
    cache: memoryCache(),
  });
  assert.equal(timedOut.status, 'timeout');
  assert.equal(timedOut.reasonCode, 'TIMEOUT');
  vi.stubGlobal('fetch', async () => new Response('{}', { status: 429 }));
  const limited = await fetchSentinel2Scenes(parcel, '2026-06-10', undefined, {
    cache: memoryCache(),
  });
  assert.equal(limited.status, 'error');
  assert.equal(limited.reasonCode, 'RATE_LIMIT');
});

test('date before the archive gives missing without a request', async () => {
  const mock = mockFetch(fixture);
  const result = await fetchSentinel2Scenes(parcel, '2016-10-31', undefined, {
    cache: memoryCache(),
  });
  assert.equal(result.status, 'missing');
  assert.equal(result.message, 'Archiwum Sentinel-2 L2A obejmuje daty od listopada 2016');
  assert.equal(result.reasonCode, 'NO_SCENE');
  assert.equal(mock.mock.calls.length, 0);
});
