// T-005 API-001/API-002 GET /parcels/:parcelId and /parcels/by-point controller
import * as parcelsService from '@/services/parcels.service';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';
import {
  PARCEL_ID_HINT,
  parcelByPointQuerySchema,
  parcelIdParamsSchema,
} from '@/validation/parcels.schema';

export const getParcelById = asyncHandler(async (req, res) => {
  const parsed = parcelIdParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    throw new AppError('VALIDATION_ERROR', 'Nieprawidłowy identyfikator działki', 422, {
      field: 'parcelId',
      hint: PARCEL_ID_HINT,
    });
  }
  res.json(await parcelsService.getParcelById(parsed.data.parcelId));
});

export const getParcelByPoint = asyncHandler(async (req, res) => {
  const parsed = parcelByPointQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? 'lat');
    throw new AppError('VALIDATION_ERROR', 'Punkt poza zakresem Polski lub nieprawidłowy', 422, {
      field,
      hint: 'lat 49.0-54.9, lon 14.1-24.2',
    });
  }
  res.json(await parcelsService.getParcelByPoint(parsed.data.lat, parsed.data.lon));
});
