// T-077 API-016 POST, API-017 GET, API-018 DELETE /accounts/:accountId/fields routes
import { Router } from 'express';

import { create, list, remove } from '@/controllers/fields.controller';
import { requireAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { createFieldBodySchema, fieldParamsSchema } from '@/validation/fields.schema';
import { accountParamsSchema } from '@/validation/members.schema';

export const fieldsRouter = Router();

fieldsRouter.get(
  '/accounts/:accountId/fields',
  requireAuth,
  validate('params', accountParamsSchema),
  list,
);
fieldsRouter.post(
  '/accounts/:accountId/fields',
  requireAuth,
  validate('params', accountParamsSchema),
  validate('body', createFieldBodySchema),
  create,
);
fieldsRouter.delete(
  '/accounts/:accountId/fields/:fieldId',
  requireAuth,
  validate('params', fieldParamsSchema),
  remove,
);
