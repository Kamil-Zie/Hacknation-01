// T-045 UI-C-013 UI-C-015 Zustand store: auth session (token, user, accounts, active account) kept in localStorage
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Account, Session, User } from '@/api/types';

interface SessionState {
  token: string | null;
  user: User | null;
  accounts: Account[];
  activeAccountId: string | null;
  setSession: (session: Session) => void;
  setActiveAccount: (accountId: string) => void;
  setAccounts: (accounts: Account[]) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const EMPTY = { token: null, user: null, accounts: [], activeAccountId: null };

function pickActive(accounts: Account[], current: string | null): string | null {
  return accounts.some((account) => account.id === current) ? current : (accounts[0]?.id ?? null);
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...EMPTY,
      setSession: (session) =>
        set((state) => ({
          token: session.token,
          user: session.user,
          accounts: session.accounts,
          activeAccountId: pickActive(session.accounts, state.activeAccountId),
        })),
      setActiveAccount: (accountId) => set({ activeAccountId: accountId }),
      setAccounts: (accounts) =>
        set((state) => ({
          accounts,
          activeAccountId: pickActive(accounts, state.activeAccountId),
        })),
      setUser: (user) => set({ user }),
      logout: () => set({ ...EMPTY }),
    }),
    { name: 'kropelka-session' },
  ),
);
