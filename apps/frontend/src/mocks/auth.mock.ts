// API-007 API-008 API-009 API-015 Mock of auth endpoints and shared in-memory account store (persisted in localStorage), ~500 ms delay
import { ApiError } from '@/api/client';
import type {
  Account,
  LoginRequest,
  Member,
  RegisterRequest,
  ReportSummary,
  Session,
  UpdateProfileRequest,
  User,
} from '@/api/types';

const MOCK_DELAY_MS = 500;
const STORAGE_KEY = 'kropelka.mock.accounts.v1';
const TOKEN_PREFIX = 'mock.';
const MIN_PASSWORD_LENGTH = 8;
export const MAX_ACCOUNT_NAME = 120;

interface StoredUser extends User {
  password: string;
}

interface StoredAccount {
  id: string;
  name: string;
  members: Member[];
  reports: ReportSummary[];
}

export interface MockStore {
  users: StoredUser[];
  accounts: StoredAccount[];
  nextId: number;
}

const BRONOWICE_PARCEL = {
  id: '061409_2.0009.612',
  parcelNumber: '612',
  region: 'Bronowice',
  commune: 'Puławy',
};

function makeReport(
  id: string,
  crop: ReportSummary['crop'],
  droughtClass: ReportSummary['droughtClass'],
  createdAt: string,
): ReportSummary {
  return {
    id,
    parcel: BRONOWICE_PARCEL,
    crop,
    analysisDate: '2026-05-25',
    status: 'complete',
    droughtClass,
    createdAt,
  };
}

// Demo seed (fictional data): login demo@kropelka.pl / haslo1234
function createSeed(): MockStore {
  return {
    nextId: 100,
    users: [
      { id: 'u_demo', email: 'demo@kropelka.pl', name: 'Jan Kowalski', password: 'haslo1234' },
      { id: 'u_anna', email: 'anna@kropelka.pl', name: 'Anna Kowalska', password: 'haslo1234' },
    ],
    accounts: [
      {
        id: 'a_kowalscy',
        name: 'Gospodarstwo Kowalscy',
        members: [
          {
            id: 'm_1',
            email: 'demo@kropelka.pl',
            name: 'Jan Kowalski',
            status: 'active',
            addedAt: '2026-11-01T09:00:00.000Z',
          },
          {
            id: 'm_2',
            email: 'anna@kropelka.pl',
            name: 'Anna Kowalska',
            status: 'active',
            addedAt: '2026-11-02T10:30:00.000Z',
          },
          {
            id: 'm_3',
            email: 'doradca@example.pl',
            name: null,
            status: 'pending',
            addedAt: '2026-11-20T15:45:00.000Z',
          },
        ],
        reports: [
          makeReport(
            'rep_mock_3',
            { code: 'maize', name: 'Kukurydza' },
            'severe',
            '2026-05-25T12:10:00.000Z',
          ),
          makeReport(
            'rep_mock_2',
            { code: 'winter_wheat', name: 'Pszenica ozima' },
            'moderate',
            '2026-05-25T11:40:00.000Z',
          ),
          makeReport(
            'rep_mock_1',
            { code: 'potato', name: 'Ziemniak' },
            'none',
            '2026-05-25T09:05:00.000Z',
          ),
        ],
      },
    ],
  };
}

let store: MockStore | null = null;

export function getStore(): MockStore {
  if (store) return store;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) store = JSON.parse(raw) as MockStore;
  } catch {
    store = null;
  }
  store ??= createSeed();
  return store;
}

export function saveStore(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getStore()));
  } catch {
    // Persistence is best-effort in the mock
  }
}

export function nextId(prefix: string): string {
  const current = getStore();
  current.nextId += 1;
  return `${prefix}_${current.nextId}`;
}

export function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function accountsOfUser(user: User): Account[] {
  return getStore()
    .accounts.filter((account) =>
      account.members.some((m) => m.status === 'active' && m.email === user.email),
    )
    .map((account) => ({
      id: account.id,
      name: account.name,
      memberCount: account.members.filter((m) => m.status === 'active').length,
    }));
}

function toUser({ id, email, name }: StoredUser): User {
  return { id, email, name };
}

export function requireUser(token: string): StoredUser {
  const userId = token.startsWith(TOKEN_PREFIX) ? token.slice(TOKEN_PREFIX.length) : null;
  const user = getStore().users.find((item) => item.id === userId);
  if (!user) throw new ApiError('UNAUTHORIZED', 'Sesja wygasła. Zaloguj się ponownie', 401);
  return user;
}

