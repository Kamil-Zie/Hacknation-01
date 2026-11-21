// T-017 T-018 API-004 API-005 POST /analyses and GET /analyses/:id controllers
import * as analysesService from '@/services/analyses.service';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';
import {
  ANALYSIS_ID_HINT,
  analysisIdParamsSchema,
  createAnalysisBodySchema,
} from '@/validation/analyses.schema';
import { PARCEL_ID_HINT } from '@/validation/parcels.schema';

const FIELD_HINTS: Record<string, string> = {
  parcelId: PARCEL_ID_HINT,
  cropCode:
    'winter_wheat | spring_barley | maize | potato | winter_rapeseed | sugar_beet | grassland',
  analysisDate: 'YYYY-MM-DD, od dziś minus 10 lat do dziś',
};

export const createAnalysis = asyncHandler(async (req, res) => {
  const parsed = createAnalysisBodySchema.safeParse(req.body);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? 'body');
    throw new AppError('VALIDATION_ERROR', `Nieprawidłowe pole ${field}`, 422, {
      field,
      hint: FIELD_HINTS[field],
    });
  }
  res.status(201).json(await analysesService.createAnalysis(parsed.data));
});

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
