// T-041 API-007..009 Tests of JWT HS256 sign/verify and scrypt password hashing
import assert from 'node:assert/strict';

import { test } from 'vitest';

import { signToken, verifyToken } from '@/utils/jwt';
import { hashPassword, verifyPassword } from '@/utils/password';

const SECRET = 'test-secret';

test('signToken then verifyToken returns sub with 7 day expiry', () => {
  const token = signToken('user1', { secret: SECRET, nowSec: 1000 });
  const payload = verifyToken(token, { secret: SECRET, nowSec: 1001 });
  assert.deepEqual(payload, { sub: 'user1', iat: 1000, exp: 1000 + 7 * 86400 });
});

test('verifyToken rejects expired token', () => {
  const token = signToken('user1', { secret: SECRET, nowSec: 1000, ttlSec: 10 });
  assert.equal(verifyToken(token, { secret: SECRET, nowSec: 1010 }), null);
});

test('verifyToken rejects tampered payload, wrong secret and garbage', () => {
  const token = signToken('user1', { secret: SECRET, nowSec: 1000 });
  const [h, , s] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ sub: 'admin', iat: 1000, exp: 9e9 })).toString(
    'base64url',
  );
  assert.equal(verifyToken(`${h}.${forged}.${s}`, { secret: SECRET, nowSec: 1001 }), null);
  assert.equal(verifyToken(token, { secret: 'other', nowSec: 1001 }), null);
  assert.equal(verifyToken('abc', { secret: SECRET }), null);
});

test('hashPassword uses scrypt format, random salt, and verifyPassword checks it', async () => {
  const a = await hashPassword('tajne-haslo');
  const b = await hashPassword('tajne-haslo');
  assert.match(a, /^scrypt\$[0-9a-f]{32}\$[0-9a-f]+$/);
  assert.notEqual(a, b);
  assert.equal(await verifyPassword('tajne-haslo', a), true);
  assert.equal(await verifyPassword('inne-haslo', a), false);
  assert.equal(await verifyPassword('x', 'plain'), false);
});
