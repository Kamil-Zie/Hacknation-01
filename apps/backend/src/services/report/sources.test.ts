// T-018 DM-011 tests: buildSourceStatuses mapping/order and reportStatus rule
import assert from 'node:assert/strict';

import { test } from 'vitest';

import { buildSourceStatuses, reportStatus } from '@/services/report/sources';
import type { SourceId, SourceResult, SourceStatusValue } from '@/services/sources/types';

function result(sourceId: SourceId, status: SourceStatusValue = 'ok'): SourceResult<unknown> {
  return {
    sourceId,
    status,
    data: null,
    message: null,
    fetchedAt: status === 'ok' ? new Date('2026-11-21T10:00:00Z') : null,
    dataPeriod: null,
    durationMs: 10,
  };
}

const MANDATORY: SourceId[] = [
  'uldk',
  'meteo',
  'sentinel2',
  'era5land',
  'soilgrids',
  'elevation',
  'overpass',
];

test('maps results with catalog data in catalog order', () => {
  const statuses = buildSourceStatuses([
    result('soilgrids'),
    { ...result('uldk'), role: 'current' },
  ]);
  assert.deepEqual(
    statuses.map((s) => s.sourceId),
    ['uldk', 'soilgrids'],
  );
  assert.equal(statuses[0]?.role, 'current');
  assert.equal(statuses[1]?.role, null);
  assert.equal(statuses[1]?.provider, 'ISRIC – World Soil Information');
  assert.equal(statuses[1]?.license, 'CC BY 4.0');
});

test('attribution only for sources that have it', () => {
  const statuses = buildSourceStatuses([result('era5land'), result('uldk')]);
  assert.equal(
    statuses.find((s) => s.sourceId === 'era5land')?.attribution?.includes('Copernicus'),
    true,
  );
  assert.equal('attribution' in (statuses.find((s) => s.sourceId === 'uldk') ?? {}), false);
});

test('complete when mandatory ok/cached and eumetsat missing', () => {
  const all = [
    ...MANDATORY.map((id) => result(id)),
    result('eumetsat', 'missing'),
    result('nasa_power'),
  ];
  assert.equal(reportStatus(buildSourceStatuses(all)), 'complete');
});

test('partial when a mandatory source fails', () => {
  for (const status of ['error', 'timeout', 'missing'] as const) {
    const all = MANDATORY.map((id) => result(id, id === 'sentinel2' ? status : 'ok'));
    assert.equal(reportStatus(buildSourceStatuses(all)), 'partial');
  }
});
