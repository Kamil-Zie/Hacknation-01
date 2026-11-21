// T-042 API-010 API-011 API-012 HTTP tests of account members endpoints (in-memory model fakes, no Atlas)
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll, beforeEach, test, vi } from 'vitest';

import { createApp } from '@/app';
import { signToken } from '@/utils/jwt';

type Row = Record<string, unknown> & { _id: string };

const db = vi.hoisted(() => ({
  users: [] as Row[],
  members: [] as Row[],
  seq: 0,
}));

function matches(row: Row, query: Record<string, unknown>): boolean {
  return Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && '$in' in value) {
      return (value as { $in: unknown[] }).$in.map(String).includes(String(row[key]));
    }
    return String(row[key]) === String(value);
  });
}

function fakeModel(rows: () => Row[]) {
  const find = (q: Record<string, unknown>) => {
    let list = rows().filter((r) => matches(r, q));
    const chain = {
      sort: () => chain,
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
  };
  return {
    find,
    exists: (q: Record<string, unknown>) =>
      Promise.resolve(rows().find((r) => matches(r, q)) ? { _id: 'x' } : null),
    findOne: (q: Record<string, unknown>) =>
      Promise.resolve(rows().find((r) => matches(r, q)) ?? null),
    countDocuments: (q: Record<string, unknown>) =>
      Promise.resolve(rows().filter((r) => matches(r, q)).length),
    create: (data: Record<string, unknown>) => {
      const row = { ...data, _id: (db.seq += 1).toString(16).padStart(24, '0') } as Row;
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

vi.mock('@/models/User.model', () => ({ UserModel: fakeModel(() => db.users) }));
vi.mock('@/models/AccountMember.model', () => ({
  AccountMemberModel: fakeModel(() => db.members),
}));

const ACCOUNT = 'a'.repeat(24);
const JAN = 'b'.repeat(24);
const ANNA = 'c'.repeat(24);
const OUTSIDER = 'd'.repeat(24);

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
  db.users.length = 0;
  db.members.length = 0;
  db.users.push(
    { _id: JAN, email: 'jan@example.com', name: 'Jan Kowalski' },
    { _id: ANNA, email: 'anna@example.com', name: 'Anna Nowak' },
  );
  db.members.push({
    _id: '1'.repeat(24),
    accountId: ACCOUNT,
    userId: JAN,
    email: 'jan@example.com',
    status: 'active',
    addedAt: new Date('2026-11-21T09:00:00Z'),
  });
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

const MEMBERS = `/accounts/${ACCOUNT}/members`;

test('POST existing user e-mail: 201 active with name; new e-mail: 201 pending', async () => {
  const active = await call('POST', MEMBERS, JAN, { email: '  Anna@Example.com ' });
  assert.equal(active.status, 201);
  assert.equal(active.json.status, 'active');
  assert.equal(active.json.email, 'anna@example.com');
  assert.equal(active.json.name, 'Anna Nowak');
  const pending = await call('POST', MEMBERS, JAN, { email: 'new@example.com' });
  assert.equal(pending.status, 201);
  assert.equal(pending.json.status, 'pending');
  assert.equal(pending.json.name, null);
});

test('POST duplicate e-mail: 409 ALREADY_MEMBER; bad e-mail: 422 with details.field', async () => {
  const dup = await call('POST', MEMBERS, JAN, { email: 'JAN@example.com' });
  assert.equal(dup.status, 409);
  assert.equal(dup.json.code, 'ALREADY_MEMBER');
  const bad = await call('POST', MEMBERS, JAN, { email: 'nie-email' });
  assert.equal(bad.status, 422);
  assert.equal(bad.json.code, 'VALIDATION_ERROR');
});

test('GET lists active and pending with pagination', async () => {
  await call('POST', MEMBERS, JAN, { email: 'anna@example.com' });
  await call('POST', MEMBERS, JAN, { email: 'new@example.com' });
  const all = await call('GET', MEMBERS, JAN);
  assert.equal(all.status, 200);
  assert.equal(all.json.total, 3);
  assert.equal(all.json.page, 1);
  assert.equal(all.json.pageSize, 20);
  assert.deepEqual(
    all.json.items.map((m: { status: string }) => m.status),
    ['active', 'active', 'pending'],
  );
  assert.equal(all.json.items[0].name, 'Jan Kowalski');
  const second = await call('GET', `${MEMBERS}?page=2&pageSize=2`, JAN);
  assert.equal(second.json.items.length, 1);
  assert.equal((await call('GET', `${MEMBERS}?pageSize=500`, JAN)).status, 422);
});

test('DELETE the last active member: 409 LAST_MEMBER; pending removal: 204; unknown: 404', async () => {
  const last = await call('DELETE', `${MEMBERS}/${'1'.repeat(24)}`, JAN);
  assert.equal(last.status, 409);
  assert.equal(last.json.code, 'LAST_MEMBER');
  const pending = await call('POST', MEMBERS, JAN, { email: 'new@example.com' });
  const removed = await call('DELETE', `${MEMBERS}/${pending.json.id as string}`, JAN);
  assert.equal(removed.status, 204);
  assert.equal(db.members.length, 1);
  const missing = await call('DELETE', `${MEMBERS}/${'9'.repeat(24)}`, JAN);
  assert.equal(missing.status, 404);
  assert.equal(missing.json.code, 'MEMBER_NOT_FOUND');
  assert.equal((await call('DELETE', `${MEMBERS}/xyz`, JAN)).status, 422);
});

test('DELETE self with another active member present: 204', async () => {
  await call('POST', MEMBERS, JAN, { email: 'anna@example.com' });
  const res = await call('DELETE', `${MEMBERS}/${'1'.repeat(24)}`, JAN);
  assert.equal(res.status, 204);
});

test('non-member: 403 NOT_A_MEMBER on all three; no token: 401', async () => {
  const get = await call('GET', MEMBERS, OUTSIDER);
  assert.equal(get.status, 403);
  assert.equal(get.json.code, 'NOT_A_MEMBER');
  assert.equal((await call('POST', MEMBERS, OUTSIDER, { email: 'x@example.com' })).status, 403);
  assert.equal((await call('DELETE', `${MEMBERS}/${'1'.repeat(24)}`, OUTSIDER)).status, 403);
  const anon = await call('GET', MEMBERS, null);
  assert.equal(anon.status, 401);
  assert.equal(anon.json.code, 'UNAUTHORIZED');
});

test('no database: 503 DB_UNAVAILABLE', async () => {
  vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
  const res = await call('GET', MEMBERS, JAN);
  assert.equal(res.status, 503);
  assert.equal(res.json.code, 'DB_UNAVAILABLE');
});
