// T-005 API-001/API-002 Zod schemas for GET /parcels/:parcelId and GET /parcels/by-point
import { z } from 'zod';

export const PARCEL_ID_HINT = 'Format: 141201_1.0001.123';

export const parcelIdParamsSchema = z.object({
  parcelId: z
    .string()
    .max(60)
    .regex(/^\d{6}_\d\.\d{4}\..+$/),
});

export const parcelByPointQuerySchema = z.object({
  lat: z.coerce.number().min(49.0).max(54.9),
  lon: z.coerce.number().min(14.1).max(24.2),
});

export type ParcelIdParams = z.infer<typeof parcelIdParamsSchema>;
export type ParcelByPointQuery = z.infer<typeof parcelByPointQuerySchema>;
