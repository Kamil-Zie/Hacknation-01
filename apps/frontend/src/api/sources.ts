// API-006 DM-005 DM-011 Data source catalog types, SourceStatus and TanStack Query hook (mock or real API)
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/api/client';
import type { DataSource } from '@/api/types';
import { mockGetSources } from '@/mocks/sources.mock';

export interface SourcesResponse {
  items: DataSource[];
}

const SOURCES_KEY = ['sources'] as const;

const shouldUseMocks = import.meta.env.VITE_USE_MOCKS === 'true' || !import.meta.env.VITE_API_URL;

export function getSources(): Promise<SourcesResponse> {
  if (shouldUseMocks) return mockGetSources();
  return apiFetch<SourcesResponse>('/sources');
}

export function useSources() {
  return useQuery({
    queryKey: SOURCES_KEY,
    queryFn: getSources,
    staleTime: Infinity,
  });
}
