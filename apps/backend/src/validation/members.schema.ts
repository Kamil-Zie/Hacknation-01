// T-042 API-010 API-011 API-012 Zod schemas for account members params, list query and add-member body
import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const accountParamsSchema = z.object({ accountId: objectId });

export const memberParamsSchema = z.object({ accountId: objectId, memberId: objectId });

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const addMemberBodySchema = z.object({
  email: z.string().trim().toLowerCase().max(254).email(),
});

// API-021 null = every parcel of the account
export const updateMemberParcelsBodySchema = z.object({
  parcelIds: z
    .array(z.string().trim().min(3).max(64))
    .min(1)
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, 'Działki nie mogą się powtarzać')
    .nullable(),
});

export type UpdateMemberParcelsBody = z.infer<typeof updateMemberParcelsBodySchema>;
export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;
export type AddMemberBody = z.infer<typeof addMemberBodySchema>;
