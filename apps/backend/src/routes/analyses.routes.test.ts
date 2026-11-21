// T-017 T-018 API-004 API-005 HTTP tests of POST /analyses and GET /analyses/:id (mocked sources, no network, no Atlas)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, test, vi } from 'vitest';

import { createApp } from '@/app';
import { ReportModel } from '@/models/Report.model';
import type { AnalysesDeps } from '@/services/analyses.service';
import type { SatelliteObservation } from '@/services/engine/satellite';
import type { SoilLayer } from '@/services/engine/soil';
import type { CachedEntry, SourceCacheStore } from '@/services/sources/cache.service';
import type { ElevationData } from '@/services/sources/elevation.source';
import { fetchMeteo } from '@/services/sources/meteo.source';
import type { parseOpenMeteoResponse } from '@/services/sources/meteo.source';
import type { HydroData } from '@/services/sources/overpass.source';
import type { parsePowerResponse } from '@/services/sources/nasaPower.source';
import type { SourceId, SourceResult } from '@/services/sources/types';
import { parseUldkResponse } from '@/services/sources/uldk.source';
import type { ParcelData } from '@/services/sources/uldk.source';
import { signToken } from '@/utils/jwt';

// The controller calls the service with default deps; the mock injects per-test deps (real service logic stays).
const holder = vi.hoisted(() => ({
  deps: null as unknown,
  memberships: [] as string[], // "userId:accountId" pairs with an active membership
  saved: [] as Record<string, unknown>[],
}));
vi.mock('@/services/analyses.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/analyses.service')>();
  return {
    ...actual,
    createAnalysis: (
      body: Parameters<typeof actual.createAnalysis>[0],
      _deps: unknown,
      userId?: string,
    ) => actual.createAnalysis(body, (holder.deps as AnalysesDeps | null) ?? undefined, userId),
  };
});
vi.mock('@/models/AccountMember.model', () => ({
  AccountMemberModel: {
    exists: (q: { userId: string; accountId: string }) =>
      Promise.resolve(
        holder.memberships.includes(`${q.userId}:${q.accountId}`) ? { _id: 'x' } : null,
      ),
  },
}));

const FIXTURES = resolve(process.cwd(), 'src/services/sources/__fixtures__');
const OPEN_METEO = JSON.parse(
  readFileSync(resolve(FIXTURES, 'open-meteo-synthetic-51.44-21.93.json'), 'utf8'),
) as Parameters<typeof parseOpenMeteoResponse>[0];
const NASA = JSON.parse(
  readFileSync(resolve(FIXTURES, 'nasa-power-51.44-21.93.json'), 'utf8'),
) as Parameters<typeof parsePowerResponse>[0];
const PARCEL = parseUldkResponse(
  readFileSync(resolve(FIXTURES, 'uldk-061409_2.0009.612.txt'), 'utf8'),
) as ParcelData;

const SAVED_ID = '6740a1f3c2e4b5a1d8f90a11';
const SOIL_LAYERS: SoilLayer[] = [
  { topCm: 0, bottomCm: 30, sandPct: 60, clayPct: 13, socPct: 1.1 },
  { topCm: 30, bottomCm: 100, sandPct: 60, clayPct: 13, socPct: 0.8 },
];
const ELEVATION: ElevationData = {
  minM: 180,
  maxM: 186,
  meanM: 183,
  elevationDiffM: 6,
  slopePct: 4,
  aspect: 'południe',
  lowestPoint: { lat: 51.43, lon: 21.92 },
};
const HYDRO: HydroData = {
  radiusM: 1000,
  counts: { river: 0, stream: 1, canal: 0, ditch: 1, drain: 0, water: 0, reservoir: 0, wetland: 0 },
  nearestDitchDistanceM: 812,
  nearestDitchPoint: { lat: 51.44, lon: 21.93 },
  nearestDitchType: 'stream',
  nearestWatercourseName: 'Klikawka',
  nearestReservoirDistanceM: null,
  hasReservoirWithin1km: false,
  hasWetlandWithin1km: false,
};
const SATELLITE: SatelliteObservation = {
  sceneId: 'S2B_34UDD_20250714_0_L2A',
  sceneDate: '2025-07-14',
  ageDays: 1,
  validPixelFraction: 0.97,
  validPixels: 120,
  ndvi: 0.62,
  ndmi: 0.08,
  thumbnailUrl: null,
  ndviAssessment: 'normal',
  ndmiAssessment: 'normal',
  expected: { ndviMin: 0.5, ndviMax: 0.8, ndmiMin: 0.15, ndmiMax: 0.4 },
};
const BODY = {
  parcelId: '061409_2.0009.612',
  cropCode: 'winter_wheat',
  analysisDate: '2026-06-10',
};
const REPORT_KEYS = [
  'id',
  'status',
  'assessment',
  'vulnerability',
  'causes',
  'recommendations',
  'sources',
  'dataGaps',
  'limitations',
  'charts',
  'methodologyVersion',
  'computedAt',
  'createdAt',
];

