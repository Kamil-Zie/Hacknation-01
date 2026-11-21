// API-010 API-011 API-012 API-013 API-014 Mock of account members and report history, uses the store from auth.mock
import { ApiError } from '@/api/client';
import type { Account, Member, ReportSummary } from '@/api/types';
import {
  MAX_ACCOUNT_NAME,
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

export async function mockRenameAccount(
  accountId: string,
  name: string,
  token: string,
): Promise<Account> {
  await mockDelay();
  const account = requireAccount(accountId, token);
  const trimmed = name.trim();
  if (!trimmed || trimmed.length > MAX_ACCOUNT_NAME) {
    throw new ApiError('VALIDATION_ERROR', 'Nazwa musi mieć od 1 do 120 znaków', 422, {
      field: 'name',
    });
  }
  account.name = trimmed;
  saveStore();
  return {
    id: account.id,
    name: account.name,
    memberCount: account.members.filter((m) => m.status === 'active').length,
  };
}

// Called by createAnalysis in mock mode, so other members see the report after logging in
export function mockAppendAccountReport(accountId: string, summary: ReportSummary): void {
  const account = getStore().accounts.find((item) => item.id === accountId);
  if (!account) return;
  account.reports = [summary, ...account.reports.filter((item) => item.id !== summary.id)];
  saveStore();
}

export async function mockGetAccountReports(
  accountId: string,
  token: string,
): Promise<ReportSummary[]> {
  await mockDelay();
  return [...requireAccount(accountId, token).reports];
}
