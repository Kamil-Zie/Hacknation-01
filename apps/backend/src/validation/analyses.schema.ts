// T-018 API-005 Zod schema for GET /analyses/:id
import { z } from 'zod';

export const ANALYSIS_ID_HINT = 'Format: 24 znaki szesnastkowe, np. 665f0c0ffee0000000000001';

export const analysisIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

export type AnalysisIdParams = z.infer<typeof analysisIdParamsSchema>;
