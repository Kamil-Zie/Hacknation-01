// T-004 API-006 GET /sources controller
import * as sourcesService from '@/services/sources.service';
import { asyncHandler } from '@/utils/asyncHandler';

export const listSources = asyncHandler(async (_req, res) => {
  res.json(sourcesService.listSources());
});
