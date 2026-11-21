// T-030 API-004 DM-011 hydrology source (sourceId 'overpass'): OSM API 0.6 map call, Overpass as fallback -> water summary within 1 km
import { booleanIntersects, lineString, nearestPointOnLine, point, polygon } from '@turf/turf';
import type { Position } from 'geojson';

import type { SourceCacheStore } from '@/services/sources/cache.service';
import { HttpStatusError, runSource } from '@/services/sources/runSource';
import type { FetcherResult } from '@/services/sources/runSource';
import type { SourceResult } from '@/services/sources/types';

const OSM_MAP_URL = 'https://api.openstreetmap.org/api/0.6/map';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const USER_AGENT = 'Kropelka-Hackathon/1.0';
const RADIUS_M = 1000;
const METERS_PER_DEGREE = 111320;
// Whole source budget 12 s: the OSM API gets at most 6 s, the rest is left for the Overpass fallback.
const TIMEOUT_MS = 12000;
const OSM_ATTEMPT_MS = 6000;

const WATERCOURSES = ['river', 'stream', 'canal', 'ditch', 'drain'];
export type WaterType =
  'river' | 'stream' | 'canal' | 'ditch' | 'drain' | 'water' | 'reservoir' | 'wetland';

export type HydroParcel = {
  centroid: { lat: number; lon: number };
  geometry: { type: string; coordinates?: unknown };
};

export type WaterFeature = {
  type: WaterType;
  name: string | null;
  coords: Position[];
};

// Fields nearestDitchDistanceM, nearestDitchPoint and hasReservoirWithin1km match RecommendationsHydro.
export type HydroData = {
  radiusM: number;
  counts: Record<WaterType, number>;
  nearestDitchDistanceM: number | null;
  nearestDitchPoint: { lat: number; lon: number } | null;
  nearestDitchType: WaterType | null;
  nearestWatercourseName: string | null;
  nearestReservoirDistanceM: number | null;
  hasReservoirWithin1km: boolean;
  hasWetlandWithin1km: boolean;
};

export type HydroDeps = { cache?: SourceCacheStore; fetch?: typeof fetch };

export function bboxAround(c: { lat: number; lon: number }, radiusM = RADIUS_M) {
  const dLat = radiusM / METERS_PER_DEGREE;
  const dLon = dLat / Math.cos((c.lat * Math.PI) / 180);
  return [c.lon - dLon, c.lat - dLat, c.lon + dLon, c.lat + dLat];
}

function classify(tags: Map<string, string>): WaterType | null {
  const waterway = tags.get('waterway');
  if (waterway && WATERCOURSES.includes(waterway)) return waterway as WaterType;
  if (tags.get('landuse') === 'reservoir' || tags.get('water') === 'reservoir') return 'reservoir';
  if (tags.get('natural') === 'wetland') return 'wetland';
  if (tags.get('natural') === 'water') {
    // Water polygons of rivers and canals are watercourses, not standing water.
    const kind = tags.get('water');
    return kind && WATERCOURSES.includes(kind) ? null : 'water';
  }
  return null;
}

function attr(source: string, name: string): string | null {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(source)?.[1] ?? null;
}

function decodeXml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&');
}

// OSM API 0.6 XML: <node id lat lon>, <way><nd ref/><tag k v/></way>. Relations are skipped.
export function parseOsmXml(xml: string): WaterFeature[] {
  const nodes = new Map<string, Position>();
  for (const match of xml.matchAll(/<node\b([^>]*?)\/?>/g)) {
    const attrs = match[1] ?? '';
    const [id, lat, lon] = [attr(attrs, 'id'), attr(attrs, 'lat'), attr(attrs, 'lon')];
    if (id && lat && lon) nodes.set(id, [Number(lon), Number(lat)]);
  }
  const features: WaterFeature[] = [];
  for (const match of xml.matchAll(/<way\b[^>]*>([\s\S]*?)<\/way>/g)) {
    const body = match[1] ?? '';
    const tags = new Map<string, string>();
    for (const tag of body.matchAll(/<tag\b([^>]*?)\/?>/g)) {
      const [k, v] = [attr(tag[1] ?? '', 'k'), attr(tag[1] ?? '', 'v')];
      if (k !== null && v !== null) tags.set(k, decodeXml(v));
    }
    const type = classify(tags);
    if (!type) continue;
    const coords: Position[] = [];
    for (const nd of body.matchAll(/<nd\b([^>]*?)\/?>/g)) {
      const position = nodes.get(attr(nd[1] ?? '', 'ref') ?? '');
      if (position) coords.push(position);
    }
    if (coords.length >= 2) features.push({ type, name: tags.get('name') ?? null, coords });
  }
  return features;
}

