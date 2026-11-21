// API-004 POST /analyses, API-005 GET /analyses/:id
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, USE_MOCKS, apiFetch } from '@/api/client';
import type { AnalysisRequest, Report } from '@/api/types';
import { buildMockReport, demoReport } from '@/mocks/analyses.mock';

export const REPORTS_KEY = ['reports'] as const;
const CREATE_TIMEOUT_MS = 40_000;
const MOCK_GET_DELAY_MS = 800;
const MOCK_CREATE_DELAY_MS = 2000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createAnalysis(body: AnalysisRequest): Promise<Report> {
  if (USE_MOCKS) {
    await delay(MOCK_CREATE_DELAY_MS);
    return buildMockReport(body);
  }
  return apiFetch<Report>(
    '/analyses',
    { method: 'POST', body: JSON.stringify(body) },
    CREATE_TIMEOUT_MS,
  );
}

export async function getReport(id: string): Promise<Report> {
  if (USE_MOCKS) {
    await delay(MOCK_GET_DELAY_MS);
    if (id !== demoReport.id) throw new ApiError('NOT_FOUND', 'Nie znaleziono raportu', 404);
    return demoReport;
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
