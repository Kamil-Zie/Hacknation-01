// T-043 API-013 GET /accounts/:accountId/reports, API-014 PATCH, T-091 API-020 GET /accounts/:accountId/parcels
import { Router } from 'express';

import { listParcels, rename } from '@/controllers/accounts.controller';
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

accountsRouter.get(
  '/accounts/:accountId/parcels',
  requireAuth,
  validate('params', accountParamsSchema),
  listParcels,
);
