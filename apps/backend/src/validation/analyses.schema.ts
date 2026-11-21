// T-017 T-018 T-043 API-004 API-005 API-013 Zod schemas: POST /analyses body and GET /analyses/:id params
import { z } from 'zod';

import { CROPS, type CropCode } from '@/services/engine/crops';

export const ANALYSIS_ID_HINT = 'Format: 24 znaki szesnastkowe, np. 665f0c0ffee0000000000001';

export const analysisIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

export type AnalysisIdParams = z.infer<typeof analysisIdParamsSchema>;

export const CROP_CODES = CROPS.map((crop) => crop.code) as [CropCode, ...CropCode[]];

const HISTORY_YEARS = 10;
const TIMEZONE = 'Europe/Warsaw';

// Today's date (YYYY-MM-DD) in Poland; en-CA formats as ISO.
export function todayInWarsaw(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(now);
}

function isRealDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isInRange(value: string): boolean {
  const today = todayInWarsaw();
  const earliest = `${Number(today.slice(0, 4)) - HISTORY_YEARS}${today.slice(4)}`;
  return value >= earliest && value <= today;
}

export const createAnalysisBodySchema = z.object({
  parcelId: z
    .string()
    .max(60)
    .regex(/^\d{6}_\d\.\d{4}\..+$/),
  cropCode: z.enum(CROP_CODES),
  analysisDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(isRealDate)
    .refine(isInRange),
  accountId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional(),
});

export type CreateAnalysisBody = z.infer<typeof createAnalysisBodySchema>;

// T-043 API-013 GET /accounts/:accountId/reports: params and pagination query
export const ACCOUNT_ID_HINT = 'Format: 24 znaki szesnastkowe, np. 665f0c0ffee0000000000001';

export const accountReportsParamsSchema = z.object({
  accountId: z.string().regex(/^[0-9a-fA-F]{24}$/),
});

export const accountReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AccountReportsQuery = z.infer<typeof accountReportsQuerySchema>;
