// T-001 Express app: cors, json, routes, errorHandler
import cors from 'cors';
import express from 'express';

import { env } from '@/config/env';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { healthRouter } from '@/routes/health.routes';
import { sourcesRouter } from '@/routes/sources.routes';

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) }));
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', sourcesRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
