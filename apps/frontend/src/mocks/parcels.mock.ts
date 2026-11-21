// API-001 API-002 DM-003 Mock of parcel endpoints (same shape as contracts/api.json), ~600 ms delay
import { ApiError } from '@/api/client';
import type { Parcel } from '@/api/types';

const MOCK_DELAY_MS = 600;
const MAX_NEAREST_DISTANCE_DEG = 0.5;
const FETCHED_AT = '2026-11-21T08:00:00.000Z';

type ParcelBase = Pick<
  Parcel,
  'id' | 'parcelNumber' | 'region' | 'commune' | 'county' | 'voivodeship'
>;

function makeParcel(
  base: ParcelBase,
  areaHa: number,
  bbox: [number, number, number, number],
): Parcel {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  // Skewed quadrilateral so it does not look like a plain bbox
  const dLon = (maxLon - minLon) * 0.12;
  return {
    ...base,
    areaHa,
    centroid: { lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2 },
    bbox,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [minLon, minLat],
          [maxLon, minLat + (maxLat - minLat) * 0.1],
          [maxLon - dLon, maxLat],
          [minLon + dLon, maxLat - (maxLat - minLat) * 0.05],
          [minLon, minLat],
        ],
      ],
    },
    source: 'ULDK GUGiK',
    fetchedAt: FETCHED_AT,
  };
}

export const MOCK_PARCELS: Parcel[] = [
  makeParcel(
    {
      id: '141201_1.0001.123',
      parcelNumber: '123',
      region: 'Wola Rasztowska',
      commune: 'Ciechanów',
      county: 'ciechanowski',
      voivodeship: 'mazowieckie',
    },
    4.82,
    [20.4202, 52.8801, 20.4281, 52.8838],
  ),
  makeParcel(
    {
      id: '141201_1.0001.124/2',
      parcelNumber: '124/2',
      region: 'Wola Rasztowska',
      commune: 'Ciechanów',
      county: 'ciechanowski',
      voivodeship: 'mazowieckie',
    },
    1.37,
    [20.4291, 52.8805, 20.4318, 52.8826],
  ),
  makeParcel(
    {
      id: '081603_2.0012.45',
      parcelNumber: '45',
      region: 'Ostrów',
      commune: 'Dąbie',
      county: 'krośnieński',
      voivodeship: 'lubuskie',
    },
    9.15,
    [15.0842, 52.0511, 15.0955, 52.0583],
  ),
];

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

function notFound(): ApiError {
  return new ApiError('PARCEL_NOT_FOUND', 'Nie znaleziono działki o podanym numerze', 404);
}

function isPointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let isInside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i] as [number, number];
    const [xj, yj] = ring[j] as [number, number];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      isInside = !isInside;
    }
  }
  return isInside;
}

export async function mockGetParcelById(parcelId: string): Promise<Parcel> {
  await delay();
  const parcel = MOCK_PARCELS.find((item) => item.id === parcelId);
  if (!parcel) throw notFound();
  return parcel;
}

export async function mockGetParcelByPoint(lat: number, lon: number): Promise<Parcel> {
  await delay();
  const containing = MOCK_PARCELS.find(
    (item) =>
      item.geometry.type === 'Polygon' &&
      isPointInRing(lon, lat, item.geometry.coordinates[0] as number[][]),
  );
  if (containing) return containing;
  // Demo-friendly: otherwise the nearest parcel, but only when reasonably close
  const [nearest] = MOCK_PARCELS.map((item) => ({
    item,
    dist: Math.hypot(item.centroid.lat - lat, item.centroid.lon - lon),
  })).sort((a, b) => a.dist - b.dist);
  if (!nearest || nearest.dist > MAX_NEAREST_DISTANCE_DEG) throw notFound();
  return nearest.item;
}