type OverpassBody = {
  elements?: {
    type?: string;
    tags?: Record<string, string>;
    geometry?: { lat: number; lon: number }[];
  }[];
};

export function parseOverpassJson(body: unknown): WaterFeature[] {
  const elements = (body as OverpassBody | null)?.elements;
  if (!Array.isArray(elements)) throw new Error('Malformed Overpass response');
  const features: WaterFeature[] = [];
  for (const element of elements) {
    if (element.type !== 'way' || !element.geometry || element.geometry.length < 2) continue;
    const tags = new Map(Object.entries(element.tags ?? {}));
    const type = classify(tags);
    if (!type) continue;
    features.push({
      type,
      name: tags.get('name') ?? null,
      coords: element.geometry.map((p) => [p.lon, p.lat]),
    });
  }
  return features;
}

function parcelRings(geometry: HydroParcel['geometry']): Position[][] {
  const coordinates = geometry.coordinates as Position[][] | Position[][][];
  if (geometry.type === 'Polygon') return coordinates as Position[][];
  if (geometry.type === 'MultiPolygon') return (coordinates as Position[][][]).flat();
  throw new Error('Unsupported parcel geometry');
}

type Nearest = { distM: number; point: { lat: number; lon: number } };

// Minimal distance (m) between the parcel boundary and a feature, plus the closest point lying on the feature.
function nearestToParcel(rings: Position[][], feature: WaterFeature): Nearest {
  const featureLine = lineString(feature.coords);
  const first = rings[0]?.[0] ?? feature.coords[0] ?? [0, 0];
  if (rings.some((ring) => booleanIntersects(polygon([ring]), featureLine))) {
    // Feature touches or lies inside the parcel.
    const onFeature = nearestPointOnLine(featureLine, point(first), { units: 'meters' });
    const [lon, lat] = onFeature.geometry.coordinates as [number, number];
    return { distM: 0, point: { lat, lon } };
  }
  let best: Nearest | null = null;
  const consider = (distM: number, lon: number, lat: number) => {
    if (!best || distM < best.distM) best = { distM, point: { lat, lon } };
  };
  for (const ring of rings) {
    const ringLine = lineString(ring);
    for (const vertex of ring) {
      const onFeature = nearestPointOnLine(featureLine, point(vertex), { units: 'meters' });
      const [lon, lat] = onFeature.geometry.coordinates as [number, number];
      consider(onFeature.properties.dist ?? 0, lon, lat);
    }
    for (const vertex of feature.coords) {
      const onRing = nearestPointOnLine(ringLine, point(vertex), { units: 'meters' });
      consider(onRing.properties.dist ?? 0, vertex[0] as number, vertex[1] as number);
    }
  }
  if (!best) throw new Error('Empty parcel geometry');
  return best;
}

function withinRadius(feature: WaterFeature, centroid: Position): boolean {
  const near = nearestPointOnLine(lineString(feature.coords), point(centroid), { units: 'meters' });
  return (near.properties.dist ?? Infinity) <= RADIUS_M;
}

