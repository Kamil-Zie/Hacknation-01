// API-001 API-002 DM-003 Parcel types, fetchers and TanStack Query hooks (mock or real API)
import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/api/client';
import type { Parcel } from '@/api/types';
import { mockGetParcelById, mockGetParcelByPoint } from '@/mocks/parcels.mock';

export const PARCEL_ID_REGEX = /^\d{6}_\d\.\d{4}\..+$/;

// T-024: parcels are live on the backend before the rest, so VITE_MOCK_PARCELS=false
// switches only this resource to the real API (defaults to VITE_USE_MOCKS).
const shouldUseMocks =
  (import.meta.env.VITE_MOCK_PARCELS ?? import.meta.env.VITE_USE_MOCKS) === 'true' ||
  !import.meta.env.VITE_API_URL;

// Backend waits up to 10 s for ULDK (+1 retry on cold start), so leave headroom
const PARCEL_TIMEOUT_MS = 25_000;

export function getParcelById(parcelId: string): Promise<Parcel> {
  if (shouldUseMocks) return mockGetParcelById(parcelId);
  return apiFetch<Parcel>(`/parcels/${encodeURIComponent(parcelId)}`, undefined, PARCEL_TIMEOUT_MS);
}

export function getParcelByPoint(lat: number, lon: number): Promise<Parcel> {
  if (shouldUseMocks) return mockGetParcelByPoint(lat, lon);
  const query = `lat=${lat.toFixed(6)}&lon=${lon.toFixed(6)}`;
  return apiFetch<Parcel>(`/parcels/by-point?${query}`, undefined, PARCEL_TIMEOUT_MS);
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
