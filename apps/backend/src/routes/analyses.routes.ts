// T-017 T-018 API-004 API-005 POST /analyses and GET /analyses/:id routes
import { Router } from 'express';

import { createAnalysis, getAnalysisById } from '@/controllers/analyses.controller';
import { optionalAuth } from '@/middleware/auth';

export const analysesRouter = Router();

analysesRouter.post('/analyses', optionalAuth, createAnalysis);
analysesRouter.get('/analyses/:id', getAnalysisById);
