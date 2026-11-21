// T-043 API-013 GET /accounts/:accountId/reports route (T-042 adds the members routes here)
import { Router } from 'express';

import { rename } from '@/controllers/accounts.controller';
import { listAccountReports } from '@/controllers/analyses.controller';
import { requireAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { renameAccountBodySchema } from '@/validation/accounts.schema';
import { accountParamsSchema } from '@/validation/members.schema';

export const accountsRouter = Router();

accountsRouter.patch(
  '/accounts/:accountId',
  requireAuth,
  validate('params', accountParamsSchema),
  validate('body', renameAccountBodySchema),
  rename,
);

accountsRouter.get('/accounts/:accountId/reports', requireAuth, listAccountReports);
