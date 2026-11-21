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
    res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
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
  logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Błąd serwera' });
};
