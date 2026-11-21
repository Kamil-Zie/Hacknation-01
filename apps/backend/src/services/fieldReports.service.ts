// T-078 API-019 DM-025 field report: the API-004 analysis on every parcel of a field (max 3 at once),
// summary weighted by area, merged recommendations; a parcel that fails is "failed", the rest goes on.
import mongoose from 'mongoose';

import { isMember } from '@/services/accounts.service';
import { createAnalysis, defaultAnalysesDeps } from '@/services/analyses.service';
import type { ReportDto } from '@/services/analyses.service';
import type { Recommendation } from '@/services/engine/recommendations';
import { AppError } from '@/utils/AppError';
import { assertDbConnected } from '@/utils/db';
import { logger } from '@/utils/logger';
import type { CreateFieldReportBody } from '@/validation/fieldReports.schema';

// DM-024 fields read by the report (collection fields, model in T-077).
export type FieldDoc = {
  id: string;
  accountId: string;
  name: string;
  parcelIds: string[];
  parcelAreas: Record<string, number>;
  areaHa: number;
};

type DroughtClass = 'none' | 'moderate' | 'severe' | 'unknown';
type Confidence = 'high' | 'medium' | 'low';

export type FieldParcelResult = {
  parcelId: string;
  reportId: string | null;
  areaHa: number;
  droughtClass: DroughtClass;
  rootZonePct: number | null;
  deficitMm: number | null;
  status: 'complete' | 'partial' | 'failed';
};

export type FieldRecommendation = Recommendation & { parcelIds: string[] };

export type FieldReportDto = {
  fieldId: string;
  name: string;
  crop: { code: string; name: string };
  analysisDate: string;
  areaHa: number;
  summary: {
    droughtClass: DroughtClass;
    severeAreaPct: number;
    moderateAreaPct: number;
    rootZonePctWeighted: number | null;
    deficitMmWeighted: number | null;
    confidence: Confidence;
  };
  parcels: FieldParcelResult[];
  recommendations: FieldRecommendation[];
  createdAt: string;
};

export type FieldReportDeps = {
  loadField: (fieldId: string) => Promise<FieldDoc | null>;
  isMember: (userId: string, accountId: string) => Promise<boolean>;
  analyze: (
    body: { parcelId: string; cropCode: string; analysisDate: string; accountId: string },
    userId: string,
  ) => Promise<ReportDto>;
  now: () => number;
};

const CONCURRENCY = 3;
// Parcels not started by then are marked failed, so the response fits the frontend's 40 s POST timeout.
const START_DEADLINE_MS = 15000;
const CLASS_RANK: Record<DroughtClass, number> = { unknown: 0, none: 1, moderate: 2, severe: 3 };
const CONFIDENCE_RANK: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };

async function loadFieldFromDb(fieldId: string): Promise<FieldDoc | null> {
  assertDbConnected();
  const doc = await mongoose.connection
    .collection('fields')
    .findOne({ _id: new mongoose.Types.ObjectId(fieldId) });
  if (!doc) return null;
  const parcels = (doc.parcels ?? []) as { id: string; areaHa?: number }[];
  return {
    id: String(doc._id),
    accountId: String(doc.accountId),
    name: String(doc.name ?? ''),
    parcelIds: (doc.parcelIds ?? []) as string[],
    parcelAreas: Object.fromEntries(parcels.map((p) => [p.id, p.areaHa ?? 0])),
    areaHa: Number(doc.areaHa ?? 0),
  };
}

export const defaultFieldReportDeps: FieldReportDeps = {
  loadField: loadFieldFromDb,
  isMember,
  analyze: (body, userId) =>
    createAnalysis(body as Parameters<typeof createAnalysis>[0], defaultAnalysesDeps, userId),
  now: () => Date.now(),
};

