// T-017 T-018 T-043 API-004 API-005 API-013 POST /analyses and GET /analyses/:id controllers
import * as analysesService from '@/services/analyses.service';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';
import {
  ACCOUNT_ID_HINT,
  ANALYSIS_ID_HINT,
  accountReportsParamsSchema,
  accountReportsQuerySchema,
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
  res.status(201).json(await analysesService.createAnalysis(parsed.data, undefined, req.userId));
});

export const listAccountReports = asyncHandler(async (req, res) => {
  const params = accountReportsParamsSchema.safeParse(req.params);
  if (!params.success) {
    throw new AppError('VALIDATION_ERROR', 'Nieprawidłowy identyfikator konta', 422, {
      field: 'accountId',
      hint: ACCOUNT_ID_HINT,
    });
  }
  const query = accountReportsQuerySchema.safeParse(req.query);
  if (!query.success) {
    const field = String(query.error.issues[0]?.path[0] ?? 'query');
    throw new AppError('VALIDATION_ERROR', `Nieprawidłowe pole ${field}`, 422, { field });
  }
  const result = await analysesService.listAccountReports(
    req.userId as string,
    params.data.accountId,
    query.data,
  );
  res.json(result);
});

export const getAnalysisById = asyncHandler(async (req, res) => {
  const parsed = analysisIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Nieprawidłowy identyfikator raportu', 422, {
      field: 'id',
      hint: ANALYSIS_ID_HINT,
    });
  }
  res.json(await analysesService.getReportById(parsed.data.id, req.userId));
});
