// API-019 POST /fields/:fieldId/analyses Field report fetcher, mutation hook and parcel outlines (mock or real API)
import { useMutation, useQueries, useQueryClient } from '@tanstack/react-query';

import { authHeaders } from '@/api/auth';
import { ApiError, USE_MOCKS, apiFetch } from '@/api/client';
import { getParcelById } from '@/api/parcels';
import type { FieldReport, FieldReportRequest, Parcel } from '@/api/types';
import { useSessionStore } from '@/store/session';
import { errorMessage } from '@/utils/errorMessages';

export const FIELD_REPORTS_KEY = ['fieldReports'] as const;
// API-019 analyses parcels 3 at a time (a few parcels take 8-25 s), so give the backend 2 minutes
const CREATE_TIMEOUT_MS = 120_000;

const FIELD_REPORT_ERRORS: Record<string, string> = {
  FIELD_NOT_FOUND: 'Nie znaleziono tego pola. Mogło zostać usunięte.',
  VALIDATION_ERROR: 'Sprawdź uprawę i datę analizy, a potem spróbuj ponownie.',
  RATE_LIMITED: 'Za dużo raportów pola naraz. Odczekaj minutę i spróbuj ponownie.',
  UPSTREAM_UNAVAILABLE:
    'Nie udało się pobrać danych dla żadnej działki pola. Spróbuj ponownie za chwilę.',
};

export function fieldReportErrorMessage(error: unknown): string {
  const known = error instanceof ApiError ? FIELD_REPORT_ERRORS[error.code] : undefined;
  return known ?? errorMessage(error).message;
}
const MOCK_FIELD_ID_REGEX = /^demo/;

// VITE_MOCK_FIELD_REPORTS overrides VITE_USE_MOCKS for this resource only (switch to the real
// API after T-078: VITE_MOCK_FIELD_REPORTS=false). No API URL = mock.
const MOCK_FIELD_REPORTS =
  (import.meta.env.VITE_MOCK_FIELD_REPORTS ?? String(USE_MOCKS)) === 'true' ||
  !import.meta.env.VITE_API_URL;

export async function createFieldReport(
  fieldId: string,
  body: FieldReportRequest,
  token?: string | null,
): Promise<FieldReport> {
  // Mock field ids ('demo') stay on the mock even when API-019 is live, like report ids
  if (MOCK_FIELD_REPORTS || MOCK_FIELD_ID_REGEX.test(fieldId)) {
    const { mockCreateFieldReport } = await import('@/mocks/fieldReports.mock');
    return mockCreateFieldReport(fieldId, body);
  }
  return apiFetch<FieldReport>(
    `/fields/${encodeURIComponent(fieldId)}/analyses`,
    {
      method: 'POST',
      body: JSON.stringify(body),
      ...(token ? { headers: authHeaders(token) } : {}),
    },
    CREATE_TIMEOUT_MS,
  );
}

export function useCreateFieldReportMutation(fieldId: string) {
  const queryClient = useQueryClient();
  const token = useSessionStore((state) => state.token);
  return useMutation({
    mutationFn: (body: FieldReportRequest) => createFieldReport(fieldId, body, token),
    onSuccess: (report) => {
      queryClient.setQueryData([...FIELD_REPORTS_KEY, fieldId], report);
    },
  });
}

/** Outline of one parcel for the field map; the field itself stores no geometry (DM-024) */
async function getParcelOutline(parcelId: string): Promise<Parcel['geometry'] | null> {
  if (MOCK_FIELD_REPORTS || MOCK_FIELD_ID_REGEX.test(parcelId)) {
    const { mockParcelOutline } = await import('@/mocks/fieldReports.mock');
    const outline = mockParcelOutline(parcelId);
    if (outline) return outline as unknown as Parcel['geometry'];
  }
  return (await getParcelById(parcelId)).geometry;
}

export function useParcelOutlines(parcelIds: string[]) {
  return useQueries({
    queries: parcelIds.map((parcelId) => ({
      queryKey: ['parcelOutline', parcelId],
      queryFn: () => getParcelOutline(parcelId),
      retry: false,
      staleTime: Infinity,
    })),
  });
}
