// T-011 API-003 GET /crops controller
import * as cropsService from '@/services/crops.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const listCrops = asyncHandler(async (_req, res) => {
  res.json(cropsService.listCrops());
});
