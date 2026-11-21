// T-001 Converts any error into { code, message, details } response
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError } from '@/utils/AppError';
import { logger } from '@/utils/logger';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError('NOT_FOUND', `Nie znaleziono ${req.method} ${req.path}`, 404));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    // details: null (not undefined), so the { code, message, details } shape survives JSON serialization.
    res
      .status(err.status)
      .json({ code: err.code, message: err.message, details: err.details ?? null });
    return;
  }
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    // Contract (api.json): VALIDATION_ERROR is always 422
    res.status(422).json({
      code: 'VALIDATION_ERROR',
      message: issue ? `${issue.path.join('.')}: ${issue.message}` : 'Nieprawidłowe dane',
      details: { issues: err.issues },
    });
    return;
  }
  if ((err as { type?: string } | null)?.type === 'entity.too.large') {
    res.status(413).json({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Treść żądania jest zbyt duża (maks. 20 KB).',
      details: null,
    });
    return;
  }
  logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Błąd serwera', details: null });
};
