// T-078 API-019 POST /fields/:fieldId/analyses controller
import * as fieldReportsService from '@/services/fieldReports.service';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';
import {
  FIELD_ID_HINT,
  createFieldReportBodySchema,
  fieldIdParamsSchema,
} from '@/validation/fieldReports.schema';

export const createFieldReport = asyncHandler(async (req, res) => {
  const params = fieldIdParamsSchema.safeParse(req.params);
  if (!params.success) {
    throw new AppError('VALIDATION_ERROR', 'Nieprawidłowy identyfikator grupy działek', 422, {
      field: 'fieldId',
      hint: FIELD_ID_HINT,
    });
  }
  const body = createFieldReportBodySchema.safeParse(req.body);
  if (!body.success) {
    const field = String(body.error.issues[0]?.path[0] ?? 'body');
    throw new AppError('VALIDATION_ERROR', `Nieprawidłowe pole ${field}`, 422, { field });
  }
  const report = await fieldReportsService.createFieldReport(
    params.data.fieldId,
    body.data,
    req.userId!,
  );
  res.status(201).json(report);
});
