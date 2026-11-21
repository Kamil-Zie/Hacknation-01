// T-028 DM-014 Sentinel-2 L2A NDVI/NDMI from COG windows (geotiff.js, SCL mask) -> SatelliteObservation
import { booleanPointInPolygon } from '@turf/turf';
import { fromCustomClient } from 'geotiff';
import type { GeoTIFF } from 'geotiff';
import type { MultiPolygon, Polygon } from 'geojson';
import proj4 from 'proj4';

import { getCrop } from '@/services/engine/crops';
import { assessSatellite } from '@/services/engine/satellite';
import type { SatelliteObservation } from '@/services/engine/satellite';
import { mongoSourceCache } from '@/services/sources/cache.service';
import type { SourceCacheStore } from '@/services/sources/cache.service';
import { runSource } from '@/services/sources/runSource';
import type { ReasonCode, SourceResult, SourceStatusValue } from '@/services/sources/types';
import { SHORT_TTL_MS } from '@/services/sources/catalog';
import { fetchSentinel2Scenes } from '@/services/sources/sentinel2.source';
import type {
  Sentinel2Deps,
  Sentinel2Parcel,
  Sentinel2Scene,
} from '@/services/sources/sentinel2.source';
import { logger } from '@/utils/logger';

const MIN_PIXELS = 4;
const MIN_VALID_FRACTION = 0.6;
const MAX_SCENE_ATTEMPTS = 3;
// Plan B (ADR-006): past this point of the 15 s budget only NDVI is read (red, nir, SCL; no NDMI bands).
const NDVI_ONLY_AFTER_MS = 10000;
// Soft deadline for the optional NDMI bands, counted from the start of the source (15 s budget).
const NDMI_DEADLINE_MS = 12000;
const RANGE_CHUNK_BYTES = 65536;
const WINDOW_MARGIN_M = 20;
const SCL_VALID = new Set([4, 5]);
const DAY_MS = 24 * 60 * 60 * 1000;
const FRESH_DAYS = 7;
const NOTE_NDVI_ONLY = 'Plan B: budżet czasu na odczyt zdjęcia wyczerpany, policzono tylko NDVI';
const NOTE_NDMI_FAILED = 'Odczyt kanałów NDMI nie powiódł się, policzono tylko NDVI';

export type OpenTiff = (href: string, signal?: AbortSignal) => Promise<GeoTIFF>;

export type SceneIndices = {
  validPixelFraction: number;
  validPixels: number;
  totalPixels: number;
  ndvi: number | null;
  ndmi: number | null;
  notes: string[];
};

export type IndicesOutcome =
  | { indices: SceneIndices; reason: null }
  | { indices: null; reason: 'small_parcel' | 'no_coverage' };

export type IndicesOptions = {
  open?: OpenTiff;
  ndviOnly?: boolean;
  // Epoch ms after which the NDMI bands are abandoned (NDVI only).
  ndmiDeadlineAt?: number;
};

// Crop-independent part of DM-014 (cached); the assessment is added per crop.
export type SatelliteStats = {
  sceneId: string;
  sceneDate: string;
  ageDays: number;
  validPixelFraction: number;
  validPixels: number;
  ndvi: number | null;
  ndmi: number | null;
  thumbnailUrl: string | null;
  notes: string[];
};

export type SatelliteDeps = Sentinel2Deps & {
  open?: OpenTiff;
  fetchScenes?: typeof fetchSentinel2Scenes;
};

type Bounds = [number, number, number, number];
type Point = [number, number];
type Grid = {
  data: ArrayLike<number>;
  x0: number;
  y0: number;
  px: number;
  py: number;
  cols: number;
  rows: number;
  scale: number;
  offset: number;
};
type BandAsset = { href: string; scale?: number; offset?: number };

// The bucket (us-west-2) gives ~50 KB/s per connection from Europe (measured, T-028), so each range
// is split into parallel 64 KB requests; a COG tile of 1-1.6 MB then arrives ~4x faster.
type RangeResponse = {
  ok: boolean;
  status: number;
  getHeader: (name: string) => string | null;
  getData: () => Promise<ArrayBuffer>;
};

