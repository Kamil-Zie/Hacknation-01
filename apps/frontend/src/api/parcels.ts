// API-001 API-002 DM-003 Parcel types, fetchers and TanStack Query hooks (mock or real API)
import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/api/client';
import type { Parcel } from '@/api/types';
import { mockGetParcelById, mockGetParcelByPoint } from '@/mocks/parcels.mock';

export const PARCEL_ID_REGEX = /^\d{6}_\d\.\d{4}\..+$/;

const shouldUseMocks = import.meta.env.VITE_USE_MOCKS === 'true' || !import.meta.env.VITE_API_URL;

export function getParcelById(parcelId: string): Promise<Parcel> {
  if (shouldUseMocks) return mockGetParcelById(parcelId);
  return apiFetch<Parcel>(`/parcels/${encodeURIComponent(parcelId)}`);
}

export function getParcelByPoint(lat: number, lon: number): Promise<Parcel> {
  if (shouldUseMocks) return mockGetParcelByPoint(lat, lon);
  return apiFetch<Parcel>(`/parcels/by-point?lat=${lat}&lon=${lon}`);
}

export function useParcelQuery(parcelId: string | null) {
  return useQuery({
    queryKey: ['parcels', parcelId],
    queryFn: () => getParcelById(parcelId as string),
    enabled: parcelId !== null,
    retry: false,
  });
}

export function useParcelByPointMutation() {
  return useMutation({
    mutationFn: ({ lat, lon }: { lat: number; lon: number }) => getParcelByPoint(lat, lon),
  });
}
