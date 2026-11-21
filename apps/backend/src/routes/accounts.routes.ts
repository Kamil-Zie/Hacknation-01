// T-043 API-013 GET /accounts/:accountId/reports route (T-042 adds the members routes here)
import { Router } from 'express';

import { listAccountReports } from '@/controllers/analyses.controller';
import { requireAuth } from '@/middleware/auth';

export const accountsRouter = Router();

accountsRouter.get('/accounts/:accountId/reports', requireAuth, listAccountReports);
