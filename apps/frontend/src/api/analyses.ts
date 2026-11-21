// API-004 POST /analyses, API-005 GET /analyses/:id
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, USE_MOCKS, apiFetch } from '@/api/client';
import type { AnalysisRequest, Report } from '@/api/types';

export const REPORTS_KEY = ['reports'] as const;
const CREATE_TIMEOUT_MS = 40_000;
const MOCK_GET_DELAY_MS = 800;
const MOCK_CREATE_DELAY_MS = 4000;

// T-025: API-005 and API-004 go live separately; VITE_MOCK_REPORTS / VITE_MOCK_ANALYSES
// override VITE_USE_MOCKS per resource (same pattern as VITE_MOCK_PARCELS). No API URL = mock.
function isMocked(flag: string | undefined): boolean {
  return (flag ?? String(USE_MOCKS)) === 'true' || !import.meta.env.VITE_API_URL;
}
const MOCK_REPORTS = isMocked(import.meta.env.VITE_MOCK_REPORTS);
const MOCK_ANALYSES = isMocked(import.meta.env.VITE_MOCK_ANALYSES);
const OBJECT_ID_REGEX = /^[0-9a-f]{24}$/i;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createAnalysis(body: AnalysisRequest): Promise<Report> {
  if (MOCK_ANALYSES) {
    await delay(MOCK_CREATE_DELAY_MS);
    const { buildMockReport } = await import('@/mocks/analyses.mock');
    return buildMockReport(body);
  }
  return apiFetch<Report>(
    '/analyses',
    { method: 'POST', body: JSON.stringify(body) },
    CREATE_TIMEOUT_MS,
  );
}

export async function getReport(id: string): Promise<Report> {
  // Real report ids are ObjectIds; mock ids ('demo', 'demo-partial') stay on the mock even
  // when API-005 is live, so a mocked analysis still opens its report
  if (MOCK_REPORTS || !OBJECT_ID_REGEX.test(id)) {
    await delay(MOCK_GET_DELAY_MS);
    const { findMockReport } = await import('@/mocks/analyses.mock');
    const report = findMockReport(id);
    if (!report) throw new ApiError('REPORT_NOT_FOUND', 'Nie znaleziono raportu', 404);
    return report;
  }
  return apiFetch<Report>(`/analyses/${encodeURIComponent(id)}`);
}

export function useReportQuery(id: string | undefined) {
  return useQuery({
    queryKey: [...REPORTS_KEY, id],
    queryFn: () => getReport(id as string),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCreateAnalysisMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAnalysis,
    onSuccess: (report) => {
      queryClient.setQueryData([...REPORTS_KEY, report.id], report);
    },
  });
}
