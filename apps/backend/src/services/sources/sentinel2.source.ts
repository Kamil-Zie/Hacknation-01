// T-027 DM-014 Sentinel-2 L2A scene search (Earth Search STAC)
import type { SourceCacheStore } from '@/services/sources/cache.service';
import { HttpStatusError, runSource } from '@/services/sources/runSource';
import type { FetcherResult } from '@/services/sources/runSource';
import type { SourceResult } from '@/services/sources/types';

const SEARCH_URL = 'https://earth-search.aws.element84.com/v1/search';
const COLLECTION = 'sentinel-2-l2a';
const WINDOW_DAYS = 45;
const MAX_CLOUD_COVER = 70;
const LIMIT = 10;
const ARCHIVE_START = '2016-11-01';
const DAY_MS = 24 * 60 * 60 * 1000;
const MSG_BEFORE_ARCHIVE = 'Archiwum Sentinel-2 L2A obejmuje daty od listopada 2016';

export type Sentinel2Geometry = {
  type: 'Polygon' | 'MultiPolygon';
  coordinates: unknown;
};

export type Sentinel2Parcel = { id: string; geometry: Sentinel2Geometry };

export type Sentinel2Asset = { href: string; scale: number; offset: number };
export type Sentinel2SclAsset = { href: string };

export type Sentinel2Scene = {
  id: string;
  date: string;
  cloudCover: number;
  epsg: number | null;
  assets: {
    red: Sentinel2Asset;
    nir: Sentinel2Asset;
    nir08: Sentinel2Asset;
    swir16: Sentinel2Asset;
    scl: Sentinel2SclAsset;
  };
  thumbnailUrl: string | null;
};

export type Sentinel2Deps = { cache?: SourceCacheStore };

type StacAsset = {
  href?: unknown;
  'raster:bands'?: { scale?: unknown; offset?: unknown }[];
};
type StacFeature = {
  id?: unknown;
  properties?: Record<string, unknown>;
  assets?: Record<string, StacAsset | undefined>;
};

// Window start: D minus 45 days, as YYYY-MM-DD (UTC).
function windowStart(analysisDate: string): string {
  return new Date(Date.parse(`${analysisDate}T00:00:00Z`) - WINDOW_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function parseScaled(asset: StacAsset | undefined): Sentinel2Asset | null {
  if (typeof asset?.href !== 'string') return null;
  const band = asset['raster:bands']?.[0];
  return {
    href: asset.href,
    scale: typeof band?.scale === 'number' ? band.scale : 1,
    offset: typeof band?.offset === 'number' ? band.offset : 0,
  };
}

// Returns null when the feature lacks id, date, cloud cover or any required asset.
export function parseScene(feature: StacFeature): Sentinel2Scene | null {
  const { id, properties, assets } = feature;
  const datetime = properties?.datetime;
  const cloudCover = properties?.['eo:cloud_cover'];
  if (typeof id !== 'string' || typeof datetime !== 'string' || typeof cloudCover !== 'number') {
    return null;
  }
  const red = parseScaled(assets?.red);
  const nir = parseScaled(assets?.nir);
  const nir08 = parseScaled(assets?.nir08);
  const swir16 = parseScaled(assets?.swir16);
  const sclHref = assets?.scl?.href;
  if (!red || !nir || !nir08 || !swir16 || typeof sclHref !== 'string') return null;
  const epsg = properties?.['proj:epsg'];
  const thumbnail = assets?.thumbnail?.href;
  return {
    id,
    date: datetime.slice(0, 10),
    cloudCover,
    epsg: typeof epsg === 'number' ? epsg : null,
    assets: { red, nir, nir08, swir16, scl: { href: sclHref } },
    thumbnailUrl: typeof thumbnail === 'string' ? thumbnail : null,
  };
}

// Newest first; scenes dated after D are dropped (the query already limits the window).
export function parseSearchResponse(body: unknown, analysisDate: string): Sentinel2Scene[] {
  const features = (body as { features?: unknown } | null)?.features;
  if (!Array.isArray(features)) throw new Error('Malformed STAC response');
  return features
    .map((feature) => parseScene(feature as StacFeature))
    .filter((scene): scene is Sentinel2Scene => scene !== null && scene.date <= analysisDate)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, LIMIT);
}

export async function searchScenes(
  geometry: Sentinel2Geometry,
  analysisDate: string,
  signal?: AbortSignal,
): Promise<Sentinel2Scene[]> {
  const response = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      collections: [COLLECTION],
      intersects: geometry,
      datetime: `${windowStart(analysisDate)}T00:00:00Z/${analysisDate}T23:59:59Z`,
      query: { 'eo:cloud_cover': { lt: MAX_CLOUD_COVER } },
      sortby: [{ field: 'properties.datetime', direction: 'desc' }],
      limit: LIMIT,
    }),
    signal,
  });
  if (!response.ok) throw new HttpStatusError(response.status);
  return parseSearchResponse(await response.json(), analysisDate);
}

async function fetchScenes(
  geometry: Sentinel2Geometry,
  analysisDate: string,
  signal: AbortSignal,
): Promise<FetcherResult<Sentinel2Scene[]>> {
  const scenes = await searchScenes(geometry, analysisDate, signal);
  const newest = scenes[0];
  if (!newest) return null;
  return { data: scenes, dataPeriod: newest.date };
}

export async function fetchSentinel2Scenes(
  parcel: Sentinel2Parcel,
  analysisDate: string,
  signal?: AbortSignal,
  deps: Sentinel2Deps = {},
): Promise<SourceResult<Sentinel2Scene[]>> {
  if (analysisDate < ARCHIVE_START) {
    return {
      sourceId: 'sentinel2',
      status: 'missing',
      data: null,
      message: MSG_BEFORE_ARCHIVE,
      reasonCode: 'NO_SCENE',
      fetchedAt: new Date(),
      dataPeriod: null,
      durationMs: 0,
    };
  }
  const result = await runSource({
    sourceId: 'sentinel2',
    key: `sentinel2:${parcel.id}:${analysisDate}`,
    fetcher: (s) => fetchScenes(parcel.geometry, analysisDate, s),
    signal,
    cache: deps.cache,
  });
  if (result.status !== 'missing') return result;
  return {
    ...result,
    reasonCode: 'NO_SCENE',
    message: `Brak zdjęć z mniejszym zachmurzeniem niż ${MAX_CLOUD_COVER}% w ${WINDOW_DAYS} dniach przed ${analysisDate}`,
  };
}
