// T-041 API-007/API-008/API-009 POST /auth/register, POST /auth/login, GET /auth/me, API-015 PATCH /auth/me routes
import { Router } from 'express';

import { login, me, register, updateProfile } from '@/controllers/auth.controller';
import { requireAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';
import { validate } from '@/middleware/validate';
import {
  loginBodySchema,
  registerBodySchema,
  updateProfileBodySchema,
} from '@/validation/auth.schema';

export const authRouter = Router();

// T-066: 20 requests per minute per IP on all /auth/*
authRouter.use('/auth', rateLimit({ windowMs: 60_000, max: 20, name: 'auth' }));

authRouter.post('/auth/register', validate('body', registerBodySchema), register);
authRouter.post('/auth/login', validate('body', loginBodySchema), login);
authRouter.get('/auth/me', requireAuth, me);
authRouter.patch('/auth/me', requireAuth, validate('body', updateProfileBodySchema), updateProfile);
