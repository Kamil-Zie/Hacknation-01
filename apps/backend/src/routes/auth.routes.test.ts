// T-041 API-007 API-008 API-009 HTTP tests of /auth/register, /auth/login, /auth/me (in-memory model fakes, no Atlas)
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import mongoose from 'mongoose';
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
    countDocuments: (q: Record<string, unknown>) =>
      Promise.resolve(rows().filter((r) => matches(r, q)).length),
    findByIdAndUpdate: (id: string, update: { $set: Record<string, unknown> }) => {
      const row = rows().find((r) => r._id === id);
      if (row) Object.assign(row, update.$set);
      return Promise.resolve(row ?? null);
    },
    find: (q: Record<string, unknown>) => sortable(rows().filter((r) => matches(r, q))),
    create: (data: Record<string, unknown>) => {
      const row = { ...data, _id: (db.seq += 1).toString(16).padStart(24, '0') } as Row;
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
  // Fake models stand in for Mongo; report the connection as up unless a test says otherwise.
  vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
});

test('without a database connection register, login and me answer 503 DB_UNAVAILABLE at once', async () => {
  vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);
  const startedAt = Date.now();
  const register = await post('/auth/register', JAN);
  const login = await post('/auth/login', { email: 'jan@example.com', password: JAN.password });
  for (const res of [register, login]) {
    assert.equal(res.status, 503);
    assert.equal(res.json.code, 'DB_UNAVAILABLE');
  }
  assert.ok(Date.now() - startedAt < 1000);
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
    { id: first.json.accounts[0].id, name: 'Gospodarstwo Jan Kowalski', memberCount: 1 },
  ]);
  assert.ok(!JSON.stringify(first.json).includes('scrypt$'));
  const second = await post('/auth/register', JAN);
  assert.equal(second.status, 409);
  assert.equal(second.json.code, 'EMAIL_TAKEN');
});

test('register with accountName names the account accordingly', async () => {
  const res = await post('/auth/register', {
    ...JAN,
    accountName: '  Gospodarstwo Rolne Kowalscy ',
  });
  assert.equal(res.status, 201);
  assert.equal(res.json.accounts[0].name, 'Gospodarstwo Rolne Kowalscy');
});

async function patchAccount(accountId: string, token: string | null, body: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}/accounts/${accountId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as ReturnType<typeof JSON.parse> };
}

test('PATCH /accounts/:id renames for a member (visible in /auth/me), 403 stranger, 422 empty, 401 no token', async () => {
  const jan = await post('/auth/register', JAN);
  const anna = await post('/auth/register', {
    email: 'anna@example.com',
    password: 'tajne-haslo',
    name: 'Anna Nowak',
  });
  const accountId = jan.json.accounts[0].id as string;
  const ok = await patchAccount(accountId, jan.json.token, { name: ' Kowalscy ' });
  assert.equal(ok.status, 200);
  assert.deepEqual(ok.json, { id: accountId, name: 'Kowalscy', memberCount: 1 });
  const me = await fetch(`${base}/auth/me`, {
    headers: { Authorization: `Bearer ${jan.json.token as string}` },
  });
  assert.equal(
    ((await me.json()) as { accounts: { name: string }[] }).accounts[0]?.name,
    'Kowalscy',
  );
  const stranger = await patchAccount(accountId, anna.json.token, { name: 'Cudze' });
  assert.equal(stranger.status, 403);
  assert.equal(stranger.json.code, 'NOT_A_MEMBER');
  const empty = await patchAccount(accountId, jan.json.token, { name: '   ' });
  assert.equal(empty.status, 422);
  assert.equal(empty.json.code, 'VALIDATION_ERROR');
  assert.equal((await patchAccount(accountId, null, { name: 'X' })).status, 401);
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

async function patchMe(token: string | null, body: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base}/auth/me`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as ReturnType<typeof JSON.parse> };
}

function tokenLifetimeSec(token: string): number {
  const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()) as {
    iat: number;
    exp: number;
  };
  return payload.exp - payload.iat;
}

test('login rememberMe true gives a 30 day token, false or missing 1 day, register 30 days', async () => {
  const reg = await post('/auth/register', JAN);
  const creds = { email: 'jan@example.com', password: JAN.password };
  const remembered = await post('/auth/login', { ...creds, rememberMe: true });
  const short = await post('/auth/login', { ...creds, rememberMe: false });
  const plain = await post('/auth/login', creds);
  assert.equal(tokenLifetimeSec(reg.json.token), 30 * 86400);
  assert.equal(tokenLifetimeSec(remembered.json.token), 30 * 86400);
  assert.equal(tokenLifetimeSec(short.json.token), 86400);
  assert.equal(tokenLifetimeSec(plain.json.token), 86400);
  assert.equal((await post('/auth/login', { ...creds, rememberMe: 'yes' })).status, 422);
});

test('PATCH /auth/me: name, e-mail (taken 409, memberships follow), password flow, 422 and 401 cases', async () => {
  const jan = await post('/auth/register', JAN);
  await post('/auth/register', {
    email: 'anna@example.com',
    password: 'tajne-haslo',
    name: 'Anna',
  });
  const token = jan.json.token as string;
  assert.equal((await patchMe(null, { name: 'X' })).status, 401);
  const empty = await patchMe(token, {});
  assert.equal(empty.status, 422);
  assert.equal(empty.json.code, 'VALIDATION_ERROR');

  const renamed = await patchMe(token, { name: ' Janusz ' });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.json.user.name, 'Janusz');
  assert.equal(renamed.json.accounts.length, 1);

  const noPass = await patchMe(token, { email: 'jan2@example.com' });
  assert.equal(noPass.status, 422);
  const taken = await patchMe(token, { email: 'Anna@Example.com', currentPassword: JAN.password });
  assert.equal(taken.status, 409);
  assert.equal(taken.json.code, 'EMAIL_TAKEN');
  const changed = await patchMe(token, {
    email: 'Jan2@Example.com',
    currentPassword: JAN.password,
  });
  assert.equal(changed.status, 200);
  assert.equal(changed.json.user.email, 'jan2@example.com');
  assert.ok(db.members.some((m) => m.email === 'jan2@example.com'));

  const noCurrent = await patchMe(token, { newPassword: 'nowe-haslo-1' });
  assert.equal(noCurrent.status, 422);
  const wrong = await patchMe(token, {
    newPassword: 'nowe-haslo-1',
    currentPassword: 'zle-haslo-1',
  });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.json.code, 'INVALID_CREDENTIALS');
  const ok = await patchMe(token, { newPassword: 'nowe-haslo-1', currentPassword: JAN.password });
  assert.equal(ok.status, 200);
  const creds = { email: 'jan2@example.com' };
  assert.equal((await post('/auth/login', { ...creds, password: 'nowe-haslo-1' })).status, 200);
  assert.equal((await post('/auth/login', { ...creds, password: JAN.password })).status, 401);
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