function memoryCache(): SourceCacheStore {
  const store = new Map<string, CachedEntry>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, _sourceId, payload, _ttlMs, dataPeriod) => {
      store.set(key, { payload, dataPeriod, fetchedAt: new Date() });
    },
  };
}

const fetchFn = (async (url: string) => {
  if (url.includes('power.larc.nasa.gov')) {
    return { ok: true, status: 200, json: async () => NASA };
  }
  return { ok: true, status: 200, json: async () => OPEN_METEO };
}) as unknown as typeof fetch;

function sourceResult<T>(
  sourceId: SourceId,
  status: SourceResult<T>['status'],
  data: T | null,
): SourceResult<T> {
  return {
    sourceId,
    status,
    data,
    message: status === 'error' ? 'mock error' : null,
    fetchedAt: new Date(),
    dataPeriod: null,
    durationMs: 3,
  };
}

function okSource(sourceId: SourceId, data: unknown) {
  return async (): Promise<SourceResult<unknown>> => sourceResult(sourceId, 'ok', data);
}

function makeDeps(
  options: {
    parcel?: 'ok' | 'missing' | 'error';
    soilgridsError?: boolean;
    realSave?: boolean;
  } = {},
): AnalysesDeps {
  const cache = memoryCache();
  const parcelStatus = options.parcel ?? 'ok';
  return {
    fetchParcel: async () =>
      sourceResult('uldk', parcelStatus, parcelStatus === 'ok' ? PARCEL : null),
    fetchMeteo: (lat, lon, date, signal) => fetchMeteo(lat, lon, date, signal, { cache, fetchFn }),
    fetchers: {
      sentinel2: okSource('sentinel2', SATELLITE),
      soilgrids: options.soilgridsError
        ? async () => sourceResult('soilgrids', 'error', null)
        : okSource('soilgrids', SOIL_LAYERS),
      elevation: okSource('elevation', ELEVATION),
      overpass: okSource('overpass', HYDRO),
    },
    // Same contract as the default saveReport: without a connection return an id and do not save.
    saveReport: async (report) => {
      holder.saved.push(report as unknown as Record<string, unknown>);
      if (mongoose.connection.readyState !== 1) return new mongoose.Types.ObjectId().toString();
      return SAVED_ID;
    },
    now: () => new Date(),
    budgetMs: 25000,
  };
}

// The full engine run (10-year Penman-Monteith band) takes several seconds on a loaded machine.
const SLOW_MS = 30000;

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer(createApp());
  await new Promise<void>((done) => server.listen(0, done));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

afterAll(async () => {
  await new Promise((done) => server.close(done));
});

afterEach(() => {
  holder.deps = null;
  holder.memberships.length = 0;
  holder.saved.length = 0;
  vi.restoreAllMocks();
});

type Json = {
  id: string;
  status: string;
  code: string;
  message: string;
  details?: { field?: string };
  charts: { kbw60Series: unknown[] };
  methodologyVersion: string;
  dataGaps: { sourceId: string }[];
  [key: string]: unknown;
};
type Result = { status: number; json: Json };

async function post(body?: unknown, token?: string): Promise<Result> {
  const response = await fetch(`${baseUrl}/analyses`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, json: (await response.json()) as Json };
}

async function get(id: string): Promise<Result> {
  const response = await fetch(`${baseUrl}/analyses/${id}`);
  return { status: response.status, json: (await response.json()) as Json };
}

// Error format is always exactly { code, message, details } (details may be null).
function assertError(result: Result, status: number, code: string, field?: string) {
  assert.equal(result.status, status);
  assert.deepEqual(Object.keys(result.json).sort(), ['code', 'details', 'message']);
  assert.equal(result.json.code, code);
  assert.equal(typeof result.json.message, 'string');
  if (field) assert.equal(result.json.details?.field, field);
}

function isoDate(offsetDays: number, offsetYears = 0): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + offsetYears);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

test(
  'POST /analyses valid body: 201 with the report shape',
  async () => {
    holder.deps = makeDeps();
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    const result = await post(BODY);

    assert.equal(result.status, 201);
    for (const key of REPORT_KEYS) assert.ok(key in result.json, `missing key ${key}`);
    assert.match(result.json.id, /^[0-9a-f]{24}$/);
    assert.equal(result.json.status, 'complete');
    assert.ok(Array.isArray(result.json.charts.kbw60Series));
    assert.equal(result.json.methodologyVersion, 'kropla-1.0');
  },
  SLOW_MS,
);

test('POST /analyses invalid parcelId: 422 with field parcelId', async () => {
  holder.deps = makeDeps();
  assertError(await post({ ...BODY, parcelId: 'zle' }), 422, 'VALIDATION_ERROR', 'parcelId');
});

test('POST /analyses invalid cropCode: 422 with field cropCode', async () => {
  holder.deps = makeDeps();
  assertError(await post({ ...BODY, cropCode: 'banana' }), 422, 'VALIDATION_ERROR', 'cropCode');
});

