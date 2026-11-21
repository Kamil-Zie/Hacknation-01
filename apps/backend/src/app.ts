// T-001 Express app: cors, json, routes, errorHandler
import cors from 'cors';
import express from 'express';

import { env } from '@/config/env';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { analysesRouter } from '@/routes/analyses.routes';
import { authRouter } from '@/routes/auth.routes';
import { cropsRouter } from '@/routes/crops.routes';
import { healthRouter } from '@/routes/health.routes';
import { parcelsRouter } from '@/routes/parcels.routes';
import { sourcesRouter } from '@/routes/sources.routes';

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) }));
  app.use(express.json({ limit: '2mb' }));
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', sourcesRouter);
  app.use('/api/v1', parcelsRouter);
  app.use('/api/v1', cropsRouter);
  app.use('/api/v1', analysesRouter);
  app.use('/api/v1', authRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
