// API-010 API-011 API-012 API-013 Account members and report history fetchers and hooks (mock or real API)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authHeaders } from '@/api/auth';
import { apiFetch } from '@/api/client';
import type { Member, ReportSummary } from '@/api/types';
import {
  mockAddMember,
  mockGetAccountReports,
  mockGetMembers,
  mockRemoveMember,
} from '@/mocks/accounts.mock';

// VITE_MOCK_ACCOUNTS overrides VITE_USE_MOCKS for this resource only.
const shouldUseMocks =
  (import.meta.env.VITE_MOCK_ACCOUNTS ?? import.meta.env.VITE_USE_MOCKS) === 'true' ||
  !import.meta.env.VITE_API_URL;

const accountPath = (accountId: string) => `/accounts/${encodeURIComponent(accountId)}`;

export async function getMembers(accountId: string, token: string): Promise<Member[]> {
  // pageSize=100 is the contract maximum: lists default to 20 items (backend-2 review)
  if (shouldUseMocks) return mockGetMembers(accountId, token);
  const data = await apiFetch<{ items: Member[] }>(
    `${accountPath(accountId)}/members?pageSize=100`,
    {
      headers: authHeaders(token),
    },
  );
  return data.items;
}

export function addMember(accountId: string, email: string, token: string): Promise<Member> {
  if (shouldUseMocks) return mockAddMember(accountId, email, token);
  return apiFetch<Member>(`${accountPath(accountId)}/members`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ email }),
  });
}

export async function removeMember(
  accountId: string,
  memberId: string,
  token: string,
): Promise<void> {
  if (shouldUseMocks) return mockRemoveMember(accountId, memberId, token);
  await apiFetch<void>(`${accountPath(accountId)}/members/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function getAccountReports(
  accountId: string,
  token: string,
): Promise<ReportSummary[]> {
  if (shouldUseMocks) return mockGetAccountReports(accountId, token);
  const data = await apiFetch<{ items: ReportSummary[] }>(
    `${accountPath(accountId)}/reports?pageSize=100`,
    {
      headers: authHeaders(token),
    },
  );
  return data.items;
}

export function useMembersQuery(accountId: string | null, token: string | null) {
  return useQuery({
    queryKey: ['accounts', accountId, 'members'],
    queryFn: () => getMembers(accountId as string, token as string),
    enabled: accountId !== null && token !== null,
    retry: false,
  });
}

export function useAddMemberMutation(accountId: string, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (email: string) => addMember(accountId, email, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', accountId] }),
  });
}

export function useRemoveMemberMutation(accountId: string, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => removeMember(accountId, memberId, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', accountId] }),
  });
}

export function useAccountReportsQuery(accountId: string | null, token: string | null) {
  return useQuery({
    queryKey: ['accounts', accountId, 'reports'],
    queryFn: () => getAccountReports(accountId as string, token as string),
    enabled: accountId !== null && token !== null,
    retry: false,
  });
}
