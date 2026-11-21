// T-045 UI-C-013 UI-C-015 Zustand store: auth session (token, user, accounts, active account) kept in localStorage (remember me) or sessionStorage (T-074)
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Account, Session, User } from '@/api/types';

interface SessionState {
  token: string | null;
  user: User | null;
  accounts: Account[];
  activeAccountId: string | null;
  setSession: (session: Session, rememberMe?: boolean) => void;
  setActiveAccount: (accountId: string) => void;
  setAccounts: (accounts: Account[]) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const STORAGE_KEY = 'kropelka-session';
// true = localStorage (stays after closing the browser), false = sessionStorage (T-074)
let remember = true;

function safe<T>(action: () => T): T | null {
  try {
    return action();
  } catch {
    return null;
  }
}

const dualStorage = {
  getItem: (name: string) => {
    const local = safe(() => localStorage.getItem(name));
    if (local !== null) {
      remember = true;
      return local;
    }
    const session = safe(() => sessionStorage.getItem(name));
    if (session !== null) remember = false;
    return session;
  },
  setItem: (name: string, value: string) => {
    safe(() => (remember ? localStorage : sessionStorage).setItem(name, value));
  },
  removeItem: (name: string) => {
    safe(() => localStorage.removeItem(name));
    safe(() => sessionStorage.removeItem(name));
  },
};

const EMPTY = { token: null, user: null, accounts: [], activeAccountId: null };

function pickActive(accounts: Account[], current: string | null): string | null {
  return accounts.some((account) => account.id === current) ? current : (accounts[0]?.id ?? null);
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      ...EMPTY,
      setSession: (session, rememberMe = true) => {
        dualStorage.removeItem(STORAGE_KEY);
        remember = rememberMe;
        set((state) => ({
          token: session.token,
          user: session.user,
          accounts: session.accounts,
          activeAccountId: pickActive(session.accounts, state.activeAccountId),
        }));
      },
      setActiveAccount: (accountId) => set({ activeAccountId: accountId }),
      setAccounts: (accounts) =>
        set((state) => ({
          accounts,
          activeAccountId: pickActive(accounts, state.activeAccountId),
        })),
      setUser: (user) => set({ user }),
      logout: () => {
        set({ ...EMPTY });
        dualStorage.removeItem(STORAGE_KEY);
      },
    }),
    { name: STORAGE_KEY, storage: createJSONStorage(() => dualStorage) },
  ),
);

const EXPIRED_KEY = 'kropelka-session-expired';

// T-081 one-shot flag for the login page after a 401 (survives the redirect, read once)
export function markSessionExpired(): void {
  safe(() => sessionStorage.setItem(EXPIRED_KEY, '1'));
}

export function readSessionExpired(): boolean {
  return safe(() => sessionStorage.getItem(EXPIRED_KEY)) === '1';
}

export function clearSessionExpired(): void {
  safe(() => sessionStorage.removeItem(EXPIRED_KEY));
}