// Distances are metres from the parcel boundary; only objects within 1 km of the centroid count.
export function summarizeHydrology(parcel: HydroParcel, all: WaterFeature[]): HydroData {
  const centroid: Position = [parcel.centroid.lon, parcel.centroid.lat];
  const rings = parcelRings(parcel.geometry);
  const counts: Record<WaterType, number> = {
    river: 0,
    stream: 0,
    canal: 0,
    ditch: 0,
    drain: 0,
    water: 0,
    reservoir: 0,
    wetland: 0,
  };
  let ditch: (Nearest & { feature: WaterFeature }) | null = null;
  let reservoirDistanceM: number | null = null;
  for (const feature of all) {
    if (!withinRadius(feature, centroid)) continue;
    counts[feature.type] += 1;
    const nearest = nearestToParcel(rings, feature);
    if (WATERCOURSES.includes(feature.type)) {
      if (!ditch || nearest.distM < ditch.distM) ditch = { ...nearest, feature };
    } else if (feature.type === 'water' || feature.type === 'reservoir') {
      if (reservoirDistanceM === null || nearest.distM < reservoirDistanceM) {
        reservoirDistanceM = nearest.distM;
      }
    }
  }
  return {
    radiusM: RADIUS_M,
    counts,
    nearestDitchDistanceM: ditch ? Math.round(ditch.distM) : null,
    nearestDitchPoint: ditch ? ditch.point : null,
    nearestDitchType: ditch ? ditch.feature.type : null,
    nearestWatercourseName: ditch ? ditch.feature.name : null,
    nearestReservoirDistanceM: reservoirDistanceM === null ? null : Math.round(reservoirDistanceM),
    hasReservoirWithin1km: counts.water + counts.reservoir > 0,
    hasWetlandWithin1km: counts.wetland > 0,
  };
}

async function fetchOsmMap(
  box: number[],
  signal: AbortSignal,
  doFetch: typeof fetch,
): Promise<WaterFeature[]> {
  const bbox = box.map((v) => v.toFixed(6)).join(',');
  const response = await doFetch(`${OSM_MAP_URL}?bbox=${bbox}`, {
    headers: { 'User-Agent': USER_AGENT },
    signal,
  });
  if (!response.ok) throw new HttpStatusError(response.status);
  return parseOsmXml(await response.text());
}

function overpassQuery(c: { lat: number; lon: number }): string {
  const around = `(around:${RADIUS_M},${c.lat.toFixed(6)},${c.lon.toFixed(6)})`;
  return (
    '[out:json][timeout:10];(' +
    `way["waterway"~"^(river|stream|canal|ditch|drain)$"]${around};` +
    `way["natural"="water"]${around};` +
    `way["landuse"="reservoir"]${around};` +
    `way["natural"="wetland"]${around};` +
    ');out geom 200;'
  );
}

async function fetchOverpass(
  c: { lat: number; lon: number },
  signal: AbortSignal,
  doFetch: typeof fetch,
): Promise<WaterFeature[]> {
  const response = await doFetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'User-Agent': USER_AGENT, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: overpassQuery(c) }).toString(),
    signal,
  });
  if (!response.ok) throw new HttpStatusError(response.status);
  return parseOverpassJson(await response.json());
}

async function fetchHydroData(
  parcel: HydroParcel,
  signal: AbortSignal,
  doFetch: typeof fetch,
): Promise<FetcherResult<HydroData>> {
  let features: WaterFeature[];
  try {
    const osmSignal = AbortSignal.any([signal, AbortSignal.timeout(OSM_ATTEMPT_MS)]);
    features = await fetchOsmMap(bboxAround(parcel.centroid), osmSignal, doFetch);
  } catch (error) {
    // Outer budget exhausted: no point in the fallback.
    if (signal.aborted) throw error;
    features = await fetchOverpass(parcel.centroid, signal, doFetch);
  }
  // Zero objects is a valid result (ok), not missing.
  return { data: summarizeHydrology(parcel, features) };
}

export function fetchHydrology(
  parcel: HydroParcel,
  signal?: AbortSignal,
  deps: HydroDeps = {},
): Promise<SourceResult<HydroData>> {
  const key = `overpass:${parcel.centroid.lat.toFixed(4)},${parcel.centroid.lon.toFixed(4)}`;
  return runSource({
    sourceId: 'overpass',
    key,
    fetcher: (s) => fetchHydroData(parcel, s, deps.fetch ?? fetch),
    timeoutMs: TIMEOUT_MS,
    // The OSM attempt is capped inside the fetcher (6 s) so Overpass can use the rest; no whole-fetcher retry.
    retries: 0,
    signal,
    cache: deps.cache,
  });
}
