// T-001 GET /health controller
import * as healthService from '@/services/health.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const getHealth = asyncHandler(async (_req, res) => {
  res.json(healthService.getHealth());
});
