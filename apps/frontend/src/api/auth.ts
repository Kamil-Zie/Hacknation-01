// API-007 API-008 API-009 Auth fetchers and TanStack Query hooks (mock or real API), token passed as argument
import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/api/client';
import type { Account, LoginRequest, RegisterRequest, Session, User } from '@/api/types';
import { mockGetMe, mockLogin, mockRegister } from '@/mocks/auth.mock';

// VITE_MOCK_AUTH overrides VITE_USE_MOCKS for this resource only.
const shouldUseMocks =
  (import.meta.env.VITE_MOCK_AUTH ?? import.meta.env.VITE_USE_MOCKS) === 'true' ||
  !import.meta.env.VITE_API_URL;

export function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function register(body: RegisterRequest): Promise<Session> {
  if (shouldUseMocks) return mockRegister(body);
  return apiFetch<Session>('/auth/register', { method: 'POST', body: JSON.stringify(body) });
}

export function login(body: LoginRequest): Promise<Session> {
  if (shouldUseMocks) return mockLogin(body);
  return apiFetch<Session>('/auth/login', { method: 'POST', body: JSON.stringify(body) });
}

export function getMe(token: string): Promise<{ user: User; accounts: Account[] }> {
  if (shouldUseMocks) return mockGetMe(token);
  return apiFetch<{ user: User; accounts: Account[] }>('/auth/me', {
    headers: authHeaders(token),
  });
}

export function useRegisterMutation() {
  return useMutation({ mutationFn: (body: RegisterRequest) => register(body) });
}

export function useLoginMutation() {
  return useMutation({ mutationFn: (body: LoginRequest) => login(body) });
}

export function useMeQuery(token: string | null) {
  return useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: () => getMe(token as string),
    enabled: token !== null,
    retry: false,
  });
}
