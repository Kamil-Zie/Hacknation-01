// T-041 API-009 Bearer auth: requireAuth (401 without valid token), optionalAuth (anonymous allowed); sets req.userId
import type { RequestHandler } from 'express';

import { AppError } from '@/utils/AppError';
import { verifyToken } from '@/utils/jwt';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

function unauthorized(): AppError {
  return new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
}

function userIdFromHeader(header: string | undefined): string {
  const match = /^Bearer (.+)$/.exec(header ?? '');
  const payload = match?.[1] ? verifyToken(match[1]) : null;
  if (!payload) throw unauthorized();
  return payload.sub;
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  try {
    req.userId = userIdFromHeader(req.headers.authorization);
    next();
  } catch (error) {
    next(error);
  }
};

// No Authorization header = anonymous; a present but invalid token = 401.
export const optionalAuth: RequestHandler = (req, _res, next) => {
  if (req.headers.authorization === undefined) {
    next();
    return;
  }
  requireAuth(req, _res, next);
};
