// API-003 DM-004 Crop types, fetcher and TanStack Query hook (mock or real API)
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/api/client';
import { mockGetCrops } from '@/mocks/crops.mock';

export type CropCode =
  | 'winter_wheat'
  | 'spring_barley'
  | 'maize'
  | 'potato'
  | 'winter_rapeseed'
  | 'sugar_beet'
  | 'grassland';

export interface CropStage {
  code: string;
  name: string;
  /** MM-DD */
  from: string;
  /** MM-DD */
  to: string;
  isCritical: boolean;
}

export interface ExpectedIndex {
  month: number;
  ndviMin: number;
  ndviMax: number;
  ndmiMin: number;
  ndmiMax: number;
}

export interface Crop {
  code: CropCode;
  name: string;
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  rootDepthM: number;
  depletionFraction: number;
  stages: CropStage[];
  criticalPeriodLabel: string;
  expectedIndices: ExpectedIndex[];
  reference: string;
}

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
