// T-077 API-016 API-017 API-018 HTTP tests of field endpoints (in-memory model fakes, stubbed ULDK, no Atlas)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';

import type { Geometry, Position } from 'geojson';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, beforeEach, test, vi } from 'vitest';

import { createApp } from '@/app';
import { parseUldkResponse } from '@/services/sources/uldk.source';
import type { ParcelData } from '@/services/sources/uldk.source';
import { signToken } from '@/utils/jwt';

type Row = Record<string, unknown> & { _id: string };

const db = vi.hoisted(() => ({
  members: [] as Row[],
  fields: [] as Row[],
  seq: 0,
}));

const uldk = vi.hoisted(() => ({ parcels: new Map<string, unknown>() }));

vi.mock('@/services/sources/uldk.source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/sources/uldk.source')>()),
  fetchParcelById: (id: string) => {
    const data = uldk.parcels.get(id);
    return Promise.resolve(
      data ? { status: 'ok', data, fetchedAt: new Date() } : { status: 'missing', data: null },
    );
  },
}));

function matches(row: Row, query: Record<string, unknown>): boolean {
  return Object.entries(query).every(([key, value]) => String(row[key]) === String(value));
}

function fakeModel(rows: () => Row[]) {
  return {
    find: (q: Record<string, unknown>) => {
      let list = rows().filter((r) => matches(r, q));
      const chain = {
        sort: () => {
          list = [...list].reverse();
          return chain;
        },
        skip: (n: number) => {
          list = list.slice(n);
          return chain;
        },
        limit: (n: number) => {
          list = list.slice(0, n);
          return chain;
        },
        then: (resolve: (value: Row[]) => unknown) => Promise.resolve(list).then(resolve),
      };
      return chain;
    },
    exists: (q: Record<string, unknown>) =>
      Promise.resolve(rows().find((r) => matches(r, q)) ? { _id: 'x' } : null),
    findOne: (q: Record<string, unknown>) =>
      Promise.resolve(rows().find((r) => matches(r, q)) ?? null),
    countDocuments: (q: Record<string, unknown>) =>
      Promise.resolve(rows().filter((r) => matches(r, q)).length),
    create: (data: Record<string, unknown>) => {
      const now = new Date('2026-11-21T21:30:00Z');
      const row = {
        ...data,
        _id: (db.seq += 1).toString(16).padStart(24, '0'),
        createdAt: now,
        updatedAt: now,
      } as Row;
      rows().push(row);
      return Promise.resolve(row);
    },
    deleteOne: (q: Record<string, unknown>) => {
      const index = rows().findIndex((r) => matches(r, q));
      if (index >= 0) rows().splice(index, 1);
      return Promise.resolve();
    },
  };
}

vi.mock('@/models/AccountMember.model', () => ({
  AccountMemberModel: fakeModel(() => db.members),
}));
vi.mock('@/models/Field.model', () => ({ FieldModel: fakeModel(() => db.fields) }));

const ACCOUNT = 'a'.repeat(24);
const JAN = 'b'.repeat(24);
const OUTSIDER = 'd'.repeat(24);

const base612 = parseUldkResponse(
  readFileSync(
    join(__dirname, '../services/sources/__fixtures__/uldk-061409_2.0009.612.txt'),
    'utf8',
  ),
) as ParcelData;

