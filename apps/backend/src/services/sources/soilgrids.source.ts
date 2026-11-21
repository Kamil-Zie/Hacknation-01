// T-013 API-004 DM-002 SoilGrids 2.0 (ISRIC) source: WCS GeoTIFF in Homolosine -> 5 soil layers (sand, clay, silt, SOC in %)
import { fromArrayBuffer } from 'geotiff';

import type { SoilLayer } from '@/services/engine/soil';
import type { SourceCacheStore } from '@/services/sources/cache.service';
import { HttpStatusError, runSource } from '@/services/sources/runSource';
import type { FetcherResult } from '@/services/sources/runSource';
import type { SourceResult } from '@/services/sources/types';

const WCS_URL = 'https://maps.isric.org/mapserv';
const DATA_PERIOD = 'SoilGrids 2.0';
const PROPERTIES = ['sand', 'clay', 'soc'] as const;
const DEPTHS = [
  { topCm: 0, bottomCm: 5 },
  { topCm: 5, bottomCm: 15 },
  { topCm: 15, bottomCm: 30 },
  { topCm: 30, bottomCm: 60 },
  { topCm: 60, bottomCm: 100 },
];
const WINDOW_M = 250;
const CONCURRENCY = 5;
const KEY_STEP_DEG = 0.0025;
// 15 requests in 3 waves of 5; ISRIC cold requests take up to ~5 s (measured), so the catalog 8 s is too tight.
const TIMEOUT_MS = 20000;
const ATTEMPT_TIMEOUT_MS = 12000;
// ISRIC units: sand/clay g/kg (/10 = %), soc dg/kg (/100 = %). Zero means no data (built-up, no declared nodata).
const DIVISOR = { sand: 10, clay: 10, soc: 100 } as const;

type Property = (typeof PROPERTIES)[number];

// DM-002 soil layer plus silt (100 - sand - clay).
export type SoilGridsLayer = SoilLayer & { siltPct: number | null };

// Interrupted Goode Homolosine (EPSG:152160, +proj=igh), unsupported by proj4. Sphere of WGS84 radius.
const EARTH_RADIUS_M = 6378137;
const SINU_MOLL_LIMIT_RAD = 0.710987989993; // 40°44'11.8"
const MOLL_Y_CORRECTION = 0.0528035274542;

function centralMeridianDeg(latDeg: number, lonDeg: number): number {
  if (latDeg >= 0) return lonDeg < -40 ? -100 : 30;
  if (lonDeg < -100) return -160;
  if (lonDeg < -20) return -60;
  return lonDeg < 80 ? 20 : 140;
}

