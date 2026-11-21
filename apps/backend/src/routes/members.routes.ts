// T-042 API-010 GET, API-011 POST, API-012 DELETE /accounts/:accountId/members routes
import { Router } from 'express';

import { add, list, remove } from '@/controllers/members.controller';
import { requireAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import {
  accountParamsSchema,
  addMemberBodySchema,
  memberParamsSchema,
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
