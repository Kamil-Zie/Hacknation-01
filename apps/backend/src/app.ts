// T-001 Express app: cors, json, routes, errorHandler
import cors from 'cors';
import express from 'express';

import { env } from '@/config/env';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';
import { securityHeaders } from '@/middleware/security';
import { accountsRouter } from '@/routes/accounts.routes';
import { analysesRouter } from '@/routes/analyses.routes';
import { authRouter } from '@/routes/auth.routes';
import { cropsRouter } from '@/routes/crops.routes';
import { fieldReportsRouter } from '@/routes/fieldReports.routes';
import { fieldsRouter } from '@/routes/fields.routes';
import { healthRouter } from '@/routes/health.routes';
import { membersRouter } from '@/routes/members.routes';
import { parcelsRouter } from '@/routes/parcels.routes';
import { sourcesRouter } from '@/routes/sources.routes';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // T-066: Cloudflare Tunnel = one proxy hop (in tests also lets X-Forwarded-For set the client IP).
  if (env.NODE_ENV !== 'development') app.set('trust proxy', 1);
  app.use(securityHeaders);
  app.use(cors({ origin: env.CORS_ORIGIN.split(',').map((origin) => origin.trim()) }));
  app.use(express.json({ limit: '20kb' }));
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', sourcesRouter);
  app.use('/api/v1', parcelsRouter);
  app.use('/api/v1', cropsRouter);
  app.use('/api/v1', analysesRouter);
  app.use('/api/v1', authRouter);
  app.use('/api/v1', accountsRouter);
  app.use('/api/v1', membersRouter);
  app.use('/api/v1', fieldReportsRouter);
  app.use('/api/v1', fieldsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
