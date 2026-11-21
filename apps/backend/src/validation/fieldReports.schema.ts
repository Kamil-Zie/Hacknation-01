// T-078 API-019 Zod schemas: POST /fields/:fieldId/analyses params and body
import { z } from 'zod';

import { createAnalysisBodySchema } from '@/validation/analyses.schema';

export const FIELD_ID_HINT = 'Format: 24 znaki szesnastkowe, np. 665f0c0ffee0000000000001';

export const fieldIdParamsSchema = z.object({
  fieldId: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

// Same crop and date rules as API-004.
export const createFieldReportBodySchema = createAnalysisBodySchema.pick({
  cropCode: true,
  analysisDate: true,
});

export type CreateFieldReportBody = z.infer<typeof createFieldReportBodySchema>;
