// T-018 API-005 GET /analyses/:id route
import { Router } from 'express';

import { getAnalysisById } from '@/controllers/analyses.controller';

export const analysesRouter = Router();

// POST /analyses (API-004) will be added here by T-017.
analysesRouter.get('/analyses/:id', getAnalysisById);
