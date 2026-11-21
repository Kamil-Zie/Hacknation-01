// API-010 API-011 API-012 API-013 Mock of account members and report history, uses the store from auth.mock
import { ApiError } from '@/api/client';
import type { Member, ReportSummary } from '@/api/types';
import {
  getStore,
  mockDelay,
  nextId,
  normalizeEmail,
  requireAccount,
  saveStore,
} from '@/mocks/auth.mock';

export async function mockGetMembers(accountId: string, token: string): Promise<Member[]> {
  await mockDelay();
  return [...requireAccount(accountId, token).members];
}

export async function mockAddMember(
  accountId: string,
  email: string,
  token: string,
): Promise<Member> {
  await mockDelay();
  const account = requireAccount(accountId, token);
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) {
    throw new ApiError('VALIDATION_ERROR', 'Podaj poprawny adres e-mail', 422);
  }
  if (account.members.some((m) => m.email === normalized)) {
    throw new ApiError('ALREADY_MEMBER', 'Ta osoba jest już na liście członków', 409);
  }
  const existing = getStore().users.find((user) => user.email === normalized);
  const member: Member = {
    id: nextId('m'),
    email: normalized,
    name: existing?.name ?? null,
    status: existing ? 'active' : 'pending',
    addedAt: new Date().toISOString(),
  };
  account.members.push(member);
  saveStore();
  return member;
}

export async function mockRemoveMember(
  accountId: string,
  memberId: string,
  token: string,
): Promise<void> {
  await mockDelay();
  const account = requireAccount(accountId, token);
  const target = account.members.find((m) => m.id === memberId);
  if (!target) throw new ApiError('MEMBER_NOT_FOUND', 'Nie znaleziono członka', 404);
  const activeCount = account.members.filter((m) => m.status === 'active').length;
  if (target.status === 'active' && activeCount <= 1) {
    throw new ApiError('LAST_MEMBER', 'Nie można usunąć ostatniego członka konta', 409);
  }
  account.members = account.members.filter((m) => m.id !== memberId);
  saveStore();
}

export async function mockGetAccountReports(
  accountId: string,
  token: string,
): Promise<ReportSummary[]> {
  await mockDelay();
  return [...requireAccount(accountId, token).reports];
}
