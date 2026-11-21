// T-077 API-016 API-017 API-018 Zod schemas for field params, list query and create-field body
import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const fieldParamsSchema = z.object({ accountId: objectId, fieldId: objectId });

export const listFieldsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export const createFieldBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  parcelIds: z
    .array(z.string().trim().min(1).max(64))
    .min(2)
    .max(20)
    .refine((ids) => new Set(ids).size === ids.length, 'Duplicate parcel ids'),
});

export type ListFieldsQuery = z.infer<typeof listFieldsQuerySchema>;
export type CreateFieldBody = z.infer<typeof createFieldBodySchema>;