test('POST /analyses date in the future: 422 with field analysisDate', async () => {
  holder.deps = makeDeps();
  const result = await post({ ...BODY, analysisDate: isoDate(3) });
  assertError(result, 422, 'VALIDATION_ERROR', 'analysisDate');
});

test('POST /analyses date older than 10 years: 422 with field analysisDate', async () => {
  holder.deps = makeDeps();
  const result = await post({ ...BODY, analysisDate: isoDate(-3, -10) });
  assertError(result, 422, 'VALIDATION_ERROR', 'analysisDate');
});

test('POST /analyses without a body: 422 VALIDATION_ERROR', async () => {
  holder.deps = makeDeps();
  assertError(await post(), 422, 'VALIDATION_ERROR');
});

test('POST /analyses ULDK unavailable without cache: 502 UPSTREAM_UNAVAILABLE', async () => {
  holder.deps = makeDeps({ parcel: 'error' });
  assertError(await post(BODY), 502, 'UPSTREAM_UNAVAILABLE');
});

test('POST /analyses parcel does not exist: 404 PARCEL_NOT_FOUND', async () => {
  holder.deps = makeDeps({ parcel: 'missing' });
  assertError(await post(BODY), 404, 'PARCEL_NOT_FOUND');
});

test(
  'POST /analyses one source fails: 201 partial with a soilgrids data gap',
  async () => {
    holder.deps = makeDeps({ soilgridsError: true });
    const result = await post(BODY);

    assert.equal(result.status, 201);
    assert.equal(result.json.status, 'partial');
    const gapIds = (result.json.dataGaps as { sourceId: string }[]).map((gap) => gap.sourceId);
    assert.ok(gapIds.includes('soilgrids'));
  },
  SLOW_MS,
);

test(
  'no database: POST returns 201 with an id (not saved), GET returns 503 DB_UNAVAILABLE',
  async () => {
    holder.deps = makeDeps();
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
    const created = await post(BODY);
    assert.equal(created.status, 201);
    assert.match(created.json.id, /^[0-9a-f]{24}$/);

    assertError(await get(created.json.id), 503, 'DB_UNAVAILABLE');
  },
  SLOW_MS,
);

const USER_ID = '665f0c0ffee0000000000aaa';
const ACCOUNT_ID = '665f0c0ffee0000000000bbb';

test('POST /analyses with accountId and no token: 401 UNAUTHORIZED, sources not called', async () => {
  const deps = makeDeps();
  const fetchParcel = vi.fn(deps.fetchParcel);
  holder.deps = { ...deps, fetchParcel };
  assertError(await post({ ...BODY, accountId: ACCOUNT_ID }), 401, 'UNAUTHORIZED');
  assert.equal(fetchParcel.mock.calls.length, 0);
});

test('POST /analyses with a foreign accountId: 403 NOT_A_MEMBER, sources not called', async () => {
  const deps = makeDeps();
  const fetchParcel = vi.fn(deps.fetchParcel);
  holder.deps = { ...deps, fetchParcel };
  const result = await post({ ...BODY, accountId: ACCOUNT_ID }, signToken(USER_ID));
  assertError(result, 403, 'NOT_A_MEMBER');
  assert.equal(fetchParcel.mock.calls.length, 0);
});

test('POST /analyses with a malformed accountId: 422 with field accountId', async () => {
  holder.deps = makeDeps();
  const result = await post({ ...BODY, accountId: 'xyz' }, signToken(USER_ID));
  assertError(result, 422, 'VALIDATION_ERROR', 'accountId');
});

test(
  'POST /analyses by a member: report saved and returned with accountId',
  async () => {
    holder.deps = makeDeps();
    holder.memberships.push(`${USER_ID}:${ACCOUNT_ID}`);
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    const result = await post({ ...BODY, accountId: ACCOUNT_ID }, signToken(USER_ID));
    assert.equal(result.status, 201);
    assert.equal(result.json.accountId, ACCOUNT_ID);
    assert.equal(holder.saved[0]?.accountId, ACCOUNT_ID);
  },
  SLOW_MS,
);

test(
  'POST /analyses anonymous and logged in without accountId: 201 with accountId null (regression)',
  async () => {
    holder.deps = makeDeps();
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
    const anonymous = await post(BODY);
    assert.equal(anonymous.status, 201);
    assert.equal(anonymous.json.accountId, null);
    const loggedIn = await post(BODY, signToken(USER_ID));
    assert.equal(loggedIn.status, 201);
    assert.equal(loggedIn.json.accountId, null);
    assert.equal(holder.saved[0]?.accountId, null);
  },
  SLOW_MS,
);

test('GET /analyses/:id invalid format: 422 with field id', async () => {
  assertError(await get('abc'), 422, 'VALIDATION_ERROR', 'id');
});

test('GET /analyses/:id missing report: 404 REPORT_NOT_FOUND', async () => {
  vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
  vi.spyOn(ReportModel, 'findById').mockResolvedValue(null as never);
  assertError(await get('000000000000000000000000'), 404, 'REPORT_NOT_FOUND');
});
