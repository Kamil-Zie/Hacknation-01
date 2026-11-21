// API-003 DM-004 Crop types, fetcher and TanStack Query hook (mock or real API)
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/api/client';
import type { Crop } from '@/api/types';
import { mockGetCrops } from '@/mocks/crops.mock';

export interface CropsResponse {
  items: Crop[];
}

const CROPS_KEY = ['crops'] as const;

const shouldUseMocks = import.meta.env.VITE_USE_MOCKS === 'true' || !import.meta.env.VITE_API_URL;

export function getCrops(): Promise<CropsResponse> {
  if (shouldUseMocks) return mockGetCrops();
  return apiFetch<CropsResponse>('/crops');
}

export function useCrops() {
  return useQuery({
    queryKey: CROPS_KEY,
    queryFn: getCrops,
    staleTime: Infinity,
  });
}
