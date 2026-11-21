// UI-C-004 Zod schema for AnalysisForm (crop and analysis date within last 10 years)
import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function toIsoDate(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 10);
}

export function getTodayIso(): string {
  return toIsoDate(new Date());
}

export function getMinDateIso(): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 10);
  return toIsoDate(date);
}

export function createAnalysisFormSchema() {
  const min = getMinDateIso();
  const max = getTodayIso();
  return z.object({
    cropCode: z.string().min(1, 'Wybierz uprawę'),
    analysisDate: z
      .string()
      .regex(ISO_DATE, 'Podaj poprawną datę')
      .refine((value) => value >= min && value <= max, {
        message: 'Data musi mieścić się w zakresie ostatnich 10 lat i nie może być z przyszłości',
      }),
  });
}

export type AnalysisFormValues = z.infer<ReturnType<typeof createAnalysisFormSchema>>;
