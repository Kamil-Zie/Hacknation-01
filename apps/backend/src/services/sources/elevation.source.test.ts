// T-029 elevation source tests: plane fit, aspect, 5x5 grid request, response parsing, error handling, cache (no network)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { test } from 'vitest';

import {
  buildGrid,
  fetchElevation,
  fitPlane,
  parseElevationResponse,
  slopeFromPlane,
  summarizeElevation,
} from '@/services/sources/elevation.source';
import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';

const BBOX: [number, number, number, number] = [
  21.9261325680634, 51.4390431788602, 21.9303777132866, 51.4400858659906,
];
const parcel = {
  bbox: BBOX,
  centroid: { lat: 51.4396, lon: 21.9282 },
  geometry: { type: 'Polygon', coordinates: [] },
};
const fixture = readFileSync(join(__dirname, '__fixtures__', 'elevation-bronowice.json'), 'utf8');

function memoryCache(): SourceCacheStore {
  const store = new Map<string, CachedEntry>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, _sourceId, payload, _ttlMs, dataPeriod) => {
      store.set(key, { payload, dataPeriod, fetchedAt: new Date() });
    },
  };
}

function planePoints(a: number, b: number) {
  const points = [];
  for (let x = -40; x <= 40; x += 20) {
    for (let y = -40; y <= 40; y += 20) points.push({ x, y, z: 100 + a * x + b * y });
  }
  return points;
}

test('fitPlane recovers a known slope within 0.1 p.p.', () => {
  const plane = fitPlane(planePoints(0.03, -0.04));
  const { slopePct } = slopeFromPlane(plane);
  assert.ok(Math.abs(slopePct - 5) < 0.1);
});

test('aspect is the direction of descent', () => {
  // Terrain rises to the north (b > 0) -> falls to the south.
  assert.equal(slopeFromPlane(fitPlane(planePoints(0, 0.05))).aspect, 'południe');
  // Terrain rises to the west (a < 0) -> falls to the east.
  assert.equal(slopeFromPlane(fitPlane(planePoints(-0.05, 0))).aspect, 'wschód');
  assert.equal(slopeFromPlane(fitPlane(planePoints(0.04, 0.04))).aspect, 'południowy zachód');
  assert.equal(slopeFromPlane({ a: 0, b: 0 }).aspect, null);
});

test('grid is 5x5 over bbox expanded by 50 m', () => {
  const grid = buildGrid(BBOX);
  assert.equal(grid.length, 25);
  const lats = grid.map((p) => p.lat);
  const lons = grid.map((p) => p.lon);
  assert.ok(Math.abs((BBOX[1] - Math.min(...lats)) * 111320 - 50) < 0.5);
  assert.ok(Math.abs((Math.max(...lats) - BBOX[3]) * 111320 - 50) < 0.5);
  assert.ok(Math.min(...lons) < BBOX[0] && Math.max(...lons) > BBOX[2]);
});

test('summarizeElevation on the plane gives stats and lowest point', () => {
  const grid = buildGrid(BBOX).map((p, i) => ({ ...p, elevation: 100 + (i % 5) }));
  const summary = summarizeElevation(grid);
  assert.equal(summary.minM, 100);
  assert.equal(summary.maxM, 104);
  assert.equal(summary.elevationDiffM, 4);
  assert.equal(summary.meanM, 102);
  assert.equal(summary.aspect, 'zachód');
  assert.equal(summary.lowestPoint.lon, grid[0]?.lon);
});

test('parseElevationResponse validates shape', () => {
  assert.equal(parseElevationResponse(JSON.parse(fixture), 25).length, 25);
  assert.throws(() => parseElevationResponse({ elevation: [1, 2] }, 25));
  assert.throws(() => parseElevationResponse({}, 25));
});

test('fetchElevation sends one request with 25 points and parses the fixture', async () => {
  const original = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (url: string) => {
    urls.push(String(url));
    return new Response(fixture, { status: 200 });
  }) as typeof fetch;
  try {
    const result = await fetchElevation(parcel, undefined, { cache: memoryCache() });
    assert.equal(result.status, 'ok');
    assert.equal(urls.length, 1);
    const query = new URL(urls[0] ?? '').searchParams;
    assert.equal(query.get('latitude')?.split(',').length, 25);
    assert.equal(query.get('longitude')?.split(',').length, 25);
    assert.equal(result.data?.minM, 118);
    assert.equal(result.data?.maxM, 120);
    assert.equal(result.data?.elevationDiffM, 2);
  } finally {
    globalThis.fetch = original;
  }
});

test('HTTP 429 gives an error status without throwing', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response('limit', { status: 429 })) as typeof fetch;
  try {
    const result = await fetchElevation(parcel, undefined, { cache: memoryCache() });
    assert.equal(result.status, 'error');
    assert.equal(result.data, null);
  } finally {
    globalThis.fetch = original;
  }
});

test('second call is served from cache', async () => {
  const cache = memoryCache();
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    return new Response(fixture, { status: 200 });
  }) as typeof fetch;
  try {
    await fetchElevation(parcel, undefined, { cache });
    const second = await fetchElevation(parcel, undefined, { cache });
    assert.equal(second.status, 'cached');
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});
