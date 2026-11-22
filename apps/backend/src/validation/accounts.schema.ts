// T-056 API-014 Zod schema for PATCH /accounts/:accountId body, T-098 API-022 POST /accounts/:accountId/parcels body
import { z } from 'zod';

export const renameAccountBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type RenameAccountBody = z.infer<typeof renameAccountBodySchema>;

export const addAccountParcelBodySchema = z.object({
  parcelId: z
    .string()
    .trim()
    .regex(/^\d{6}_\d\.\d{4}\..+$/),
});

export type AddAccountParcelBody = z.infer<typeof addAccountParcelBodySchema>;
