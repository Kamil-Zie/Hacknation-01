// T-078 API-019 HTTP tests of POST /fields/:fieldId/analyses: auth, validation, 503 without a database
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, test } from 'vitest';

import { createApp } from '@/app';
import { signToken } from '@/utils/jwt';

let server: Server;
let base: string;

beforeAll(async () => {
  server = createServer(createApp());
  await new Promise<void>((done) => server.listen(0, done));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

afterAll(() => {
  server.close();
});

const FIELD = '665f0c0ffee0000000000aaa';
const BODY = { cropCode: 'winter_wheat', analysisDate: '2026-06-10' };

async function post(fieldId: string, body: unknown, auth = true) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${signToken('665f0c0ffee0000000000bbb')}`;
  const res = await fetch(`${base}/fields/${fieldId}/analyses`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as { code: string; details: unknown } };
}

test('without a token: 401 UNAUTHORIZED', async () => {
  const res = await post(FIELD, BODY, false);
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 'UNAUTHORIZED');
});

test('bad field id or body: 422 VALIDATION_ERROR with the field name', async () => {
  const badId = await post('abc', BODY);
  assert.equal(badId.status, 422);
  assert.deepEqual((badId.body.details as { field: string }).field, 'fieldId');
  const badCrop = await post(FIELD, { ...BODY, cropCode: 'banana' });
  assert.equal(badCrop.status, 422);
  assert.deepEqual((badCrop.body.details as { field: string }).field, 'cropCode');
});

test('valid request without a database connection: 503 DB_UNAVAILABLE', async () => {
  const res = await post(FIELD, BODY);
  assert.equal(res.status, 503);
  assert.equal(res.body.code, 'DB_UNAVAILABLE');
});
