// T-078 API-019 field report tests: area-weighted summary, failed parcel, merged recommendations, access
import assert from 'node:assert/strict';

import { test } from 'vitest';

import type { ReportDto } from '@/services/analyses.service';
import { createFieldReport } from '@/services/fieldReports.service';
import type { FieldDoc, FieldReportDeps } from '@/services/fieldReports.service';
import { AppError } from '@/utils/AppError';

const FIELD: FieldDoc = {
  id: '665f0c0ffee0000000000aaa',
  accountId: '665f0c0ffee0000000000bbb',
  name: 'Pole za stodołą',
  parcelIds: ['P1', 'P2', 'P3'],
  parcelAreas: { P1: 1, P2: 3, P3: 2 },
  areaHa: 6,
};
const BODY = { cropCode: 'winter_wheat' as const, analysisDate: '2026-06-10' };

type Spec = {
  areaHa: number;
  droughtClass: 'none' | 'moderate' | 'severe' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  rootZonePct: number | null;
  depletionMm: number | null;
  rules: { ruleId: string; order: number }[];
};

function fakeReport(parcelId: string, spec: Spec): ReportDto {
  return {
    id: `report-${parcelId}`,
    status: 'complete',
    parcel: { id: parcelId, areaHa: spec.areaHa },
    crop: { code: 'winter_wheat', name: 'Pszenica ozima' },
    assessment: {
      droughtClass: spec.droughtClass,
      confidence: spec.confidence,
      soilMoistureSatellite: spec.rootZonePct === null ? null : { rootZonePct: spec.rootZonePct },
      soilWater: spec.depletionMm === null ? null : { depletionMm: spec.depletionMm },
    },
    recommendations: spec.rules.map((rule) => ({ ...rule, title: rule.ruleId })),
  } as unknown as ReportDto;
}

function makeDeps(
  specs: Record<string, Spec | Error>,
  member = true,
): FieldReportDeps & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    loadField: async (id) => (id === FIELD.id ? FIELD : null),
    isMember: async () => member,
    analyze: async (body) => {
      calls.push(body.parcelId);
      assert.equal(body.accountId, FIELD.id);
      const spec = specs[body.parcelId]!;
      if (spec instanceof Error) throw spec;
      return fakeReport(body.parcelId, spec);
    },
    now: () => 0,
  };
}

const P1: Spec = {
  areaHa: 1,
  droughtClass: 'severe',
  confidence: 'medium',
  rootZonePct: 20,
  depletionMm: 80,
  rules: [
    { ruleId: 'R-IRR-01', order: 3 },
    { ruleId: 'R-RET-01', order: 1 },
  ],
};
const P2: Spec = {
  areaHa: 3,
  droughtClass: 'moderate',
  confidence: 'high',
  rootZonePct: 40,
  depletionMm: 40,
  rules: [{ ruleId: 'R-RET-01', order: 1 }],
};
const P3: Spec = {
  areaHa: 2,
  droughtClass: 'none',
  confidence: 'low',
  rootZonePct: null,
  depletionMm: 10,
  rules: [],
};

test('summary: worst class, area percentages add up, values weighted by area, lowest confidence', async () => {
  const report = await createFieldReport(FIELD.id, BODY, 'user', makeDeps({ P1, P2, P3 }));

  assert.equal(report.summary.droughtClass, 'severe');
  assert.equal(report.summary.severeAreaPct, 16.7);
  assert.equal(report.summary.moderateAreaPct, 50);
  assert.equal(report.summary.rootZonePctWeighted, 35); // (20*1 + 40*3) / 4, P3 has no value
  assert.equal(report.summary.deficitMmWeighted, 36.7); // (80*1 + 40*3 + 10*2) / 6
  assert.equal(report.summary.confidence, 'low');
  assert.equal(report.areaHa, 6);
  assert.equal(report.parcels.length, 3);
  assert.deepEqual(
    report.recommendations.map((r) => [r.ruleId, r.parcelIds]),
    [
      ['R-RET-01', ['P1', 'P2']],
      ['R-IRR-01', ['P1']],
    ],
  );
});

test('a parcel that fails is listed as failed and the rest of the report is returned', async () => {
  const deps = makeDeps({ P1, P2: new AppError('UPSTREAM_UNAVAILABLE', 'x', 502), P3 });
  const report = await createFieldReport(FIELD.id, BODY, 'user', deps);

  const failed = report.parcels.find((parcel) => parcel.parcelId === 'P2')!;
  assert.equal(failed.status, 'failed');
  assert.equal(failed.reportId, null);
  assert.equal(failed.areaHa, 3); // from the stored field copy
  assert.equal(report.summary.severeAreaPct, 33.3); // over the computed 3 ha
  assert.equal(report.summary.moderateAreaPct, 0);
  assert.equal(deps.calls.length, 3);
});

test('no parcel computed gives 502, unknown field 404, non-member 403', async () => {
  const err = new AppError('UPSTREAM_TIMEOUT', 'x', 504);
  await assert.rejects(
    createFieldReport(FIELD.id, BODY, 'user', makeDeps({ P1: err, P2: err, P3: err })),
    (error: AppError) => error.status === 502 && error.code === 'UPSTREAM_UNAVAILABLE',
  );
  await assert.rejects(
    createFieldReport('665f0c0ffee0000000000ccc', BODY, 'user', makeDeps({ P1, P2, P3 })),
    (error: AppError) => error.status === 404 && error.code === 'FIELD_NOT_FOUND',
  );
  await assert.rejects(
    createFieldReport(FIELD.id, BODY, 'user', makeDeps({ P1, P2, P3 }, false)),
    (error: AppError) => error.status === 403 && error.code === 'NOT_A_MEMBER',
  );
});

test('at most 3 parcel analyses run at the same time', async () => {
  let running = 0;
  let peak = 0;
  const field = { ...FIELD, parcelIds: ['A', 'B', 'C', 'D', 'E'], parcelAreas: {} };
  const deps: FieldReportDeps = {
    loadField: async () => field,
    isMember: async () => true,
    analyze: async (body) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running -= 1;
      return fakeReport(body.parcelId, P2);
    },
    now: () => 0,
  };
  const report = await createFieldReport(field.id, BODY, 'user', deps);
  assert.equal(peak, 3);
  assert.equal(report.parcels.length, 5);
});
