// API-020 API-021 DM-026 Account parcels overview and per-parcel member access: fetchers and hooks (mock or real API)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authHeaders } from '@/api/auth';
import { apiFetch } from '@/api/client';
import type { Member, ParcelOverview } from '@/api/types';
import { mockGetAccountParcels, mockUpdateMemberParcels } from '@/mocks/accountParcels.mock';

// VITE_MOCK_ACCOUNT_PARCELS overrides VITE_USE_MOCKS for this resource only.
const shouldUseMocks =
  (import.meta.env.VITE_MOCK_ACCOUNT_PARCELS ?? import.meta.env.VITE_USE_MOCKS) === 'true' ||
  !import.meta.env.VITE_API_URL;

const accountPath = (accountId: string) => `/accounts/${encodeURIComponent(accountId)}`;

export async function getAccountParcels(
  accountId: string,
  token: string,
): Promise<ParcelOverview[]> {
  if (shouldUseMocks) return mockGetAccountParcels(accountId, token);
  const data = await apiFetch<{ items: ParcelOverview[] }>(`${accountPath(accountId)}/parcels`, {
    headers: authHeaders(token),
  });
  return data.items;
}

export function updateMemberParcels(
  accountId: string,
  memberId: string,
  parcelIds: string[] | null,
  token: string,
): Promise<Member> {
  if (shouldUseMocks) return mockUpdateMemberParcels(accountId, memberId, parcelIds, token);
  return apiFetch<Member>(`${accountPath(accountId)}/members/${encodeURIComponent(memberId)}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify({ parcelIds }),
  });
}

// Shared by the dashboard (T-086), my parcels (T-088), search hints (T-087) and partners (T-090)
export function useAccountParcelsQuery(accountId: string | null, token: string | null) {
  return useQuery({
    queryKey: ['accounts', accountId, 'parcels'],
    queryFn: () => getAccountParcels(accountId as string, token as string),
    enabled: accountId !== null && token !== null,
    retry: false,
  });
}

export function useUpdateMemberParcelsMutation(accountId: string, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { memberId: string; parcelIds: string[] | null }) =>
      updateMemberParcels(accountId, args.memberId, args.parcelIds, token),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'members'] }),
  });
}