function shifted(id: string, dLon: number, dLat: number): ParcelData {
  const move = (ring: Position[]) =>
    ring.map(([lon, lat]) => [(lon ?? 0) + dLon, (lat ?? 0) + dLat]);
  const geometry = {
    type: 'Polygon',
    coordinates: (base612.geometry as { coordinates: Position[][] }).coordinates.map(move),
  } as Geometry;
  return {
    ...base612,
    id,
    parcelNumber: id.split('.').pop() ?? '',
    geometry,
    centroid: { lat: base612.centroid.lat + dLat, lon: base612.centroid.lon + dLon },
  };
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

beforeEach(() => {
  vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
  db.members.length = 0;
  db.fields.length = 0;
  db.members.push({
    _id: '1'.repeat(24),
    accountId: ACCOUNT,
    userId: JAN,
    email: 'jan@example.com',
    status: 'active',
  });
  uldk.parcels.clear();
  uldk.parcels.set('061409_2.0009.612', base612);
  uldk.parcels.set('061409_2.0009.613', shifted('061409_2.0009.613', 0.0047, 0.0008));
  uldk.parcels.set('061409_2.0009.700', shifted('061409_2.0009.700', 0.01, 0.002));
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function call(method: string, path: string, user: string | null, body?: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (user) headers.Authorization = `Bearer ${signToken(user)}`;
  const res = await fetch(`${base}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return {
    status: res.status,
    json: (text ? JSON.parse(text) : null) as ReturnType<typeof JSON.parse>,
  };
}

const FIELDS = `/accounts/${ACCOUNT}/fields`;
const PAIR = { name: 'Pole za stodołą', parcelIds: ['061409_2.0009.612', '061409_2.0009.613'] };

test('POST two adjacent parcels: 201 with summed area and copies of parcel metadata', async () => {
  const res = await call('POST', FIELDS, JAN, PAIR);
  assert.equal(res.status, 201);
  assert.equal(res.json.name, 'Pole za stodołą');
  assert.equal(res.json.accountId, ACCOUNT);
  assert.equal(res.json.createdBy, JAN);
  assert.equal(res.json.parcels.length, 2);
  assert.equal(res.json.parcels[0].commune, 'Puławy');
  assert.equal(res.json.areaHa, Math.round(base612.areaHa * 2 * 1e4) / 1e4);
  assert.ok(res.json.centroid.lon > base612.centroid.lon);
  assert.equal(res.json.createdAt, '2026-11-21T21:30:00.000Z');
});

test('POST non-adjacent parcel: 422 PARCELS_NOT_ADJACENT with the loose id', async () => {
  const res = await call('POST', FIELDS, JAN, {
    name: 'Daleko',
    parcelIds: ['061409_2.0009.612', '061409_2.0009.700'],
  });
  assert.equal(res.status, 422);
  assert.equal(res.json.code, 'PARCELS_NOT_ADJACENT');
  assert.deepEqual(res.json.details, { parcelIds: ['061409_2.0009.700'], maxDistanceM: 50 });
});

test('POST by a non-member: 403 NOT_A_MEMBER', async () => {
  const res = await call('POST', FIELDS, OUTSIDER, PAIR);
  assert.equal(res.status, 403);
  assert.equal(res.json.code, 'NOT_A_MEMBER');
});

test('POST validation: one parcel, duplicates, empty name -> 422 VALIDATION_ERROR', async () => {
  for (const body of [
    { name: 'X', parcelIds: ['061409_2.0009.612'] },
    { name: 'X', parcelIds: ['061409_2.0009.612', '061409_2.0009.612'] },
    { name: '  ', parcelIds: PAIR.parcelIds },
  ]) {
    const res = await call('POST', FIELDS, JAN, body);
    assert.equal(res.status, 422);
    assert.equal(res.json.code, 'VALIDATION_ERROR');
  }
});

test('POST unknown parcel: 404 PARCEL_NOT_FOUND with parcelId', async () => {
  const res = await call('POST', FIELDS, JAN, {
    name: 'X',
    parcelIds: ['061409_2.0009.612', '061409_2.0009.99999'],
  });
  assert.equal(res.status, 404);
  assert.equal(res.json.code, 'PARCEL_NOT_FOUND');
  assert.deepEqual(res.json.details, { parcelId: '061409_2.0009.99999' });
});

test('GET lists newest first with pagination; non-member gets 403', async () => {
  await call('POST', FIELDS, JAN, { ...PAIR, name: 'Pierwsze' });
  await call('POST', FIELDS, JAN, { ...PAIR, name: 'Drugie' });
  const res = await call('GET', `${FIELDS}?page=1&pageSize=1`, JAN);
  assert.equal(res.status, 200);
  assert.equal(res.json.total, 2);
  assert.equal(res.json.pageSize, 1);
  assert.equal(res.json.items.length, 1);
  assert.equal(res.json.items[0].name, 'Drugie');
  assert.equal((await call('GET', `${FIELDS}?pageSize=51`, JAN)).status, 422);
  assert.equal((await call('GET', FIELDS, OUTSIDER)).status, 403);
});

test('DELETE removes the field (204), then 404 FIELD_NOT_FOUND', async () => {
  const created = await call('POST', FIELDS, JAN, PAIR);
  const path = `${FIELDS}/${created.json.id}`;
  assert.equal((await call('DELETE', path, JAN)).status, 204);
  const again = await call('DELETE', path, JAN);
  assert.equal(again.status, 404);
  assert.equal(again.json.code, 'FIELD_NOT_FOUND');
  assert.equal((await call('GET', FIELDS, JAN)).json.total, 0);
});