function rangeResponse(
  status: number,
  contentRange: string | null,
  body: ArrayBuffer,
): RangeResponse {
  return {
    ok: status >= 200 && status <= 299,
    status,
    getHeader: (name) => (name.toLowerCase() === 'content-range' ? contentRange : null),
    getData: async () => body,
  };
}

async function requestChunked(
  url: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<RangeResponse> {
  const range = /^bytes=(\d+)-(\d+)$/.exec(headers.Range ?? '');
  if (!range) throw new Error('Range header required');
  const [start, end] = [Number(range[1]), Number(range[2])];
  const parts: [number, number][] = [];
  for (let from = start; from <= end; from += RANGE_CHUNK_BYTES) {
    parts.push([from, Math.min(end, from + RANGE_CHUNK_BYTES - 1)]);
  }
  const responses = await Promise.all(
    parts.map(([from, to]) =>
      fetch(url, { headers: { ...headers, Range: `bytes=${from}-${to}` }, signal }),
    ),
  );
  // A chunk starting past the end of the file (416) is simply empty; the first chunk must succeed.
  const first = responses[0]!;
  if (!first.ok) return rangeResponse(first.status, null, new ArrayBuffer(0));
  const buffers = await Promise.all(
    responses.filter((response) => response.ok).map((response) => response.arrayBuffer()),
  );
  const body = new Uint8Array(buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0));
  let offset = 0;
  for (const buffer of buffers) {
    body.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  const total = /\/(\d+)$/.exec(first.headers.get('content-range') ?? '')?.[1] ?? '*';
  return rangeResponse(
    first.status,
    `bytes ${start}-${start + body.byteLength - 1}/${total}`,
    body.buffer as ArrayBuffer,
  );
}

const openRemote: OpenTiff = (href, signal) =>
  fromCustomClient(
    {
      request: (options?: { headers?: Record<string, string>; signal?: AbortSignal }) =>
        requestChunked(href, options?.headers ?? {}, options?.signal),
    } as unknown as Parameters<typeof fromCustomClient>[0],
    {},
    signal,
  );

function utmDefinition(epsg: number | null): string {
  if (epsg !== null && epsg >= 32601 && epsg <= 32660) {
    return `+proj=utm +zone=${epsg - 32600} +datum=WGS84 +units=m +no_defs`;
  }
  if (epsg !== null && epsg >= 32701 && epsg <= 32760) {
    return `+proj=utm +zone=${epsg - 32700} +south +datum=WGS84 +units=m +no_defs`;
  }
  throw new Error('Unsupported scene CRS');
}

function projectCoordinates(value: unknown, forward: (p: Point) => Point): unknown {
  const list = value as unknown[];
  return typeof list[0] === 'number'
    ? forward(list as Point)
    : list.map((item) => projectCoordinates(item, forward));
}

function collectBounds(value: unknown, bounds: Bounds): void {
  const list = value as unknown[];
  if (typeof list[0] === 'number') {
    const [x, y] = list as Point;
    bounds[0] = Math.min(bounds[0], x);
    bounds[1] = Math.min(bounds[1], y);
    bounds[2] = Math.max(bounds[2], x);
    bounds[3] = Math.max(bounds[3], y);
    return;
  }
  list.forEach((item) => collectBounds(item, bounds));
}

// Reads the window of one band covering `bounds` (scene CRS); null when the window is outside the image.
async function readGrid(
  open: OpenTiff,
  asset: BandAsset,
  bounds: Bounds,
  signal?: AbortSignal,
): Promise<Grid | null> {
  const image = await (await open(asset.href, signal)).getImage();
  const [originX, originY] = image.getOrigin() as [number, number];
  const [resX, resY] = image.getResolution() as [number, number];
  const [px, py] = [Math.abs(resX), Math.abs(resY)];
  const col0 = Math.max(0, Math.floor((bounds[0] - originX) / px));
  const col1 = Math.min(image.getWidth(), Math.ceil((bounds[2] - originX) / px));
  const row0 = Math.max(0, Math.floor((originY - bounds[3]) / py));
  const row1 = Math.min(image.getHeight(), Math.ceil((originY - bounds[1]) / py));
  if (col1 <= col0 || row1 <= row0) return null;
  const rasters = await image.readRasters({
    window: [col0, row0, col1, row1],
    samples: [0],
    signal,
  });
  return {
    data: rasters[0] as ArrayLike<number>,
    x0: originX + col0 * px,
    y0: originY - row0 * py,
    px,
    py,
    cols: col1 - col0,
    rows: row1 - row0,
    scale: asset.scale ?? 1,
    offset: asset.offset ?? 0,
  };
}

// Raw value of the pixel containing (x, y); 0 (no data) outside the window.
function sampleRaw(grid: Grid, x: number, y: number): number {
  const col = Math.floor((x - grid.x0) / grid.px);
  const row = Math.floor((grid.y0 - y) / grid.py);
  if (col < 0 || row < 0 || col >= grid.cols || row >= grid.rows) return 0;
  return grid.data[row * grid.cols + col] ?? 0;
}

function reflectance(grid: Grid, raw: number): number {
  // Clipped at 0: with offset -0.1 very dark pixels (shadow, dense canopy in red) come out slightly
  // negative, which would push the index above 1.
  return Math.max(0, raw * grid.scale + grid.offset);
}

// Pixel centres of the grid lying inside the polygon.
function centresInside(grid: Grid, polygon: Polygon | MultiPolygon): Point[] {
  const centres: Point[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const point: Point = [grid.x0 + (col + 0.5) * grid.px, grid.y0 - (row + 0.5) * grid.py];
      if (booleanPointInPolygon(point, polygon)) centres.push(point);
    }
  }
  return centres;
}

