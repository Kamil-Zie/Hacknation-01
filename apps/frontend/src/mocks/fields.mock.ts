// API-016 API-017 API-018 DM-024 Mock of fields (stored in localStorage), adjacency simplified to centroids < 0.5 km
import { ApiError } from '@/api/client';
import type { CreateFieldRequest, Field } from '@/api/types';
import { mockDelay, requireAccount, requireUser } from '@/mocks/auth.mock';
import { MOCK_PARCELS } from '@/mocks/parcels.mock';

const STORAGE_KEY = 'kropelka.mock.fields.v1';
const MAX_NAME = 120;
const MIN_PARCELS = 2;
const MAX_PARCELS = 20;
const MAX_CENTROID_KM = 0.5;

function readFields(): Field[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Field[];
  } catch {
    return [];
  }
}

function writeFields(fields: Field[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
  } catch {
    // Persistence is best-effort in the mock
  }
}

function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = (a.lat - b.lat) * 111;
  const dLon = (a.lon - b.lon) * 111 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dLat, dLon);
}

function validationError(field: string, message: string): ApiError {
  return new ApiError('VALIDATION_ERROR', message, 422, { field });
}

export async function mockCreateField(
  accountId: string,
  body: CreateFieldRequest,
  token: string,
): Promise<Field> {
  await mockDelay();
  const account = requireAccount(accountId, token);
  const user = requireUser(token);
  const name = body.name.trim();
  if (!name || name.length > MAX_NAME) {
    throw validationError('name', 'Nazwa musi mieć od 1 do 120 znaków');
  }
  const ids = body.parcelIds;
  if (ids.length < MIN_PARCELS || ids.length > MAX_PARCELS || new Set(ids).size !== ids.length) {
    throw validationError('parcelIds', 'Pole to od 2 do 20 różnych działek');
  }
  const parcels = ids.map((id) => {
    const parcel = MOCK_PARCELS.find((item) => item.id === id);
    if (!parcel) {
      throw new ApiError('PARCEL_NOT_FOUND', 'Nie znaleziono działki w ULDK.', 404, {
        parcelId: id,
      });
    }
    return parcel;
  });
  // Parcels without any neighbour closer than 0.5 km are reported as not connected
  const lonely = parcels.filter(
    (parcel) =>
      !parcels.some(
        (other) =>
          other.id !== parcel.id && distanceKm(parcel.centroid, other.centroid) < MAX_CENTROID_KM,
      ),
  );
  if (lonely.length > 0) {
    throw new ApiError(
      'PARCELS_NOT_ADJACENT',
      'Działki nie tworzą spójnego obszaru (maks. 50 m między granicami).',
      422,
      { parcelIds: lonely.map((parcel) => parcel.id), maxDistanceM: 50 },
    );
  }
  const now = new Date().toISOString();
  const field: Field = {
    id: `f_${Date.now().toString(36)}`,
    accountId: account.id,
    name,
    parcelIds: ids,
    parcels: parcels.map(({ id, parcelNumber, commune, region, areaHa }) => ({
      id,
      parcelNumber,
      commune,
      region,
      areaHa,
    })),
    areaHa: Math.round(parcels.reduce((sum, parcel) => sum + parcel.areaHa, 0) * 100) / 100,
    centroid: {
      lat: parcels.reduce((sum, parcel) => sum + parcel.centroid.lat, 0) / parcels.length,
      lon: parcels.reduce((sum, parcel) => sum + parcel.centroid.lon, 0) / parcels.length,
    },
    createdBy: user.id,
    createdAt: now,
    updatedAt: now,
  };
  writeFields([field, ...readFields()]);
  return field;
}

export async function mockGetFields(accountId: string, token: string): Promise<Field[]> {
  await mockDelay();
  requireAccount(accountId, token);
  return readFields().filter((field) => field.accountId === accountId);
}

export async function mockDeleteField(
  accountId: string,
  fieldId: string,
  token: string,
): Promise<void> {
  await mockDelay();
  requireAccount(accountId, token);
  const fields = readFields();
  if (!fields.some((field) => field.id === fieldId && field.accountId === accountId)) {
    throw new ApiError('FIELD_NOT_FOUND', 'Nie znaleziono pola.', 404, { fieldId });
  }
  writeFields(fields.filter((field) => field.id !== fieldId));
}
