// T-017 T-018 API-004 API-005 POST /analyses and GET /analyses/:id routes
import { Router } from 'express';

import { createAnalysis, getAnalysisById } from '@/controllers/analyses.controller';
import { optionalAuth } from '@/middleware/auth';
import { rateLimit } from '@/middleware/rateLimit';

export const analysesRouter = Router();

// T-066: 10 analyses per minute per IP
const analysesLimit = rateLimit({ windowMs: 60_000, max: 10, name: 'analyses' });

analysesRouter.post('/analyses', analysesLimit, optionalAuth, createAnalysis);
analysesRouter.get('/analyses/:id', optionalAuth, getAnalysisById);