function isValidScl(scl: Grid, x: number, y: number): boolean {
  return SCL_VALID.has(sampleRaw(scl, x, y));
}

// Median (ADR-007 §5) of the normalized difference (a - b) / (a + b) over the valid pixels; null when none is valid.
// Field kept as `mean` so callers stay unchanged.
function meanIndex(
  centres: Point[],
  a: Grid,
  b: Grid,
  scl: Grid,
): { mean: number | null; valid: number } {
  const values: number[] = [];
  for (const [x, y] of centres) {
    const rawA = sampleRaw(a, x, y);
    const rawB = sampleRaw(b, x, y);
    if (!isValidScl(scl, x, y) || rawA <= 0 || rawB <= 0) continue;
    const [valueA, valueB] = [reflectance(a, rawA), reflectance(b, rawB)];
    if (valueA + valueB <= 0) continue;
    values.push((valueA - valueB) / (valueA + valueB));
  }
  if (!values.length) return { mean: null, valid: 0 };
  values.sort((x, y) => x - y);
  const mid = Math.floor(values.length / 2);
  const median = values.length % 2 ? values[mid]! : (values[mid - 1]! + values[mid]!) / 2;
  return { mean: median, valid: values.length };
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// NDVI (red/nir 10 m) and NDMI (nir08/swir16 20 m) mean over the SCL-valid (classes 4, 5) pixels whose
// centre lies in the parcel. validPixelFraction is counted on the 10 m grid.
export async function computeSceneIndices(
  scene: Sentinel2Scene,
  parcelGeometry: Sentinel2Parcel['geometry'],
  signal?: AbortSignal,
  options: IndicesOptions = {},
): Promise<IndicesOutcome> {
  const open = options.open ?? openRemote;
  const converter = proj4('EPSG:4326', utmDefinition(scene.epsg));
  const projected = {
    type: parcelGeometry.type,
    coordinates: projectCoordinates(parcelGeometry.coordinates, (p) => converter.forward(p)),
  } as Polygon | MultiPolygon;
  const bounds: Bounds = [Infinity, Infinity, -Infinity, -Infinity];
  collectBounds(projected.coordinates, bounds);
  const window: Bounds = [
    bounds[0] - WINDOW_MARGIN_M,
    bounds[1] - WINDOW_MARGIN_M,
    bounds[2] + WINDOW_MARGIN_M,
    bounds[3] + WINDOW_MARGIN_M,
  ];
  const { red, nir, nir08, swir16, scl } = scene.assets;
  const notes: string[] = [];

  // Stage 1: the small SCL tile only (tens of KB) decides whether the heavy bands are worth reading.
  const sclGrid = await readGrid(open, scl, window, signal);
  if (!sclGrid) return { indices: null, reason: 'no_coverage' };
  const fineGrid: Grid = {
    ...sclGrid,
    px: sclGrid.px / 2,
    py: sclGrid.py / 2,
    cols: sclGrid.cols * 2,
    rows: sclGrid.rows * 2,
  };
  const centres = centresInside(fineGrid, projected);
  if (centres.length < MIN_PIXELS) return { indices: null, reason: 'small_parcel' };
  const sclValid = centres.filter(([x, y]) => isValidScl(sclGrid, x, y)).length;
  if (sclValid / centres.length < MIN_VALID_FRACTION) {
    return {
      reason: null,
      indices: {
        validPixelFraction: round(sclValid / centres.length, 3),
        validPixels: sclValid,
        totalPixels: centres.length,
        ndvi: null,
        ndmi: null,
        notes,
      },
    };
  }

  // Stage 2: NDVI bands (red, nir 10 m) first, so the optional NDMI bands never compete for bandwidth.
  const [redGrid, nirGrid] = await Promise.all([
    readGrid(open, red, window, signal),
    readGrid(open, nir, window, signal),
  ]);
  if (!redGrid || !nirGrid) return { indices: null, reason: 'no_coverage' };
  const ndvi = meanIndex(centres, nirGrid, redGrid, sclGrid);

  // Stage 3: NDMI (nir08, swir16 20 m), cut at the soft deadline (Plan B: only NDVI, with a note).
  let ndmi: number | null = null;
  if (options.ndviOnly) {
    notes.push(NOTE_NDVI_ONLY);
  } else {
    const ndmiAbort = new AbortController();
    const ndmiSignal = signal ? AbortSignal.any([signal, ndmiAbort.signal]) : ndmiAbort.signal;
    const timer =
      options.ndmiDeadlineAt === undefined
        ? null
        : setTimeout(() => ndmiAbort.abort(), Math.max(0, options.ndmiDeadlineAt - Date.now()));
    try {
      const [nir08Grid, swirGrid] = await Promise.all([
        readGrid(open, nir08, window, ndmiSignal),
        readGrid(open, swir16, window, ndmiSignal),
      ]);
      if (nir08Grid && swirGrid) {
        ndmi = meanIndex(centresInside(swirGrid, projected), nir08Grid, swirGrid, sclGrid).mean;
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      notes.push(ndmiAbort.signal.aborted ? NOTE_NDVI_ONLY : NOTE_NDMI_FAILED);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return {
    reason: null,
    indices: {
      validPixelFraction: round(ndvi.valid / centres.length, 3),
      validPixels: ndvi.valid,
      totalPixels: centres.length,
      ndvi: ndvi.mean === null ? null : round(ndvi.mean, 3),
      ndmi: ndmi === null ? null : round(ndmi, 3),
      notes,
    },
  };
}

type Failure = { status: SourceStatusValue; message: string; reasonCode: ReasonCode | null };

function ageDays(sceneDate: string, analysisDate: string): number {
  return Math.round((Date.parse(analysisDate) - Date.parse(sceneDate)) / DAY_MS);
}

// Tries up to 3 newest scenes, skipping those with < 60% valid pixels.
async function findStats(
  parcel: Sentinel2Parcel,
  analysisDate: string,
  signal: AbortSignal,
  deps: SatelliteDeps,
): Promise<{ stats: SatelliteStats } | { failure: Failure }> {
  const startedAt = Date.now();
  const scenes = await (deps.fetchScenes ?? fetchSentinel2Scenes)(parcel, analysisDate, signal, {
    cache: deps.cache,
  });
  if (!scenes.data) {
    return {
      failure: {
        status: scenes.status,
        message: scenes.message ?? 'Brak scen Sentinel-2',
        reasonCode: scenes.reasonCode ?? null,
      },
    };
  }
  const candidates = scenes.data.slice(0, MAX_SCENE_ATTEMPTS);
  for (const scene of candidates) {
    const ndviOnly = Date.now() - startedAt > NDVI_ONLY_AFTER_MS;
    let outcome: IndicesOutcome;
    try {
      outcome = await computeSceneIndices(scene, parcel.geometry, signal, {
        open: deps.open,
        ndviOnly,
        ndmiDeadlineAt: startedAt + NDMI_DEADLINE_MS,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      logger.warn(
        `sentinel2 scene read failed: ${error instanceof Error ? error.name : 'unknown'}`,
      );
      continue;
    }
    if (outcome.reason === 'small_parcel') {
      return {
        failure: {
          status: 'missing',
          reasonCode: 'PARCEL_TOO_SMALL',
          message: `Działka zbyt mała na analizę satelitarną (mniej niż ${MIN_PIXELS} pikseli 10 m)`,
        },
      };
    }
    if (!outcome.indices || outcome.indices.validPixelFraction < MIN_VALID_FRACTION) continue;
    const { validPixelFraction, validPixels, ndvi, ndmi, notes } = outcome.indices;
    return {
      stats: {
        sceneId: scene.id,
        sceneDate: scene.date,
        ageDays: ageDays(scene.date, analysisDate),
        validPixelFraction,
        validPixels,
        ndvi,
        ndmi,
        thumbnailUrl: scene.thumbnailUrl,
        notes,
      },
    };
  }
  const last = candidates[candidates.length - 1]!;
  return {
    failure: {
      status: 'missing',
      reasonCode: 'CLOUD_COVER',
      message: `Brak sceny z co najmniej ${MIN_VALID_FRACTION * 100}% ważnych pikseli po ${candidates.length} próbach; ostatnia scena ${last.date}, zachmurzenie ${Math.round(last.cloudCover)}%`,
    },
  };
}

// DM-014 for the parcel and crop; statistics are cached per parcel and date (crop-independent).
export async function fetchSatellite(
  parcel: Sentinel2Parcel,
  analysisDate: string,
  cropCode: string,
  signal?: AbortSignal,
  deps: SatelliteDeps = {},
): Promise<SourceResult<SatelliteObservation>> {
  if (!getCrop(cropCode)) {
    return {
      sourceId: 'sentinel2',
      status: 'error',
      data: null,
      message: 'Nieznana uprawa',
      fetchedAt: null,
      dataPeriod: null,
      durationMs: 0,
    };
  }
  let failure: Failure | null = null;
  const isFresh = Date.now() - Date.parse(analysisDate) < FRESH_DAYS * DAY_MS;
  // Plan B results (NDVI only, NDMI null because of the time budget) are not cached, so a later
  // analysis can still read NDMI; v2 key drops NDVI-only entries cached before this rule (T-031).
  const baseCache = deps.cache ?? mongoSourceCache;
  const cache: SourceCacheStore = {
    get: baseCache.get,
    set: async (key, sourceId, payload, ttlMs, dataPeriod) => {
      if ((payload as SatelliteStats | null)?.ndmi === null) return;
      await baseCache.set(key, sourceId, payload, ttlMs, dataPeriod);
    },
  };
  const result = await runSource({
    sourceId: 'sentinel2',
    key: `sentinel2-stats:v2:${parcel.id}:${analysisDate}`,
    fetcher: async (s) => {
      const found = await findStats(parcel, analysisDate, s, deps);
      if ('failure' in found) {
        failure = found.failure;
        return null;
      }
      return { data: found.stats, dataPeriod: found.stats.sceneDate };
    },
    ttlMs: isFresh ? SHORT_TTL_MS.sentinel2 : undefined,
    retries: 0,
    signal,
    cache,
  });

  const { data: stats, ...rest } = result;
  if (!stats) {
    const reason = failure as Failure | null;
    return { ...rest, ...(reason ?? {}), data: null };
  }
  const { notes, ...observation } = stats;
  return {
    ...rest,
    message: notes.length ? notes.join('; ') : rest.message,
    data: { ...observation, ...assessSatellite(stats, cropCode, analysisDate) },
  };
}
