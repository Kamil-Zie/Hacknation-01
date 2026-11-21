// T-041 API-007..009 JWT HS256 (sign/verify) on node:crypto, payload { sub, iat, exp }
import { createHmac, timingSafeEqual } from 'node:crypto';

import { env } from '@/config/env';

export const TOKEN_TTL_SEC = 7 * 24 * 60 * 60;

export interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

const HEADER = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

function signature(data: string, secret: string): Buffer {
  return createHmac('sha256', secret).update(data).digest();
}

export function signToken(
  userId: string,
  options: { secret?: string; nowSec?: number; ttlSec?: number } = {},
): string {
  const iat = options.nowSec ?? Math.floor(Date.now() / 1000);
  const payload: JwtPayload = { sub: userId, iat, exp: iat + (options.ttlSec ?? TOKEN_TTL_SEC) };
  const data = `${HEADER}.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  return `${data}.${signature(data, options.secret ?? env.JWT_SECRET).toString('base64url')}`;
}

// Returns the payload, or null for a malformed, tampered or expired token.
export function verifyToken(
  token: string,
  options: { secret?: string; nowSec?: number } = {},
): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts as [string, string, string];
  if (header !== HEADER) return null;
  const expected = signature(`${header}.${body}`, options.secret ?? env.JWT_SECRET);
  const actual = Buffer.from(sig, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as JwtPayload;
    const now = options.nowSec ?? Math.floor(Date.now() / 1000);
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    return payload.exp > now ? payload : null;
  } catch {
    return null;
  }
}
