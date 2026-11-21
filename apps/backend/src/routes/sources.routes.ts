// T-004 API-006 GET /sources route
import { Router } from 'express';

import { listSources } from '@/controllers/sources.controller';

export const sourcesRouter = Router();

sourcesRouter.get('/sources', listSources);
