// T-001 GET /health route
import { Router } from 'express';

import { getHealth } from '@/controllers/health.controller';

export const healthRouter = Router();

healthRouter.get('/health', getHealth);