export function projectToHomolosine(lat: number, lon: number): { x: number; y: number } {
  const phi = (lat * Math.PI) / 180;
  const cm = centralMeridianDeg(lat, lon);
  const lambda = ((lon - cm) * Math.PI) / 180;
  let x: number;
  let y: number;
  if (Math.abs(phi) <= SINU_MOLL_LIMIT_RAD) {
    x = lambda * Math.cos(phi);
    y = phi;
  } else {
    let theta = phi;
    for (let i = 0; i < 50; i += 1) {
      const delta =
        (2 * theta + Math.sin(2 * theta) - Math.PI * Math.sin(phi)) / (2 + 2 * Math.cos(2 * theta));
      theta -= delta;
      if (Math.abs(delta) < 1e-12) break;
    }
    x = ((2 * Math.SQRT2) / Math.PI) * lambda * Math.cos(theta);
    y = Math.SQRT2 * Math.sin(theta) - (phi >= 0 ? MOLL_Y_CORRECTION : -MOLL_Y_CORRECTION);
  }
  return { x: EARTH_RADIUS_M * (x + (cm * Math.PI) / 180), y: EARTH_RADIUS_M * y };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

// Raw value of the pixel containing (x, y). If it is no-data (0), falls back to the median of the
// valid pixels in the ±250 m window (ADR-006 update: skip zeros, widen window). Null when none is valid.
export async function readSoilGridsPixel(
  tiff: ArrayBuffer,
  x: number,
  y: number,
): Promise<number | null> {
  const image = await (await fromArrayBuffer(tiff)).getImage();
  const [originX, originY] = image.getOrigin();
  const [resX, resY] = image.getResolution();
  const noData = image.getGDALNoData();
  const width = image.getWidth();
  const height = image.getHeight();
  const raster = (await image.readRasters())[0] as ArrayLike<number>;

  const col = Math.min(width - 1, Math.max(0, Math.floor((x - originX!) / resX!)));
  const row = Math.min(height - 1, Math.max(0, Math.floor((y - originY!) / resY!)));
  const isValid = (value: number) => value !== 0 && value !== noData && value > 0 && value < 32767;

  const center = raster[row * width + col]!;
  if (isValid(center)) return center;
  const valid = Array.from(raster).filter(isValid);
  return valid.length ? median(valid) : null;
}

async function fetchPixel(
  property: Property,
  depth: (typeof DEPTHS)[number],
  point: { x: number; y: number },
  signal: AbortSignal,
): Promise<number | null> {
  const query = new URLSearchParams({
    map: `/map/${property}.map`,
    SERVICE: 'WCS',
    VERSION: '2.0.1',
    REQUEST: 'GetCoverage',
    COVERAGEID: `${property}_${depth.topCm}-${depth.bottomCm}cm_mean`,
    FORMAT: 'image/tiff',
  });
  query.append('SUBSET', `X(${Math.round(point.x - WINDOW_M)},${Math.round(point.x + WINDOW_M)})`);
  query.append('SUBSET', `Y(${Math.round(point.y - WINDOW_M)},${Math.round(point.y + WINDOW_M)})`);
  query.append('SUBSETTINGCRS', 'http://www.opengis.net/def/crs/EPSG/0/152160');

  const response = await fetch(`${WCS_URL}?${query.toString()}`, { signal });
  if (!response.ok) throw new HttpStatusError(response.status);
  return readSoilGridsPixel(await response.arrayBuffer(), point.x, point.y);
}

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function toPct(raw: number | null, property: Property): number | null {
  return raw === null ? null : Math.round((raw / DIVISOR[property]) * 100) / 100;
}

// Pure mapping of raw values (per depth: sand, clay, soc) to layers; null when no layer has sand and clay.
export function buildSoilLayers(
  raw: Array<Record<Property, number | null>>,
): SoilGridsLayer[] | null {
  const layers = DEPTHS.map((depth, index) => {
    const values = raw[index]!;
    const sandPct = toPct(values.sand, 'sand');
    const clayPct = toPct(values.clay, 'clay');
    const siltPct =
      sandPct === null || clayPct === null
        ? null
        : Math.round(Math.max(0, 100 - sandPct - clayPct) * 100) / 100;
    return { ...depth, sandPct, clayPct, siltPct, socPct: toPct(values.soc, 'soc') };
  });
  return layers.some((layer) => layer.sandPct !== null && layer.clayPct !== null) ? layers : null;
}

async function fetchLayers(
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<FetcherResult<SoilGridsLayer[]>> {
  const point = projectToHomolosine(lat, lon);
  const jobs = DEPTHS.flatMap((depth, depthIndex) =>
    PROPERTIES.map((property) => ({ depth, depthIndex, property })),
  );
  const pixels = await mapWithLimit(jobs, CONCURRENCY, (job) =>
    fetchPixel(job.property, job.depth, point, signal),
  );
  const raw = DEPTHS.map(
    () => ({ sand: null, clay: null, soc: null }) as Record<Property, number | null>,
  );
  jobs.forEach((job, index) => {
    raw[job.depthIndex]![job.property] = pixels[index]!;
  });
  const layers = buildSoilLayers(raw);
  return layers ? { data: layers, dataPeriod: DATA_PERIOD } : null;
}

function roundToStep(value: number): number {
  return Math.round(value / KEY_STEP_DEG) * KEY_STEP_DEG;
}

// Cache key and request use the centroid rounded to 0.0025° (ADR-006), so equal keys always mean equal data.
export function fetchSoilGrids(
  lat: number,
  lon: number,
  signal?: AbortSignal,
  deps?: { cache?: SourceCacheStore },
): Promise<SourceResult<SoilGridsLayer[]>> {
  const [latKey, lonKey] = [roundToStep(lat), roundToStep(lon)];
  return runSource({
    sourceId: 'soilgrids',
    key: `soilgrids:${latKey.toFixed(4)},${lonKey.toFixed(4)}`,
    fetcher: (s) => fetchLayers(latKey, lonKey, s),
    timeoutMs: TIMEOUT_MS,
    attemptTimeoutMs: ATTEMPT_TIMEOUT_MS,
    signal,
    cache: deps?.cache,
  });
}
