// T-056 API-014 Zod schema for PATCH /accounts/:accountId body (params reuse accountParamsSchema)
import { z } from 'zod';

export const renameAccountBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export type RenameAccountBody = z.infer<typeof renameAccountBodySchema>;
