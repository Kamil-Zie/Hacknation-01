// T-028 DM-014 Sentinel-2 NDVI/NDMI tests: small saved COG windows of the demo parcel (no network)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { fromArrayBuffer } from 'geotiff';
import { test } from 'vitest';

import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';
import type { Sentinel2Scene } from '@/services/sources/sentinel2.source';
import { computeSceneIndices, fetchSatellite } from '@/services/sources/sentinel2Indices';
import type { OpenTiff } from '@/services/sources/sentinel2Indices';
import { parseUldkResponse } from '@/services/sources/uldk.source';
import type { SourceResult } from '@/services/sources/types';

const fixtures = join(__dirname, '__fixtures__');
const parcelData = parseUldkResponse(
  readFileSync(join(fixtures, 'uldk-061409_2.0009.612.txt'), 'utf8'),
)!;
const parcel = {
  id: parcelData.id,
  geometry: parcelData.geometry as { type: 'Polygon'; coordinates: unknown },
};

function load(name: string): ArrayBuffer {
  const file = readFileSync(join(fixtures, name));
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer;
}

type Bands = Record<string, ArrayBuffer>;

// Real windows of S2B_34UEB_20260523 (clear over the parcel) and the cloudy SCL of S2A_34UEB_20260609.
const clear: Bands = {
  B04: load('s2-B04.tif'),
  B08: load('s2-B08.tif'),
  B8A: load('s2-B8A.tif'),
  B11: load('s2-B11.tif'),
  SCL: load('s2-SCL.tif'),
};
const cloudyScl = load('s2-cloudy-SCL.tif');

// Minimal uncompressed little-endian GeoTIFF (geotiff.js writes only 8-bit): one band, 8 or 16 bit.
function encodeTiff(
  values: ArrayLike<number>,
  size: { width: number; height: number; bits: 8 | 16 },
  origin: { x: number; y: number; pixel: number },
): ArrayBuffer {
  const { width, height, bits } = size;
  const entryCount = 12;
  const scaleOffset = 8 + 2 + entryCount * 12 + 4;
  const tiepointOffset = scaleOffset + 24;
  const dataOffset = tiepointOffset + 48;
  const dataBytes = width * height * (bits / 8);
  const buffer = new ArrayBuffer(dataOffset + dataBytes);
  const view = new DataView(buffer);
  view.setUint16(0, 0x4949, true);
  view.setUint16(2, 42, true);
  view.setUint32(4, 8, true);
  view.setUint16(8, entryCount, true);
  let position = 10;
  const SHORT = 3;
  const LONG = 4;
  const DOUBLE = 12;
  const entry = (tag: number, type: number, count: number, value: number) => {
    view.setUint16(position, tag, true);
    view.setUint16(position + 2, type, true);
    view.setUint32(position + 4, count, true);
    if (type === SHORT) view.setUint16(position + 8, value, true);
    else view.setUint32(position + 8, value, true);
    position += 12;
  };
  entry(256, LONG, 1, width);
  entry(257, LONG, 1, height);
  entry(258, SHORT, 1, bits);
  entry(259, SHORT, 1, 1);
  entry(262, SHORT, 1, 1);
  entry(273, LONG, 1, dataOffset);
  entry(277, SHORT, 1, 1);
  entry(278, LONG, 1, height);
  entry(279, LONG, 1, dataBytes);
  entry(339, SHORT, 1, 1);
  entry(33550, DOUBLE, 3, scaleOffset);
  entry(33922, DOUBLE, 6, tiepointOffset);
  [origin.pixel, origin.pixel, 0].forEach((v, i) => view.setFloat64(scaleOffset + i * 8, v, true));
  [0, 0, 0, origin.x, origin.y, 0].forEach((v, i) =>
    view.setFloat64(tiepointOffset + i * 8, v, true),
  );
  for (let i = 0; i < width * height; i += 1) {
    if (bits === 16) view.setUint16(dataOffset + i * 2, values[i]!, true);
    else view.setUint8(dataOffset + i, values[i]!);
  }
  return buffer;
}

// Same georeferencing as a fixture, values from fill(index).
async function synthetic(
  source: ArrayBuffer,
  fill: (index: number) => number,
  bits: 8 | 16,
): Promise<ArrayBuffer> {
  const image = await (await fromArrayBuffer(source)).getImage();
  const [width, height] = [image.getWidth(), image.getHeight()];
  const [x, y] = image.getOrigin() as [number, number];
  const pixel = Math.abs(image.getResolution()[0] as number);
  const values = Array.from({ length: width * height }, (_, index) => fill(index));
  return encodeTiff(values, { width, height, bits }, { x, y, pixel });
}

function opener(files: Record<string, ArrayBuffer>): OpenTiff {
  return async (href) => {
    const buffer = files[href];
    if (!buffer) throw new Error(`no fixture for ${href}`);
    return fromArrayBuffer(buffer);
  };
}

