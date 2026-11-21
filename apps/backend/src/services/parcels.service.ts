// T-005 API-001/API-002 GET /parcels/:parcelId and /parcels/by-point: ULDK result -> Parcel DTO (DM-003)
import type { SourceResult } from '@/services/sources/types';
import { fetchParcelById, fetchParcelByPoint } from '@/services/sources/uldk.source';
import type { ParcelData } from '@/services/sources/uldk.source';
import { AppError } from '@/utils/AppError';

export type Parcel = ParcelData & { fetchedAt: string };

function toParcel(result: SourceResult<ParcelData>): Parcel {
  if (result.status === 'missing') {
    throw new AppError('PARCEL_NOT_FOUND', 'Nie znaleziono działki', 404);
  }
  if (!result.data) {
    throw new AppError('UPSTREAM_UNAVAILABLE', 'Usługa ULDK GUGiK nie odpowiada', 502);
  }
  return { ...result.data, fetchedAt: (result.fetchedAt ?? new Date()).toISOString() };
}

export async function getParcelById(id: string): Promise<Parcel> {
  return toParcel(await fetchParcelById(id));
}

export async function getParcelByPoint(lat: number, lon: number): Promise<Parcel> {
  return toParcel(await fetchParcelByPoint(lat, lon));
}
