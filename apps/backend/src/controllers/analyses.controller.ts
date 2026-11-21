// T-018 API-005 GET /analyses/:id controller
import * as analysesService from '@/services/analyses.service';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';
import { ANALYSIS_ID_HINT, analysisIdParamsSchema } from '@/validation/analyses.schema';

export const getAnalysisById = asyncHandler(async (req, res) => {
  const parsed = analysisIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Nieprawidłowy identyfikator raportu', 422, {
      field: 'id',
      hint: ANALYSIS_ID_HINT,
    });
  }
  res.json(await analysesService.getReportById(parsed.data.id));
});
