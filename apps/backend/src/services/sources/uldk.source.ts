// T-005 API-001/API-002 ULDK GUGiK source: GetParcelById/GetParcelByXY text response -> Parcel (DM-003)
import { area, bbox, centroid } from '@turf/turf';
import type { Geometry } from 'geojson';
import { parse } from 'wellknown';

import type { SourceCacheStore } from '@/services/sources/cache.service';
import { HttpStatusError, runSource } from '@/services/sources/runSource';
import type { FetcherResult } from '@/services/sources/runSource';
import type { SourceResult } from '@/services/sources/types';

const ULDK_URL = 'https://uldk.gugik.gov.pl/';
const RESULT_FIELDS = 'geom_wkt,teryt,voivodeship,county,commune,region,parcel';
// 9 s per attempt (ULDK cold start up to 9 s, T-002) + 1 retry within 20 s; frontend waits 25 s.
const TIMEOUT_MS = 20000;
const ATTEMPT_TIMEOUT_MS = 9000;
// T-067: fast failures (network reset, 5xx, 429 on the hackathon network) were retried immediately and gave 502
// after ~2 s; now 2 retries with 0.6 s and 1.2 s pauses, still inside the 20 s budget.
const RETRIES = 2;
const RETRY_DELAY_MS = 600;

// DM-003 without fetchedAt (added by the service from the SourceResult).
export type ParcelData = {
  id: string;
  parcelNumber: string;
  region: string;
  commune: string;
  county: string;
  voivodeship: string;
  areaHa: number;
  centroid: { lat: number; lon: number };
  bbox: [number, number, number, number];
  geometry: Geometry;
  source: string;
};

// Returns null when ULDK reports no parcel ("-1 ..." in line 1); throws on a malformed response.
export function parseUldkResponse(text: string): ParcelData | null {
  const lines = text.split(/\r?\n/);
  const status = (lines[0] ?? '').trim();
  if (status.startsWith('-1')) return null;
  if (status !== '0') throw new Error('Unexpected ULDK status');

  const fields = (lines[1] ?? '').trim().split('|');
  const [wkt, teryt, voivodeship, county, commune, region, parcel] = fields;
  if (fields.length < 7 || !wkt || !teryt) throw new Error('Malformed ULDK response');

  const geometry = parse(wkt.replace(/^SRID=\d+;/, ''));
  if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
    throw new Error('Unexpected ULDK geometry');
  }
  const [lon, lat] = centroid(geometry).geometry.coordinates as [number, number];
  const [minLon, minLat, maxLon, maxLat] = bbox(geometry) as [number, number, number, number];

  return {
    id: teryt,
    parcelNumber: parcel ?? '',
    region: region ?? '',
    commune: commune ?? '',
    county: (county ?? '').replace(/^powiat\s+/i, ''),
    voivodeship: voivodeship ?? '',
    areaHa: Math.round((area(geometry) / 10000) * 10000) / 10000,
    centroid: { lat: round6(lat), lon: round6(lon) },
    bbox: [minLon, minLat, maxLon, maxLat],
    geometry,
    source: 'ULDK GUGiK',
  };
}

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

async function fetchUldk(
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<FetcherResult<ParcelData>> {
  const query = new URLSearchParams({ ...params, result: RESULT_FIELDS, srid: '4326' });
  const response = await fetch(`${ULDK_URL}?${query.toString()}`, { signal });
  if (!response.ok) throw new HttpStatusError(response.status);
  const parcel = parseUldkResponse(await response.text());
  return parcel ? { data: parcel } : null;
}

export function fetchParcelById(
  id: string,
  signal?: AbortSignal,
  cache?: SourceCacheStore,
): Promise<SourceResult<ParcelData>> {
  return runSource({
    sourceId: 'uldk',
    key: `uldk:id:${id}`,
    fetcher: (s) => fetchUldk({ request: 'GetParcelById', id }, s),
    timeoutMs: TIMEOUT_MS,
    attemptTimeoutMs: ATTEMPT_TIMEOUT_MS,
    retries: RETRIES,
    retryDelayMs: RETRY_DELAY_MS,
    signal,
    cache,
  });
}

// ULDK expects xy=lon,lat,4326 (confirmed in T-002).
export function fetchParcelByPoint(
  lat: number,
  lon: number,
  signal?: AbortSignal,
  cache?: SourceCacheStore,
): Promise<SourceResult<ParcelData>> {
  const [latKey, lonKey] = [lat.toFixed(5), lon.toFixed(5)];
  return runSource({
    sourceId: 'uldk',
    key: `uldk:xy:${latKey},${lonKey}`,
    fetcher: (s) => fetchUldk({ request: 'GetParcelByXY', xy: `${lonKey},${latKey},4326` }, s),
    timeoutMs: TIMEOUT_MS,
    attemptTimeoutMs: ATTEMPT_TIMEOUT_MS,
    retries: RETRIES,
    retryDelayMs: RETRY_DELAY_MS,
    signal,
    cache,
  });
}
