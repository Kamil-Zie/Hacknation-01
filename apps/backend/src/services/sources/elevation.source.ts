// T-029 API-004 DM-008 elevation source: Open-Meteo (Copernicus DEM GLO-90) 5x5 grid -> min/max/mean, slope %, aspect, lowest point
import type { SourceCacheStore } from '@/services/sources/cache.service';
import { HttpStatusError, runSource } from '@/services/sources/runSource';
import type { FetcherResult } from '@/services/sources/runSource';
import type { SourceResult } from '@/services/sources/types';

const ELEVATION_URL = 'https://api.open-meteo.com/v1/elevation';
const GRID_SIZE = 5;
const BUFFER_M = 50;
const METERS_PER_DEGREE = 111320;
// Direction the terrain falls towards, 45 degree sectors clockwise from north.
const ASPECTS = [
  'północ',
  'północny wschód',
  'wschód',
  'południowy wschód',
  'południe',
  'południowy zachód',
  'zachód',
  'północny zachód',
];

export type ElevationParcel = {
  bbox: [number, number, number, number];
  centroid: { lat: number; lon: number };
  geometry: unknown;
};

export type GridPoint = { lat: number; lon: number; elevation: number };
export type PlanePoint = { x: number; y: number; z: number };

// Shape matches the terrain input of the engine (slopePct, aspect, elevationDiffM).
export type ElevationData = {
  minM: number;
  maxM: number;
  meanM: number;
  elevationDiffM: number;
  slopePct: number;
  aspect: string | null;
  lowestPoint: { lat: number; lon: number };
};

export type ElevationDeps = { cache?: SourceCacheStore };

// Grid over bbox expanded by 50 m; rows run south to north, columns west to east.
export function buildGrid(bbox: [number, number, number, number]): { lat: number; lon: number }[] {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  const midLat = (minLat + maxLat) / 2;
  const dLat = BUFFER_M / METERS_PER_DEGREE;
  const dLon = BUFFER_M / (METERS_PER_DEGREE * Math.cos((midLat * Math.PI) / 180));
  const [south, north, west, east] = [minLat - dLat, maxLat + dLat, minLon - dLon, maxLon + dLon];
  const points: { lat: number; lon: number }[] = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      points.push({
        lat: south + ((north - south) * row) / (GRID_SIZE - 1),
        lon: west + ((east - west) * col) / (GRID_SIZE - 1),
      });
    }
  }
  return points;
}

// Least squares plane z = a*x + b*y + c (x east, y north, metres).
export function fitPlane(points: PlanePoint[]): { a: number; b: number; c: number } {
  const n = points.length;
  if (n < 3) throw new Error('Too few points for a plane');
  const mx = points.reduce((s, p) => s + p.x, 0) / n;
  const my = points.reduce((s, p) => s + p.y, 0) / n;
  const mz = points.reduce((s, p) => s + p.z, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  let sxz = 0;
  let syz = 0;
  for (const p of points) {
    const [dx, dy, dz] = [p.x - mx, p.y - my, p.z - mz];
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
    sxz += dx * dz;
    syz += dy * dz;
  }
  const det = sxx * syy - sxy * sxy;
  if (Math.abs(det) < 1e-9) throw new Error('Degenerate point set');
  const a = (sxz * syy - syz * sxy) / det;
  const b = (syz * sxx - sxz * sxy) / det;
  return { a, b, c: mz - a * mx - b * my };
}

// Aspect is the direction of descent (opposite to the gradient); null when the plane is flat.
export function slopeFromPlane(plane: { a: number; b: number }): {
  slopePct: number;
  aspect: string | null;
} {
  const slopePct = 100 * Math.hypot(plane.a, plane.b);
  if (slopePct < 1e-6) return { slopePct, aspect: null };
  const bearing = (Math.atan2(-plane.a, -plane.b) * 180) / Math.PI;
  const sector = Math.round((((bearing % 360) + 360) % 360) / 45) % 8;
  return { slopePct, aspect: ASPECTS[sector] ?? null };
}

export function summarizeElevation(grid: GridPoint[]): ElevationData {
  if (grid.length < 3) throw new Error('Too few elevation points');
  const midLat = grid.reduce((s, p) => s + p.lat, 0) / grid.length;
  const midLon = grid.reduce((s, p) => s + p.lon, 0) / grid.length;
  const mPerLon = METERS_PER_DEGREE * Math.cos((midLat * Math.PI) / 180);
  const plane = fitPlane(
    grid.map((p) => ({
      x: (p.lon - midLon) * mPerLon,
      y: (p.lat - midLat) * METERS_PER_DEGREE,
      z: p.elevation,
    })),
  );
  const { slopePct, aspect } = slopeFromPlane(plane);
  const values = grid.map((p) => p.elevation);
  const minM = Math.min(...values);
  const maxM = Math.max(...values);
  const lowest = grid.reduce((best, p) => (p.elevation < best.elevation ? p : best));
  return {
    minM,
    maxM,
    meanM: values.reduce((s, v) => s + v, 0) / values.length,
    elevationDiffM: maxM - minM,
    slopePct,
    aspect,
    lowestPoint: { lat: lowest.lat, lon: lowest.lon },
  };
}

// Open-Meteo returns { elevation: number[] } in request order.
export function parseElevationResponse(body: unknown, expected: number): number[] {
  const values = (body as { elevation?: unknown } | null)?.elevation;
  if (
    !Array.isArray(values) ||
    values.length !== expected ||
    !values.every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    throw new Error('Malformed elevation response');
  }
  return values as number[];
}

async function fetchGrid(
  points: { lat: number; lon: number }[],
  signal: AbortSignal,
): Promise<FetcherResult<ElevationData>> {
  const query = new URLSearchParams({
    latitude: points.map((p) => p.lat.toFixed(6)).join(','),
    longitude: points.map((p) => p.lon.toFixed(6)).join(','),
  });
  // Commas stay literal: Open-Meteo expects comma separated lists.
  const response = await fetch(`${ELEVATION_URL}?${query.toString().replace(/%2C/g, ',')}`, {
    signal,
  });
  if (!response.ok) throw new HttpStatusError(response.status);
  const elevations = parseElevationResponse(await response.json(), points.length);
  const grid = points.map((p, i) => ({ ...p, elevation: elevations[i] as number }));
  return { data: summarizeElevation(grid) };
}

export function fetchElevation(
  parcel: ElevationParcel,
  signal?: AbortSignal,
  deps: ElevationDeps = {},
): Promise<SourceResult<ElevationData>> {
  const points = buildGrid(parcel.bbox);
  const key = `elevation:${parcel.bbox.map((v) => v.toFixed(4)).join(',')}`;
  return runSource({
    sourceId: 'elevation',
    key,
    fetcher: (s) => fetchGrid(points, s),
    signal,
    cache: deps.cache,
  });
}
