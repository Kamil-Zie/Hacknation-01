// T-091 API-020 DM-026 Parcels of an account with their latest report: reports + fields, limited by the member's parcelIds
import mongoose from 'mongoose';

import { AccountMemberModel } from '@/models/AccountMember.model';
import { FieldModel } from '@/models/Field.model';
import { ReportModel } from '@/models/Report.model';
import { getParcelById } from '@/services/parcels.service';
import type { Parcel } from '@/services/parcels.service';
import { AppError } from '@/utils/AppError';
import { logger } from '@/utils/logger';

const MAX_PARCELS = 200;
// Field-only parcels come from ULDK (cached); fetch a few at a time
const ULDK_BATCH = 5;

type DroughtClass = 'none' | 'moderate' | 'severe' | 'unknown';

type ParcelBrief = Pick<
  Parcel,
  | 'id'
  | 'parcelNumber'
  | 'region'
  | 'commune'
  | 'county'
  | 'voivodeship'
  | 'areaHa'
  | 'centroid'
  | 'bbox'
  | 'geometry'
>;

export interface ParcelOverviewDto {
  parcel: ParcelBrief;
  lastReport: {
    id: string;
    analysisDate: string;
    crop: { code: string; name: string };
    status: 'complete' | 'partial';
    droughtClass: DroughtClass;
  } | null;
  atRisk: boolean;
  fieldIds: string[];
}

interface ReportRow {
  _id: unknown;
  parcel: ParcelBrief;
  crop: { code: string; name: string };
  analysisDate: string;
  status: 'complete' | 'partial';
  assessment?: { droughtClass?: DroughtClass };
}

function brief(p: ParcelBrief): ParcelBrief {
  return {
    id: p.id,
    parcelNumber: p.parcelNumber,
    region: p.region,
    commune: p.commune,
    county: p.county,
    voivodeship: p.voivodeship,
    areaHa: p.areaHa,
    centroid: p.centroid,
    bbox: p.bbox,
    geometry: p.geometry,
  };
}

export async function listAccountParcels(
  userId: string,
  accountId: string,
): Promise<{ items: ParcelOverviewDto[]; total: number }> {
  if (mongoose.connection.readyState !== 1) {
    throw new AppError('DB_UNAVAILABLE', 'Baza danych jest niedostępna', 503);
  }
  const self = await AccountMemberModel.findOne({ accountId, userId, status: 'active' });
  if (!self) throw new AppError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa.', 403);
  const allowed = self.parcelIds && self.parcelIds.length > 0 ? new Set(self.parcelIds) : null;

  const [reports, fields] = await Promise.all([
    ReportModel.find(
      { accountId },
      { parcel: 1, crop: 1, analysisDate: 1, status: 1, 'assessment.droughtClass': 1 },
    )
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean<ReportRow[]>(),
    FieldModel.find({ accountId }, { parcelIds: 1 }).lean<
      { _id: unknown; parcelIds: string[] }[]
    >(),
  ]);

  const fieldIdsOf = new Map<string, string[]>();
  for (const field of fields) {
    for (const parcelId of field.parcelIds) {
      fieldIdsOf.set(parcelId, [...(fieldIdsOf.get(parcelId) ?? []), String(field._id)]);
    }
  }

  const items: ParcelOverviewDto[] = [];
  const seen = new Set<string>();
  for (const row of reports) {
    const id = row.parcel?.id;
    if (!id || seen.has(id) || (allowed && !allowed.has(id))) continue;
    seen.add(id);
    const droughtClass = row.assessment?.droughtClass ?? 'unknown';
    items.push({
      parcel: brief(row.parcel),
      lastReport: {
        id: String(row._id),
        analysisDate: row.analysisDate,
        crop: { code: row.crop.code, name: row.crop.name },
        status: row.status,
        droughtClass,
      },
      atRisk: droughtClass === 'moderate' || droughtClass === 'severe',
      fieldIds: fieldIdsOf.get(id) ?? [],
    });
    if (items.length >= MAX_PARCELS) break;
  }

  // Parcels that are only in fields, never analysed: geometry from the ULDK cache, skipped on failure
  const fieldOnly = [...fieldIdsOf.keys()].filter(
    (id) => !seen.has(id) && (!allowed || allowed.has(id)),
  );
  for (let i = 0; i < fieldOnly.length && items.length < MAX_PARCELS; i += ULDK_BATCH) {
    const batch = fieldOnly.slice(i, i + ULDK_BATCH);
    const results = await Promise.allSettled(batch.map((id) => getParcelById(id)));
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logger.warn(`API-020: field parcel ${batch[index]} skipped, ULDK failed`);
        return;
      }
      if (items.length >= MAX_PARCELS) return;
      items.push({
        parcel: brief(result.value),
        lastReport: null,
        atRisk: false,
        fieldIds: fieldIdsOf.get(batch[index] as string) ?? [],
      });
    });
  }
  return { items, total: items.length };
}