function sceneOf(id: string, date: string, cloudCover = 20): Sentinel2Scene {
  const band = (name: string) => ({ href: `${id}/${name}`, scale: 0.0001, offset: -0.1 });
  return {
    id,
    date,
    cloudCover,
    epsg: 32634,
    assets: {
      red: band('B04'),
      nir: band('B08'),
      nir08: band('B8A'),
      swir16: band('B11'),
      scl: { href: `${id}/SCL` },
    },
    thumbnailUrl: `https://example.test/${id}.jpg`,
  };
}

function filesFor(id: string, bands: Bands): Record<string, ArrayBuffer> {
  return Object.fromEntries(Object.entries(bands).map(([name, data]) => [`${id}/${name}`, data]));
}

function memoryCache(): SourceCacheStore {
  const store = new Map<string, CachedEntry>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, _sourceId, payload, _ttlMs, dataPeriod) => {
      store.set(key, { payload, dataPeriod, fetchedAt: new Date() });
    },
  };
}

function scenesResult(scenes: Sentinel2Scene[]) {
  return async (): Promise<SourceResult<Sentinel2Scene[]>> => ({
    sourceId: 'sentinel2',
    status: 'ok',
    data: scenes,
    message: null,
    fetchedAt: new Date(),
    dataPeriod: scenes[0]?.date ?? null,
    durationMs: 1,
  });
}

test('computeSceneIndices: real window gives NDVI/NDMI in -1..1 over the parcel pixels only', async () => {
  const open = opener(filesFor('clear', clear));
  const outcome = await computeSceneIndices(
    sceneOf('clear', '2026-05-23'),
    parcel.geometry,
    undefined,
    {
      open,
    },
  );
  const indices = outcome.indices!;
  assert.equal(outcome.reason, null);
  assert.ok(indices.ndvi! >= -1 && indices.ndvi! <= 1);
  assert.ok(indices.ndmi! >= -1 && indices.ndmi! <= 1);
  // Median per ADR-007 §5 (the mean was 0.663 / 0.176, pulled up by a few dark pixels).
  assert.ok(Math.abs(indices.ndvi! - 0.577) < 0.002);
  assert.ok(Math.abs(indices.ndmi! - 0.168) < 0.002);
  assert.equal(indices.validPixelFraction, 1);
  // Window is 34 x 17 = 578 px of 10 m; only the thin diagonal parcel (~0.56 ha) counts.
  assert.equal(indices.totalPixels, 56);
  assert.equal(indices.validPixels, 56);
});

test('computeSceneIndices: SCL classes 4 and 5 are valid, cloud classes are masked', async () => {
  const scene = sceneOf('masked', '2026-05-23');
  const run = async (sclClass: (index: number) => number) => {
    const scl = await synthetic(clear.SCL!, sclClass, 8);
    return computeSceneIndices(scene, parcel.geometry, undefined, {
      open: opener(filesFor('masked', { ...clear, SCL: scl })),
    });
  };
  assert.equal((await run(() => 5)).indices!.validPixelFraction, 1);
  const masked = await run(() => 9);
  assert.equal(masked.indices!.validPixelFraction, 0);
  assert.equal(masked.indices!.ndvi, null);
  const half = (await run((index) => (index % 2 === 0 ? 4 : 8))).indices!;
  assert.ok(half.validPixelFraction > 0.3 && half.validPixelFraction < 0.7);
});

test('computeSceneIndices: reflectance scale and offset applied (synthetic known values)', async () => {
  const bands: Bands = {
    B04: await synthetic(clear.B04!, () => 1500, 16),
    B08: await synthetic(clear.B08!, () => 4000, 16),
    B8A: await synthetic(clear.B8A!, () => 4000, 16),
    B11: await synthetic(clear.B11!, () => 3000, 16),
    SCL: await synthetic(clear.SCL!, () => 4, 8),
  };
  const outcome = await computeSceneIndices(
    sceneOf('known', '2026-05-23'),
    parcel.geometry,
    undefined,
    {
      open: opener(filesFor('known', bands)),
    },
  );
  // red 0.05, nir 0.30 -> 0.714; nir08 0.30, swir 0.20 -> 0.2
  assert.equal(outcome.indices!.ndvi, 0.714);
  assert.equal(outcome.indices!.ndmi, 0.2);
});

test('computeSceneIndices: fewer than 4 pixels -> small_parcel instead of a value', async () => {
  const [lon, lat] = (parcel.geometry.coordinates as number[][][])[0]![1]!;
  const tiny = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [lon, lat],
        [lon + 0.00006, lat],
        [lon + 0.00006, lat + 0.00004],
        [lon, lat + 0.00004],
        [lon, lat],
      ],
    ],
  };
  const outcome = await computeSceneIndices(sceneOf('clear', '2026-05-23'), tiny, undefined, {
    open: opener(filesFor('clear', clear)),
  });
  assert.equal(outcome.indices, null);
  assert.equal(outcome.reason, 'small_parcel');
});

