// T-011 API-003 GET /crops route
import { Router } from 'express';

import { listCrops } from '@/controllers/crops.controller';

export const cropsRouter = Router();

cropsRouter.get('/crops', listCrops);
