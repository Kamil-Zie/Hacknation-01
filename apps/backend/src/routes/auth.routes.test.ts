// T-041 API-007 API-008 API-009 HTTP tests of /auth/register, /auth/login, /auth/me (in-memory model fakes, no Atlas)
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, beforeEach, test, vi } from 'vitest';

import { createApp } from '@/app';
import { MAX_FAILED_LOGINS, resetLoginLimiter } from '@/services/auth.service';

type Row = Record<string, unknown> & { _id: string };

const db = vi.hoisted(() => ({
  users: [] as Row[],
  accounts: [] as Row[],
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
  const sortable = (list: Row[]) => Object.assign(Promise.resolve(list), { sort: () => list });
  return {
    exists: (q: Record<string, unknown>) =>
      Promise.resolve(rows().find((r) => matches(r, q)) ? { _id: 'x' } : null),
    findOne: (q: Record<string, unknown>) =>
      Promise.resolve(rows().find((r) => matches(r, q)) ?? null),
    findById: (id: string) => Promise.resolve(rows().find((r) => r._id === id) ?? null),
    find: (q: Record<string, unknown>) => sortable(rows().filter((r) => matches(r, q))),
    create: (data: Record<string, unknown>) => {
      const row = { ...data, _id: `id${(db.seq += 1)}` } as Row;
      rows().push(row);
      return Promise.resolve(row);
    },
    updateMany: (q: Record<string, unknown>, update: { $set: Record<string, unknown> }) => {
      rows()
        .filter((r) => matches(r, q))
        .forEach((r) => Object.assign(r, update.$set));
      return Promise.resolve();
    },
  };
}

vi.mock('@/models/User.model', () => ({ UserModel: fakeModel(() => db.users) }));
vi.mock('@/models/Account.model', () => ({ AccountModel: fakeModel(() => db.accounts) }));
vi.mock('@/models/AccountMember.model', () => ({
  AccountMemberModel: fakeModel(() => db.members),
}));

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
  db.users.length = 0;
  db.accounts.length = 0;
  db.members.length = 0;
  resetLoginLimiter();
});

async function post(path: string, body: unknown) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as ReturnType<typeof JSON.parse> };
}

const JAN = { email: 'Jan@Example.com', password: 'tajne-haslo', name: 'Jan Kowalski' };

test('register returns 201 session, never exposes hash, second time 409 EMAIL_TAKEN', async () => {
  const first = await post('/auth/register', JAN);
  assert.equal(first.status, 201);
  assert.equal(first.json.user.email, 'jan@example.com');
  assert.deepEqual(first.json.accounts, [
    { id: first.json.accounts[0].id, name: 'Moje gospodarstwo', memberCount: 1 },
  ]);
  assert.ok(!JSON.stringify(first.json).includes('scrypt$'));
  const second = await post('/auth/register', JAN);
  assert.equal(second.status, 409);
  assert.equal(second.json.code, 'EMAIL_TAKEN');
});

test('register validates input with 422 VALIDATION_ERROR', async () => {
  const res = await post('/auth/register', { ...JAN, password: 'short' });
  assert.equal(res.status, 422);
  assert.equal(res.json.code, 'VALIDATION_ERROR');
});

test('register turns pending invitations for that e-mail into active memberships', async () => {
  db.accounts.push({ _id: 'acc-existing', name: 'Gospodarstwo Nowaków' });
  db.members.push({
    _id: 'inv1',
    accountId: 'acc-existing',
    userId: null,
    email: 'jan@example.com',
    status: 'pending',
  });
  const res = await post('/auth/register', JAN);
  assert.equal(res.status, 201);
  assert.equal(res.json.accounts.length, 2);
  assert.equal(db.members.find((m) => m._id === 'inv1')?.status, 'active');
});

test('login: success 200, wrong password 401, 429 after MAX_FAILED_LOGINS failures with retryAfterSec', async () => {
  await post('/auth/register', JAN);
  const ok = await post('/auth/login', { email: 'jan@example.com', password: JAN.password });
  assert.equal(ok.status, 200);
  assert.ok(typeof ok.json.token === 'string');
  for (let i = 0; i < MAX_FAILED_LOGINS; i += 1) {
    const bad = await post('/auth/login', { email: 'jan@example.com', password: 'zle-haslo-1' });
    assert.equal(bad.status, 401);
    assert.equal(bad.json.code, 'INVALID_CREDENTIALS');
  }
  const blocked = await post('/auth/login', { email: 'jan@example.com', password: JAN.password });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.json.code, 'TOO_MANY_ATTEMPTS');
  assert.ok(blocked.json.details.retryAfterSec > 0);
});

test('me: 401 without token or with bad token, 200 with token from register', async () => {
  const none = await fetch(`${base}/auth/me`);
  assert.equal(none.status, 401);
  assert.equal(((await none.json()) as { code: string }).code, 'UNAUTHORIZED');
  const bad = await fetch(`${base}/auth/me`, { headers: { Authorization: 'Bearer a.b.c' } });
  assert.equal(bad.status, 401);
  const session = await post('/auth/register', JAN);
  const ok = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${session.json.token as string}` },
  });
  assert.equal(ok.status, 200);
  const body = (await ok.json()) as { user: { email: string } };
  assert.equal(body.user.email, 'jan@example.com');
});