test('computeSceneIndices: real cloudy SCL (32% valid) stops before the heavy bands', async () => {
  const outcome = await computeSceneIndices(
    sceneOf('cloudy', '2026-06-09'),
    parcel.geometry,
    undefined,
    {
      open: opener({ 'cloudy/SCL': cloudyScl }),
    },
  );
  assert.equal(outcome.indices!.validPixelFraction, 0.321);
  assert.equal(outcome.indices!.ndvi, null);
});

test('computeSceneIndices: ndviOnly and a cut NDMI read give NDVI with a Plan B note', async () => {
  const open = opener(filesFor('clear', clear));
  const only = await computeSceneIndices(
    sceneOf('clear', '2026-05-23'),
    parcel.geometry,
    undefined,
    {
      open,
      ndviOnly: true,
    },
  );
  assert.equal(only.indices!.ndmi, null);
  assert.ok(only.indices!.ndvi !== null);
  assert.match(only.indices!.notes[0]!, /Plan B/);

  const hanging: OpenTiff = (href, signal) =>
    /B8A|B11/.test(href)
      ? new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
      : open(href, signal);
  const cut = await computeSceneIndices(
    sceneOf('clear', '2026-05-23'),
    parcel.geometry,
    undefined,
    {
      open: hanging,
      ndmiDeadlineAt: Date.now() + 50,
    },
  );
  assert.equal(cut.indices!.ndmi, null);
  assert.ok(cut.indices!.ndvi !== null);
  assert.match(cut.indices!.notes[0]!, /Plan B/);
});

test('fetchSatellite: returns DM-014 with the assessment for the crop, skipping the cloudy scene', async () => {
  const files = {
    ...filesFor('cloudy', { SCL: cloudyScl }),
    ...filesFor('clear', clear),
  };
  const result = await fetchSatellite(parcel, '2026-05-25', 'winter_wheat', undefined, {
    open: opener(files),
    cache: memoryCache(),
    fetchScenes: scenesResult([
      sceneOf('cloudy', '2026-05-24', 55),
      sceneOf('clear', '2026-05-23', 29),
    ]),
  });
  assert.equal(result.status, 'ok');
  assert.equal(result.dataPeriod, '2026-05-23');
  const data = result.data!;
  assert.equal(data.sceneId, 'clear');
  assert.equal(data.ageDays, 2);
  assert.equal(data.validPixelFraction, 1);
  assert.ok(data.thumbnailUrl);
  // Winter wheat in May: NDVI 0.68-0.92, NDMI 0.18-0.42; measured 0.663 and 0.176.
  assert.equal(data.ndviAssessment, 'below');
  assert.equal(data.ndmiAssessment, 'below');
  assert.deepEqual(data.expected, { ndviMin: 0.68, ndviMax: 0.92, ndmiMin: 0.18, ndmiMax: 0.42 });
});

test('fetchSatellite: three scenes under 60% valid -> missing with date and cloud cover of the last', async () => {
  const files = {
    ...filesFor('a', { SCL: cloudyScl }),
    ...filesFor('b', { SCL: cloudyScl }),
    ...filesFor('c', { SCL: cloudyScl }),
    ...filesFor('d', clear),
  };
  const result = await fetchSatellite(parcel, '2026-06-10', 'winter_wheat', undefined, {
    open: opener(files),
    cache: memoryCache(),
    fetchScenes: scenesResult([
      sceneOf('a', '2026-06-09', 35),
      sceneOf('b', '2026-06-08', 40),
      sceneOf('c', '2026-06-07', 61),
      sceneOf('d', '2026-05-23', 29),
    ]),
  });
  assert.equal(result.status, 'missing');
  assert.equal(result.data, null);
  assert.match(result.message!, /2026-06-07/);
  assert.match(result.message!, /61%/);
});

test('fetchSatellite: tiny parcel -> missing with a message, no value', async () => {
  const [lon, lat] = (parcel.geometry.coordinates as number[][][])[0]![1]!;
  const tiny = {
    id: 'tiny',
    geometry: {
      type: 'Polygon' as const,
      coordinates: [
        [
          [lon, lat],
          [lon + 0.00006, lat],
          [lon + 0.00006, lat + 0.00004],
          [lon, lat + 0.00004],
          [lon, lat],
        ],
      ],
    },
  };
  const result = await fetchSatellite(tiny, '2026-05-25', 'winter_wheat', undefined, {
    open: opener(filesFor('clear', clear)),
    cache: memoryCache(),
    fetchScenes: scenesResult([sceneOf('clear', '2026-05-23')]),
  });
  assert.equal(result.status, 'missing');
  assert.match(result.message!, /zbyt mała/);
});

test('fetchSatellite: unknown crop is an error and does not touch the network', async () => {
  const result = await fetchSatellite(parcel, '2026-05-25', 'quinoa');
  assert.equal(result.status, 'error');
});
