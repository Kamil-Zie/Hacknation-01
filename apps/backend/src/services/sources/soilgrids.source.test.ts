// T-013 SoilGrids parser, units, no-data and cache tests on real GeoTIFF fixtures (fetch mocked, no network)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { test } from 'vitest';

import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';
import {
  buildSoilLayers,
  fetchSoilGrids,
  projectToHomolosine,
  readSoilGridsPixel,
} from '@/services/sources/soilgrids.source';

const fixture = (name: string) => {
  const buffer = readFileSync(join(__dirname, '__fixtures__', name));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
};

// Demo parcel centroid (Bronowice) in EPSG:152160, as used to request the fixtures.
const DEMO = projectToHomolosine(51.439565, 21.928256);

function memoryCache(): SourceCacheStore {
  const store = new Map<string, CachedEntry>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, _sourceId, payload, _ttlMs, dataPeriod) => {
      store.set(key, { payload, dataPeriod, fetchedAt: new Date() });
    },
  };
}

function mockFetch(pick: (url: string) => ArrayBuffer) {
  const original = globalThis.fetch;
  const state = { calls: 0 };
  globalThis.fetch = (async (input: string | URL | Request) => {
    state.calls += 1;
    return new Response(pick(String(input)), { status: 200 });
  }) as typeof fetch;
  return { state, restore: () => (globalThis.fetch = original) };
}

test('Homolosine projection matches known EPSG:152160 position of the demo parcel', () => {
  assert.ok(Math.abs(DEMO.x - 2737417) < 5);
  assert.ok(Math.abs(DEMO.y - 5686593) < 5);
});

test('reads the pixel containing the point from a real GeoTIFF (raw ISRIC units)', async () => {
  assert.equal(
    await readSoilGridsPixel(fixture('soilgrids-sand-0-5cm-bronowice.tif'), DEMO.x + 1, DEMO.y - 1),
    602,
  );
  assert.equal(
    await readSoilGridsPixel(fixture('soilgrids-clay-0-5cm-bronowice.tif'), DEMO.x + 1, DEMO.y - 1),
    130,
  );
  assert.equal(
    await readSoilGridsPixel(fixture('soilgrids-soc-0-5cm-bronowice.tif'), DEMO.x + 1, DEMO.y - 1),
    663,
  );
});

test('built-up area (all zeros) is no-data, not zero', async () => {
  assert.equal(
    await readSoilGridsPixel(fixture('soilgrids-sand-0-5cm-pulawy-builtup.tif'), 0, 0),
    null,
  );
});

test('converts units (g/kg -> %, dg/kg -> %) and computes silt', () => {
  const raw = Array.from({ length: 5 }, () => ({ sand: 605, clay: 129, soc: 150 }));
  const layers = buildSoilLayers(raw);
  assert.ok(layers);
  assert.equal(layers.length, 5);
  assert.deepEqual(layers[0], {
    topCm: 0,
    bottomCm: 5,
    sandPct: 60.5,
    clayPct: 12.9,
    siltPct: 26.6,
    socPct: 1.5,
  });
  assert.equal(layers[4]?.bottomCm, 100);
  assert.equal(buildSoilLayers(raw.map(() => ({ sand: null, clay: null, soc: 100 }))), null);
});

test('fetchSoilGrids returns 5 layers and the second call is cached by rounded centroid', async () => {
  const mock = mockFetch((url) => {
    const prop = /map=%2Fmap%2F(\w+)\.map/.exec(url)?.[1];
    return fixture(`soilgrids-${prop}-0-5cm-bronowice.tif`);
  });
  const cache = memoryCache();
  try {
    const first = await fetchSoilGrids(51.439565, 21.928256, undefined, { cache });
    const second = await fetchSoilGrids(51.4401, 21.9281, undefined, { cache });
    assert.equal(first.status, 'ok');
    assert.equal(first.dataPeriod, 'SoilGrids 2.0');
    assert.equal(first.data?.length, 5);
    assert.equal(first.data?.[0]?.sandPct, 61.6);
    assert.equal(second.status, 'cached');
    assert.equal(mock.state.calls, 15);
  } finally {
    mock.restore();
  }
});

test('no-data everywhere gives status missing with a message', async () => {
  const mock = mockFetch(() => fixture('soilgrids-sand-0-5cm-pulawy-builtup.tif'));
  try {
    const result = await fetchSoilGrids(51.4172, 21.9688, undefined, { cache: memoryCache() });
    assert.equal(result.status, 'missing');
    assert.equal(result.data, null);
    assert.ok(result.message);
  } finally {
    mock.restore();
  }
});
