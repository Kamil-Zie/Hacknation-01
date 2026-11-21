// T-077 API-016 API-017 API-018 Fields: create from adjacent parcels (ULDK), list, delete
import { FieldModel } from '@/models/Field.model';
import { allowedParcelIds, canSeeField, isMember } from '@/services/accounts.service';
import { disconnectedParcelIds, MAX_DISTANCE_M } from '@/services/fields/adjacency';
import { getParcelById } from '@/services/parcels.service';
import type { Parcel } from '@/services/parcels.service';
import { AppError } from '@/utils/AppError';
import { assertDbConnected } from '@/utils/db';
import type { CreateFieldBody, ListFieldsQuery } from '@/validation/fields.schema';

const ULDK_CONCURRENCY = 4;

export interface FieldDto {
  id: string;
  accountId: string;
  name: string;
  parcelIds: string[];
  parcels: { id: string; parcelNumber: string; commune: string; region: string; areaHa: number }[];
  areaHa: number;
  centroid: { lat: number; lon: number };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FieldPage {
  items: FieldDto[];
  page: number;
  pageSize: number;
  total: number;
}

interface FieldRow {
  _id: unknown;
  accountId: unknown;
  name: string;
  parcelIds: string[];
  parcels: FieldDto['parcels'];
  areaHa: number;
  centroid: { lat: number; lon: number };
  createdBy: unknown;
  createdAt: Date;
  updatedAt: Date;
}

function toFieldDto(field: FieldRow): FieldDto {
  return {
    id: String(field._id),
    accountId: String(field.accountId),
    name: field.name,
    parcelIds: [...field.parcelIds],
    parcels: field.parcels.map((p) => ({
      id: p.id,
      parcelNumber: p.parcelNumber,
      commune: p.commune,
      region: p.region,
      areaHa: p.areaHa,
    })),
    areaHa: field.areaHa,
    centroid: { lat: field.centroid.lat, lon: field.centroid.lon },
    createdBy: String(field.createdBy),
    createdAt: field.createdAt.toISOString(),
    updatedAt: field.updatedAt.toISOString(),
  };
}

async function assertMember(userId: string, accountId: string): Promise<void> {
  assertDbConnected();
  if (!(await isMember(userId, accountId))) {
    throw new AppError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa.', 403);
  }
}

async function loadParcel(id: string): Promise<Parcel> {
  try {
    return await getParcelById(id);
  } catch (error) {
    if (error instanceof AppError && error.code === 'PARCEL_NOT_FOUND') {
      throw new AppError('PARCEL_NOT_FOUND', 'Nie znaleziono działki w ULDK.', 404, {
        parcelId: id,
      });
    }
    throw error;
  }
}

async function loadParcels(ids: string[]): Promise<Parcel[]> {
  const parcels: Parcel[] = [];
  for (let i = 0; i < ids.length; i += ULDK_CONCURRENCY) {
    parcels.push(...(await Promise.all(ids.slice(i, i + ULDK_CONCURRENCY).map(loadParcel))));
  }
  return parcels;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export async function createField(
  userId: string,
  accountId: string,
  body: CreateFieldBody,
): Promise<FieldDto> {
  await assertMember(userId, accountId);
  const allowed = await allowedParcelIds(userId, accountId);
  if (!canSeeField(allowed, body.parcelIds)) {
    throw new AppError('NOT_A_MEMBER', 'Nie masz dostępu do wszystkich wybranych działek.', 403, {
      parcelIds: body.parcelIds.filter((id) => !allowed?.has(id)),
    });
  }
  const parcels = await loadParcels(body.parcelIds);
  const loose = disconnectedParcelIds(parcels.map((p) => ({ id: p.id, geometry: p.geometry })));
  if (loose.length > 0) {
    throw new AppError(
      'PARCELS_NOT_ADJACENT',
      'Działki nie tworzą spójnego obszaru (maks. 50 m między granicami).',
      422,
      { parcelIds: loose, maxDistanceM: MAX_DISTANCE_M },
    );
  }
  const totalHa = parcels.reduce((sum, p) => sum + p.areaHa, 0);
  const field = await FieldModel.create({
    accountId,
    name: body.name,
    parcelIds: body.parcelIds,
    parcels: parcels.map((p) => ({
      id: p.id,
      parcelNumber: p.parcelNumber,
      commune: p.commune,
      region: p.region,
      areaHa: p.areaHa,
    })),
    areaHa: round(totalHa, 4),
    // Area-weighted mean of parcel centroids (fields are small, so planar mean is fine).
    centroid: {
      lat: round(parcels.reduce((s, p) => s + p.centroid.lat * p.areaHa, 0) / totalHa, 6),
      lon: round(parcels.reduce((s, p) => s + p.centroid.lon * p.areaHa, 0) / totalHa, 6),
    },
    createdBy: userId,
  });
  return toFieldDto(field);
}

export async function listFields(
  userId: string,
  accountId: string,
  query: ListFieldsQuery,
): Promise<FieldPage> {
  await assertMember(userId, accountId);
  const { page, pageSize } = query;
  // T-092: a partner with limited access sees only fields made entirely of their parcels
  const allowed = await allowedParcelIds(userId, accountId);
  const filter = allowed
    ? { accountId, parcelIds: { $not: { $elemMatch: { $nin: [...allowed] } } } }
    : { accountId };
  const [fields, total] = await Promise.all([
    FieldModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    FieldModel.countDocuments(filter),
  ]);
  return { items: fields.map(toFieldDto), page, pageSize, total };
}

export async function deleteField(
  userId: string,
  accountId: string,
  fieldId: string,
): Promise<void> {
  await assertMember(userId, accountId);
  const field = await FieldModel.findOne({ _id: fieldId, accountId });
  const allowed = await allowedParcelIds(userId, accountId);
  if (!field || !canSeeField(allowed, field.parcelIds)) {
    throw new AppError('FIELD_NOT_FOUND', 'Nie znaleziono pola.', 404, { fieldId });
  }
  await FieldModel.deleteOne({ _id: fieldId, accountId });
}
