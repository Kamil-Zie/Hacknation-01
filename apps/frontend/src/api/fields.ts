// API-016 API-017 API-018 DM-024 Field fetchers and TanStack Query hooks (mock or real API)
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authHeaders } from '@/api/auth';
import { apiFetch } from '@/api/client';
import type { CreateFieldRequest, Field } from '@/api/types';
import { mockCreateField, mockDeleteField, mockGetFields } from '@/mocks/fields.mock';

// VITE_MOCK_FIELDS overrides VITE_USE_MOCKS for this resource only.
const shouldUseMocks =
  (import.meta.env.VITE_MOCK_FIELDS ?? import.meta.env.VITE_USE_MOCKS) === 'true' ||
  !import.meta.env.VITE_API_URL;

// API-016 fetches every parcel from ULDK, so give it headroom
const CREATE_TIMEOUT_MS = 60_000;

const fieldsPath = (accountId: string) => `/accounts/${encodeURIComponent(accountId)}/fields`;

export function createField(
  accountId: string,
  body: CreateFieldRequest,
  token: string,
): Promise<Field> {
  if (shouldUseMocks) return mockCreateField(accountId, body, token);
  return apiFetch<Field>(
    fieldsPath(accountId),
    { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) },
    CREATE_TIMEOUT_MS,
  );
}

export async function getFields(accountId: string, token: string): Promise<Field[]> {
  // API-017 allows pageSize 1-50
  if (shouldUseMocks) return mockGetFields(accountId, token);
  const data = await apiFetch<{ items: Field[] }>(`${fieldsPath(accountId)}?pageSize=50`, {
    headers: authHeaders(token),
  });
  return data.items;
}

export async function deleteField(
  accountId: string,
  fieldId: string,
  token: string,
): Promise<void> {
  if (shouldUseMocks) return mockDeleteField(accountId, fieldId, token);
  await apiFetch<void>(`${fieldsPath(accountId)}/${encodeURIComponent(fieldId)}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export function useFieldsQuery(accountId: string | null, token: string | null) {
  return useQuery({
    queryKey: ['accounts', accountId, 'fields'],
    queryFn: () => getFields(accountId as string, token as string),
    enabled: accountId !== null && token !== null,
    retry: false,
  });
}

export function useCreateFieldMutation(accountId: string, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateFieldRequest) => createField(accountId, body, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'fields'] }),
  });
}

export function useDeleteFieldMutation(accountId: string, token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (fieldId: string) => deleteField(accountId, fieldId, token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', accountId, 'fields'] }),
  });
}
