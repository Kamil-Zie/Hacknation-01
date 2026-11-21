// T-030 overpass source tests: OSM XML parser on a real fixture, distances on synthetic geometry, Overpass fallback, errors, cache (no network)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { test } from 'vitest';

import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';
import {
  bboxAround,
  fetchHydrology,
  parseOsmXml,
  summarizeHydrology,
} from '@/services/sources/overpass.source';
import type { WaterFeature } from '@/services/sources/overpass.source';
import { parseUldkResponse } from '@/services/sources/uldk.source';

const dir = join(__dirname, '__fixtures__');
const xml = readFileSync(join(dir, 'osm-map-bronowice.xml'), 'utf8');
const uldk = parseUldkResponse(readFileSync(join(dir, 'uldk-061409_2.0009.612.txt'), 'utf8'));
if (!uldk) throw new Error('ULDK fixture');
const bronowice = { centroid: { lat: 51.439565, lon: 21.928256 }, geometry: uldk.geometry };

function memoryCache(): SourceCacheStore {
  const store = new Map<string, CachedEntry>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, _sourceId, payload, _ttlMs, dataPeriod) => {
      store.set(key, { payload, dataPeriod, fetchedAt: new Date() });
    },
  };
}

// 1 degree of latitude = 111195 m in turf; square parcel around (0, 0), 0.001 deg wide.
const square = {
  centroid: { lat: 0, lon: 0 },
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [-0.0005, -0.0005],
        [0.0005, -0.0005],
        [0.0005, 0.0005],
        [-0.0005, 0.0005],
        [-0.0005, -0.0005],
      ],
    ],
  },
};

test('parses watercourses with names from the real OSM fixture', () => {
  const features = parseOsmXml(xml);
  assert.ok(features.some((f) => f.type === 'river' && f.name === 'Wisła'));
  assert.ok(features.some((f) => f.type === 'stream' && f.name === 'Klikawka'));
  assert.ok(features.some((f) => f.type === 'water'));
  assert.ok(features.every((f) => f.coords.length >= 2));
});

test('summarizes Bronowice from the fixture', () => {
  const data = summarizeHydrology(bronowice, parseOsmXml(xml));
  assert.equal(data.radiusM, 1000);
  assert.ok(data.counts.river + data.counts.stream + data.counts.ditch > 0);
  assert.ok(data.nearestDitchDistanceM !== null && data.nearestDitchDistanceM <= 1200);
  assert.ok(data.nearestDitchPoint);
  assert.ok(data.nearestWatercourseName);
});

test('distance from the parcel boundary on synthetic geometry', () => {
  // Ditch 0.002 deg east of the boundary at lon 0.0005 -> lon 0.0025, about 222 m.
  const ditch: WaterFeature = {
    type: 'ditch',
    name: 'Rów A',
    coords: [
      [0.0025, -0.001],
      [0.0025, 0.001],
    ],
  };
  const far: WaterFeature = {
    type: 'stream',
    name: 'Dalej',
    coords: [
      [0.006, -0.001],
      [0.006, 0.001],
    ],
  };
  const pond: WaterFeature = {
    type: 'water',
    name: null,
    coords: [
      [-0.004, -0.0005],
      [-0.003, -0.0005],
      [-0.003, 0.0005],
      [-0.004, 0.0005],
      [-0.004, -0.0005],
    ],
  };
  const data = summarizeHydrology(square, [far, ditch, pond]);
  assert.ok(Math.abs((data.nearestDitchDistanceM ?? 0) - 222) < 3);
  assert.equal(data.nearestWatercourseName, 'Rów A');
  assert.ok(Math.abs((data.nearestDitchPoint?.lon ?? 0) - 0.0025) < 1e-6);
  // Pond edge at lon -0.003, boundary at -0.0005: about 278 m.
  assert.ok(Math.abs((data.nearestReservoirDistanceM ?? 0) - 278) < 3);
  assert.equal(data.hasReservoirWithin1km, true);
  assert.equal(data.hasWetlandWithin1km, false);
  assert.equal(data.counts.ditch, 1);
});

test('objects farther than 1 km are not counted; zero objects is a valid summary', () => {
  const faraway: WaterFeature = {
    type: 'river',
    name: 'X',
    coords: [
      [0.05, 0],
      [0.05, 0.001],
    ],
  };
  const data = summarizeHydrology(square, [faraway]);
  assert.equal(data.nearestDitchDistanceM, null);
  assert.equal(data.hasReservoirWithin1km, false);
});

test('bboxAround is about 1 km each way', () => {
  const [minLon, minLat, maxLon, maxLat] = bboxAround({ lat: 51.439565, lon: 21.928256 });
  assert.ok(Math.abs((maxLat - minLat) * 111320 - 2000) < 1);
  assert.ok(maxLon > minLon);
});

const overpassJson = {
  elements: [
    {
      type: 'way',
      tags: { waterway: 'ditch', name: 'Rów B' },
      geometry: [
        { lat: 0, lon: 0.002 },
        { lat: 0.001, lon: 0.002 },
      ],
    },
  ],
};

test('falls back to Overpass when the OSM API fails', async () => {
  const calls: string[] = [];
  const stub = (async (url: string | URL | Request) => {
    calls.push(String(url));
    if (String(url).includes('openstreetmap.org')) return new Response('', { status: 509 });
    return new Response(JSON.stringify(overpassJson), { status: 200 });
  }) as typeof fetch;
  const result = await fetchHydrology(square, undefined, { cache: memoryCache(), fetch: stub });
  assert.equal(result.status, 'ok');
  assert.equal(result.data?.nearestWatercourseName, 'Rów B');
  assert.equal(calls.length, 2);
});

test('both sources failing returns error and does not throw', async () => {
  const stub = (async () => new Response('', { status: 500 })) as unknown as typeof fetch;
  const result = await fetchHydrology(square, undefined, { cache: memoryCache(), fetch: stub });
  assert.equal(result.status, 'error');
  assert.equal(result.data, null);
});

test('caches the processed summary, not the raw XML', async () => {
  const cache = memoryCache();
  let calls = 0;
  const stub = (async () => {
    calls += 1;
    return new Response(xml, { status: 200 });
  }) as unknown as typeof fetch;
  const first = await fetchHydrology(bronowice, undefined, { cache, fetch: stub });
  assert.equal(first.status, 'ok');
  const cached = await cache.get('overpass:51.4396,21.9283');
  assert.ok(cached);
  assert.ok(typeof cached.payload === 'object' && 'counts' in (cached.payload as object));
  const second = await fetchHydrology(bronowice, undefined, { cache, fetch: stub });
  assert.equal(second.status, 'cached');
  assert.equal(calls, 1);
});
