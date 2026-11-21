// T-005 API-001/API-002 GET /parcels/by-point and /parcels/:parcelId routes
import { Router } from 'express';

import { getParcelById, getParcelByPoint } from '@/controllers/parcels.controller';

export const parcelsRouter = Router();

// by-point must stay before :parcelId.
parcelsRouter.get('/parcels/by-point', getParcelByPoint);
parcelsRouter.get('/parcels/:parcelId', getParcelById);
