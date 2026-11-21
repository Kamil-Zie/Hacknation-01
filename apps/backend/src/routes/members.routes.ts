// T-042 API-010 GET, API-011 POST, API-012 DELETE, T-092 API-021 PATCH /accounts/:accountId/members routes
import { Router } from 'express';

import { add, list, remove, updateParcels } from '@/controllers/members.controller';
import { requireAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import {
  accountParamsSchema,
  addMemberBodySchema,
  memberParamsSchema,
  updateMemberParcelsBodySchema,
} from '@/validation/members.schema';

export const membersRouter = Router();

membersRouter.get(
  '/accounts/:accountId/members',
  requireAuth,
  validate('params', accountParamsSchema),
  list,
);
membersRouter.post(
  '/accounts/:accountId/members',
  requireAuth,
  validate('params', accountParamsSchema),
  validate('body', addMemberBodySchema),
  add,
);
membersRouter.delete(
  '/accounts/:accountId/members/:memberId',
  requireAuth,
  validate('params', memberParamsSchema),
  remove,
);
membersRouter.patch(
  '/accounts/:accountId/members/:memberId',
  requireAuth,
  validate('params', memberParamsSchema),
  validate('body', updateMemberParcelsBodySchema),
  updateParcels,
);
