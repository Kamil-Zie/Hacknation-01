// T-066 API-004 API-005 API-008 Tests of CORS check, accountId visibility, rate limits, login limiter per IP, headers, body limit
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, test, vi } from 'vitest';

import { createApp } from '@/app';
import { assertProductionCors } from '@/config/env';
import { setRateLimitEnabled } from '@/middleware/rateLimit';
import { resetLoginLimiter } from '@/services/auth.service';
import { signToken } from '@/utils/jwt';

const REPORT_ID = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const ACCOUNT_ID = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const MEMBER_ID = 'cccccccccccccccccccccccc';
const OTHER_ID = 'dddddddddddddddddddddddd';

vi.mock('@/models/Report.model', () => ({
  ReportModel: {
    findById: () =>
      Promise.resolve({
        toJSON: () => ({ id: 'aaaaaaaaaaaaaaaaaaaaaaaa', accountId: 'b'.repeat(24) }),
      }),
  },
}));
vi.mock('@/models/AccountMember.model', () => ({
  AccountMemberModel: {
    exists: (q: { userId: string; accountId: string }) =>
      Promise.resolve(
        q.userId === 'c'.repeat(24) && q.accountId === 'b'.repeat(24) ? { _id: 1 } : null,
      ),
  },
}));
vi.mock('@/models/User.model', () => ({
  UserModel: {
    findOne: () =>
      Promise.resolve({
        _id: 'c'.repeat(24),
        email: 'jan@example.com',
        name: 'Jan',
        passwordHash: 'x',
      }),
  },
}));
vi.mock('@/utils/password', () => ({
  hashPassword: () => Promise.resolve('x'),
  verifyPassword: (password: string) => Promise.resolve(password === 'dobre-haslo'),
}));
vi.mock('@/services/accounts.service', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/accounts.service')>();
  return { ...actual, listAccountsForUser: () => Promise.resolve([]) };
});

let server: Server;
let base = '';

beforeAll(async () => {
  server = createServer(createApp());
  await new Promise<void>((done) => server.listen(0, done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

afterAll(() => {
  server.close();
  setRateLimitEnabled(false);
});

beforeEach(() => {
  setRateLimitEnabled(false);
  resetLoginLimiter();
  vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
});

async function send(path: string, init: RequestInit = {}, headers: Record<string, string> = {}) {
  return fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function login(password: string, ip: string) {
  return send(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ email: 'jan@example.com', password }) },
    { 'X-Forwarded-For': ip },
  );
}

test('production without CORS_ORIGIN or with localhost throws; dev and a real origin pass', () => {
  assert.throws(() => assertProductionCors('production', undefined), /CORS_ORIGIN/);
  assert.throws(() => assertProductionCors('production', ' '), /CORS_ORIGIN/);
  assert.throws(() => assertProductionCors('production', 'http://localhost:5173'), /CORS_ORIGIN/);
  assert.doesNotThrow(() => assertProductionCors('production', 'https://app.example.pl'));
  assert.doesNotThrow(() => assertProductionCors('development', undefined));
});

test('GET /analyses/:id: anonymous and non-member get accountId null, member gets it', async () => {
  const anonymous = (await (await send(`/analyses/${REPORT_ID}`)).json()) as { accountId: unknown };
  assert.equal(anonymous.accountId, null);
  const other = await send(
    `/analyses/${REPORT_ID}`,
    {},
    { Authorization: `Bearer ${signToken(OTHER_ID)}` },
  );
  assert.equal(((await other.json()) as { accountId: unknown }).accountId, null);
  const member = await send(
    `/analyses/${REPORT_ID}`,
    {},
    { Authorization: `Bearer ${signToken(MEMBER_ID)}` },
  );
  assert.equal(((await member.json()) as { accountId: unknown }).accountId, ACCOUNT_ID);
});

test('GET /analyses/:id with a bad token: 401 UNAUTHORIZED', async () => {
  const res = await send(`/analyses/${REPORT_ID}`, {}, { Authorization: 'Bearer zly' });
  assert.equal(res.status, 401);
});

test('11th POST /analyses within a minute from one IP: 429 RATE_LIMITED with Retry-After', async () => {
  setRateLimitEnabled(true);
  for (let i = 0; i < 10; i += 1) {
    const res = await send(
      '/analyses',
      { method: 'POST', body: '{}' },
      { 'X-Forwarded-For': '10.0.0.1' },
    );
    assert.notEqual(res.status, 429);
  }
  const limited = await send(
    '/analyses',
    { method: 'POST', body: '{}' },
    { 'X-Forwarded-For': '10.0.0.1' },
  );
  assert.equal(limited.status, 429);
  assert.ok(Number(limited.headers.get('retry-after')) >= 1);
  const json = (await limited.json()) as {
    code: string;
    message: string;
    details: { retryAfterSec: number };
  };
  assert.equal(json.code, 'RATE_LIMITED');
  assert.ok(json.details.retryAfterSec >= 1);
  const otherIp = await send(
    '/analyses',
    { method: 'POST', body: '{}' },
    { 'X-Forwarded-For': '10.0.0.2' },
  );
  assert.notEqual(otherIp.status, 429);
});

test('10 failed logins from IP A do not block the owner logging in from IP B', async () => {
  for (let i = 0; i < 10; i += 1) assert.equal((await login('zle', '10.0.1.1')).status, 401);
  assert.equal((await login('zle', '10.0.1.1')).status, 429);
  assert.equal((await login('dobre-haslo', '10.0.1.2')).status, 200);
});

test('security headers are present and X-Powered-By is absent', async () => {
  const res = await send('/health');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(res.headers.get('cross-origin-resource-policy'), 'same-site');
  assert.equal(res.headers.get('x-powered-by'), null);
});

test('JSON body over 20 KB: 413 PAYLOAD_TOO_LARGE in the API error format', async () => {
  const res = await send('/analyses', {
    method: 'POST',
    body: JSON.stringify({ x: 'a'.repeat(25000) }),
  });
  assert.equal(res.status, 413);
  const json = (await res.json()) as Record<string, unknown>;
  assert.deepEqual(Object.keys(json).sort(), ['code', 'details', 'message']);
  assert.equal(json.code, 'PAYLOAD_TOO_LARGE');
});