export function requireAccount(accountId: string, token: string): StoredAccount {
  const user = requireUser(token);
  const account = getStore().accounts.find((item) => item.id === accountId);
  const isMember = account?.members.some((m) => m.status === 'active' && m.email === user.email);
  if (!account || !isMember) {
    throw new ApiError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa', 403);
  }
  return account;
}

function toSession(user: StoredUser): Session {
  return { token: `${TOKEN_PREFIX}${user.id}`, user: toUser(user), accounts: accountsOfUser(user) };
}

export async function mockRegister(body: RegisterRequest): Promise<Session> {
  await mockDelay();
  const email = normalizeEmail(body.email);
  const name = body.name.trim();
  if (!email.includes('@') || body.password.length < MIN_PASSWORD_LENGTH || !name) {
    throw new ApiError('VALIDATION_ERROR', 'Sprawdź e-mail, hasło (min. 8 znaków) i nazwę', 422);
  }
  const current = getStore();
  if (current.users.some((item) => item.email === email)) {
    throw new ApiError('EMAIL_TAKEN', 'Konto z tym adresem e-mail już istnieje', 409);
  }
  const user: StoredUser = { id: nextId('u'), email, name, password: body.password };
  current.users.push(user);
  // Pending invitations for this e-mail become memberships
  for (const account of current.accounts) {
    for (const member of account.members) {
      if (member.status === 'pending' && member.email === email) {
        member.status = 'active';
        member.name = name;
      }
    }
  }
  const accountName = body.accountName?.trim() || `Gospodarstwo ${name}`;
  if (accountName.length > MAX_ACCOUNT_NAME) {
    throw new ApiError(
      'VALIDATION_ERROR',
      'Nazwa gospodarstwa może mieć najwyżej 120 znaków',
      422,
      {
        field: 'accountName',
      },
    );
  }
  current.accounts.push({
    id: nextId('a'),
    name: accountName,
    members: [
      { id: nextId('m'), email, name, status: 'active', addedAt: new Date().toISOString() },
    ],
    reports: [],
  });
  saveStore();
  return toSession(user);
}

export async function mockLogin(body: LoginRequest): Promise<Session> {
  await mockDelay();
  // T-051 test hook: this password forces 429 TOO_MANY_ATTEMPTS
  if (body.password === 'za-duzo-prob') {
    throw new ApiError('TOO_MANY_ATTEMPTS', 'Za dużo prób logowania', 429, { retryAfterSec: 30 });
  }
  const user = getStore().users.find((item) => item.email === normalizeEmail(body.email));
  if (!user || user.password !== body.password) {
    throw new ApiError('INVALID_CREDENTIALS', 'Nieprawidłowy e-mail lub hasło', 401);
  }
  return toSession(user);
}

export async function mockGetMe(token: string): Promise<{ user: User; accounts: Account[] }> {
  await mockDelay();
  const user = requireUser(token);
  return { user: toUser(user), accounts: accountsOfUser(user) };
}

export async function mockUpdateProfile(token: string, body: UpdateProfileRequest): Promise<User> {
  await mockDelay();
  const user = requireUser(token);
  const email = body.email === undefined ? user.email : normalizeEmail(body.email);
  const emailChanged = email !== user.email;
  if (body.name !== undefined && !body.name.trim()) {
    throw new ApiError('VALIDATION_ERROR', 'Podaj imię', 422, { field: 'name' });
  }
  if (body.newPassword !== undefined && body.newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new ApiError('VALIDATION_ERROR', 'Hasło za krótkie', 422, { field: 'newPassword' });
  }
  if ((emailChanged || body.newPassword) && body.currentPassword !== user.password) {
    throw new ApiError('INVALID_CREDENTIALS', 'Nieprawidłowe obecne hasło', 401);
  }
  if (emailChanged && getStore().users.some((item) => item.email === email)) {
    throw new ApiError('EMAIL_TAKEN', 'Konto z tym adresem e-mail już istnieje', 409);
  }
  for (const account of getStore().accounts) {
    for (const member of account.members) {
      if (member.email === user.email) {
        member.email = email;
        if (body.name !== undefined) member.name = body.name.trim();
      }
    }
  }
  user.email = email;
  if (body.name !== undefined) user.name = body.name.trim();
  if (body.newPassword) user.password = body.newPassword;
  saveStore();
  return toUser(user);
}