export async function createFieldReport(
  fieldId: string,
  body: CreateFieldReportBody,
  userId: string,
  deps: FieldReportDeps = defaultFieldReportDeps,
): Promise<FieldReportDto> {
  const field = await deps.loadField(fieldId);
  if (!field) throw new AppError('FIELD_NOT_FOUND', 'Nie znaleziono pola.', 404);
  if (!(await deps.isMember(userId, field.accountId))) {
    throw new AppError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa.', 403);
  }

  const startedAt = deps.now();
  const reports = await mapWithLimit(field.parcelIds, CONCURRENCY, async (parcelId) => {
    if (deps.now() - startedAt > START_DEADLINE_MS) return null;
    try {
      return await deps.analyze(
        { parcelId, cropCode: body.cropCode, analysisDate: body.analysisDate, accountId: field.id },
        userId,
      );
    } catch (error) {
      const code = error instanceof AppError ? error.code : 'INTERNAL';
      logger.warn(`field ${field.id} parcel ${parcelId} failed: ${code}`);
      return null;
    }
  });

  const done = reports.filter((report): report is ReportDto => report !== null);
  if (done.length === 0) {
    throw new AppError('UPSTREAM_UNAVAILABLE', 'Nie udało się policzyć żadnej działki pola.', 502, {
      reasonCode: 'UPSTREAM_ERROR',
    });
  }

  const parcels = field.parcelIds.map((parcelId, index) =>
    toParcelResult(parcelId, reports[index] ?? null, field.parcelAreas[parcelId] ?? 0),
  );
  const crop = done[0]!.crop;
  return {
    fieldId: field.id,
    name: field.name,
    crop,
    analysisDate: body.analysisDate,
    areaHa: field.areaHa,
    summary: summarize(parcels, done),
    parcels,
    recommendations: mergeRecommendations(done),
    createdAt: new Date().toISOString(),
  };
}

function toParcelResult(
  parcelId: string,
  report: ReportDto | null,
  storedAreaHa: number,
): FieldParcelResult {
  if (!report) {
    return {
      parcelId,
      reportId: null,
      areaHa: storedAreaHa,
      droughtClass: 'unknown',
      rootZonePct: null,
      deficitMm: null,
      status: 'failed',
    };
  }
  return {
    parcelId,
    reportId: report.id,
    areaHa: report.parcel.areaHa,
    droughtClass: report.assessment.droughtClass,
    rootZonePct: report.assessment.soilMoistureSatellite?.rootZonePct ?? null,
    deficitMm: report.assessment.soilWater?.depletionMm ?? null,
    status: report.status,
  };
}

// Percentages and weighted values over the area of parcels that were computed (failed ones are listed apart).
export function summarize(
  parcels: FieldParcelResult[],
  reports: ReportDto[],
): FieldReportDto['summary'] {
  const computed = parcels.filter((parcel) => parcel.status !== 'failed');
  const totalArea = computed.reduce((sum, parcel) => sum + parcel.areaHa, 0);
  const areaPct = (droughtClass: DroughtClass) =>
    totalArea > 0
      ? round1(
          (computed
            .filter((parcel) => parcel.droughtClass === droughtClass)
            .reduce((sum, parcel) => sum + parcel.areaHa, 0) /
            totalArea) *
            100,
        )
      : 0;
  const worst = computed.reduce<DroughtClass>(
    (acc, parcel) =>
      CLASS_RANK[parcel.droughtClass] > CLASS_RANK[acc] ? parcel.droughtClass : acc,
    'unknown',
  );
  const confidence = reports.reduce<Confidence>(
    (acc, report) =>
      CONFIDENCE_RANK[report.assessment.confidence] < CONFIDENCE_RANK[acc]
        ? report.assessment.confidence
        : acc,
    'high',
  );
  return {
    droughtClass: worst,
    severeAreaPct: areaPct('severe'),
    moderateAreaPct: areaPct('moderate'),
    rootZonePctWeighted: weighted(computed, (parcel) => parcel.rootZonePct),
    deficitMmWeighted: weighted(computed, (parcel) => parcel.deficitMm),
    confidence,
  };
}

function weighted(
  parcels: FieldParcelResult[],
  pick: (parcel: FieldParcelResult) => number | null,
): number | null {
  let area = 0;
  let sum = 0;
  for (const parcel of parcels) {
    const value = pick(parcel);
    if (value === null || parcel.areaHa <= 0) continue;
    area += parcel.areaHa;
    sum += value * parcel.areaHa;
  }
  return area > 0 ? round1(sum / area) : null;
}

// One entry per rule, in the engine order (retention -> agronomy -> irrigation), with the parcels it applies to.
export function mergeRecommendations(reports: ReportDto[]): FieldRecommendation[] {
  const byRule = new Map<string, FieldRecommendation>();
  for (const report of reports) {
    for (const recommendation of report.recommendations) {
      const existing = byRule.get(recommendation.ruleId);
      if (existing) {
        if (!existing.parcelIds.includes(report.parcel.id))
          existing.parcelIds.push(report.parcel.id);
      } else {
        byRule.set(recommendation.ruleId, { ...recommendation, parcelIds: [report.parcel.id] });
      }
    }
  }
  return [...byRule.values()].sort((a, b) => a.order - b.order);
}

async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
