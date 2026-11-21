// T-078 API-019 POST /fields/:fieldId/analyses route (field report, auth required)
import { Router } from 'express';

import { createFieldReport } from '@/controllers/fieldReports.controller';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';

export const fieldReportsRouter = Router();

// One field report runs up to 20 analyses, so the limit is lower than for single analyses.
const fieldReportsLimit = rateLimit({ windowMs: 60_000, max: 4, name: 'field-reports' });

fieldReportsRouter.post(
  '/fields/:fieldId/analyses',
  fieldReportsLimit,
  requireAuth,
  createFieldReport,
);
