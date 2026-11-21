// T-041 API-007/API-008/API-009 POST /auth/register, POST /auth/login, GET /auth/me routes
import { Router } from 'express';

import { login, me, register } from '@/controllers/auth.controller';
import { requireAuth } from '@/middleware/auth';
import { validate } from '@/middleware/validate';
import { loginBodySchema, registerBodySchema } from '@/validation/auth.schema';

export const authRouter = Router();

authRouter.post('/auth/register', validate('body', registerBodySchema), register);
authRouter.post('/auth/login', validate('body', loginBodySchema), login);
authRouter.get('/auth/me', requireAuth, me);
