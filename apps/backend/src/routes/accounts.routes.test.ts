// T-043 API-013 HTTP tests of GET /accounts/:accountId/reports (membership and Report model faked, no Atlas)
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, test, vi } from 'vitest';

import { createApp } from '@/app';
import { ReportModel } from '@/models/Report.model';
import { signToken } from '@/utils/jwt';

const db = vi.hoisted(() => ({ memberships: [] as string[] }));

vi.mock('@/models/AccountMember.model', () => ({
  AccountMemberModel: {
    exists: (q: { userId: string; accountId: string }) =>
      Promise.resolve(db.memberships.includes(`${q.userId}:${q.accountId}`) ? { _id: 'x' } : null),
  },
}));

const USER_ID = '665f0c0ffee0000000000aaa';
const ACCOUNT_ID = '665f0c0ffee0000000000bbb';
const OTHER_ACCOUNT_ID = '665f0c0ffee0000000000ccc';

function row(n: number, withAssessment = true) {
  return {
    _id: `665f0c0ffee00000000010${n}`,
    parcel: {
      id: '061409_2.0009.612',
      parcelNumber: '612',
      region: 'Bronowice',
      commune: 'Puławy',
    },
    crop: { code: 'winter_wheat', name: 'Pszenica ozima' },
    analysisDate: '2026-06-10',
    status: 'complete',
    ...(withAssessment ? { assessment: { droughtClass: 'severe' } } : {}),
    createdAt: new Date(Date.UTC(2026, 10, 21, 10, n)),
  };
}

// Fake of the find().sort().skip().limit().lean() chain; records the arguments.
const calls = { sort: null as unknown, skip: -1, limit: -1, projection: null as unknown };
function stubReports(rows: ReturnType<typeof row>[], total: number) {
  vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
  vi.spyOn(ReportModel, 'find').mockImplementation(((_q: unknown, projection: unknown) => {
    calls.projection = projection;
    const chain = {
      sort: (s: unknown) => ((calls.sort = s), chain),
      skip: (n: number) => ((calls.skip = n), chain),
      limit: (n: number) => ((calls.limit = n), chain),
      lean: () => Promise.resolve(rows),
    };
    return chain;
  }) as never);
  vi.spyOn(ReportModel, 'countDocuments').mockResolvedValue(total as never);
}

let server: Server;
let base = '';

beforeAll(async () => {
  server = createServer(createApp());
  await new Promise<void>((done) => server.listen(0, done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

afterAll(() => {
  server.close();
});

afterEach(() => {
  db.memberships.length = 0;
  vi.restoreAllMocks();
});

async function getReports(path: string, token?: string) {
  const res = await fetch(`${base}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, json: (await res.json()) as ReturnType<typeof JSON.parse> };
}

test('401 UNAUTHORIZED without a token', async () => {
  const res = await getReports(`/accounts/${ACCOUNT_ID}/reports`);
  assert.equal(res.status, 401);
  assert.equal(res.json.code, 'UNAUTHORIZED');
});

test('403 NOT_A_MEMBER for a foreign account', async () => {
  db.memberships.push(`${USER_ID}:${OTHER_ACCOUNT_ID}`);
  const res = await getReports(`/accounts/${ACCOUNT_ID}/reports`, signToken(USER_ID));
  assert.equal(res.status, 403);
  assert.equal(res.json.code, 'NOT_A_MEMBER');
});

test('422 VALIDATION_ERROR for a bad accountId, page and pageSize', async () => {
  const token = signToken(USER_ID);
  const badId = await getReports('/accounts/xyz/reports', token);
  assert.equal(badId.status, 422);
  assert.equal(badId.json.details.field, 'accountId');
  const badPage = await getReports(`/accounts/${ACCOUNT_ID}/reports?page=0`, token);
  assert.equal(badPage.status, 422);
  assert.equal(badPage.json.details.field, 'page');
  const badSize = await getReports(`/accounts/${ACCOUNT_ID}/reports?pageSize=101`, token);
  assert.equal(badSize.status, 422);
  assert.equal(badSize.json.details.field, 'pageSize');
});

test('200 returns ReportSummary items, newest first, defaults page 1 / pageSize 20', async () => {
  db.memberships.push(`${USER_ID}:${ACCOUNT_ID}`);
  stubReports([row(2), row(1, false)], 2);
  const res = await getReports(`/accounts/${ACCOUNT_ID}/reports`, signToken(USER_ID));
  assert.equal(res.status, 200);
  assert.equal(res.json.page, 1);
  assert.equal(res.json.pageSize, 20);
  assert.equal(res.json.total, 2);
  assert.deepEqual(calls.sort, { createdAt: -1 });
  assert.equal(calls.skip, 0);
  assert.equal(calls.limit, 20);
  assert.deepEqual(Object.keys(res.json.items[0]).sort(), [
    'analysisDate',
    'createdAt',
    'crop',
    'droughtClass',
    'id',
    'parcel',
    'status',
  ]);
  assert.deepEqual(res.json.items[0], {
    id: '665f0c0ffee000000000102',
    parcel: {
      id: '061409_2.0009.612',
      parcelNumber: '612',
      region: 'Bronowice',
      commune: 'Puławy',
    },
    crop: { code: 'winter_wheat', name: 'Pszenica ozima' },
    analysisDate: '2026-06-10',
    status: 'complete',
    droughtClass: 'severe',
    createdAt: '2026-11-21T10:02:00.000Z',
  });
  assert.equal(res.json.items[1].droughtClass, 'unknown');
});

test('pagination: page 3 with pageSize 5 skips 10 documents', async () => {
  db.memberships.push(`${USER_ID}:${ACCOUNT_ID}`);
  stubReports([row(1)], 11);
  const res = await getReports(
    `/accounts/${ACCOUNT_ID}/reports?page=3&pageSize=5`,
    signToken(USER_ID),
  );
  assert.equal(res.status, 200);
  assert.deepEqual([res.json.page, res.json.pageSize, res.json.total], [3, 5, 11]);
  assert.equal(calls.skip, 10);
  assert.equal(calls.limit, 5);
});
