// T-041 API-007 POST /auth/register, API-008 POST /auth/login, API-009 GET /auth/me, API-015 PATCH /auth/me service
import { AccountModel } from '@/models/Account.model';
import { AccountMemberModel } from '@/models/AccountMember.model';
import { UserModel } from '@/models/User.model';
import { listAccountsForUser } from '@/services/accounts.service';
import type { AccountDto } from '@/services/accounts.service';
import { AppError } from '@/utils/AppError';
import { assertDbConnected } from '@/utils/db';
import { REMEMBER_TOKEN_TTL_SEC, TOKEN_TTL_SEC, signToken } from '@/utils/jwt';
import { hashPassword, verifyPassword } from '@/utils/password';
import type { LoginBody, RegisterBody, UpdateProfileBody } from '@/validation/auth.schema';

export interface UserDto {
  id: string;
  email: string;
  name: string;
}

export interface MeDto {
  user: UserDto;
  accounts: AccountDto[];
}

export interface SessionDto extends MeDto {
  token: string;
}

const DEFAULT_ACCOUNT_NAME = 'Moje gospodarstwo';
// T-041: 10 failed logins per IP + e-mail within 15 minutes (T-066: IP is part of the key).
export const MAX_FAILED_LOGINS = 10;
const FAILED_LOGIN_WINDOW_MS = 15 * 60 * 1000;

// In-memory failed-login timestamps per e-mail (demo-grade limiter, reset on restart).
const failedLogins = new Map<string, number[]>();

export function resetLoginLimiter(): void {
  failedLogins.clear();
}

// Drops expired entries on every call, so the map cannot grow without bound.
function recentFailures(key: string, now: number): number[] {
  for (const [entryKey, times] of failedLogins) {
    const live = times.filter((at) => now - at < FAILED_LOGIN_WINDOW_MS);
    if (live.length === 0) failedLogins.delete(entryKey);
    else failedLogins.set(entryKey, live);
  }
  const recent = failedLogins.get(key) ?? [];
  failedLogins.set(key, recent);
  return recent;
}

function toUserDto(user: { _id: unknown; email: string; name: string }): UserDto {
  return { id: String(user._id), email: user.email, name: user.name };
}

function defaultAccountName(userName: string): string {
  const name = userName.trim();
  return name ? `Gospodarstwo ${name}`.slice(0, 120) : DEFAULT_ACCOUNT_NAME;
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

export async function register(body: RegisterBody): Promise<SessionDto> {
  assertDbConnected();
  const email = body.email.toLowerCase();
  if (await UserModel.exists({ email })) throw emailTaken();
  const passwordHash = await hashPassword(body.password);
  let user;
  try {
    user = await UserModel.create({ email, name: body.name, passwordHash, createdAt: new Date() });
  } catch (error) {
    if (isDuplicateKey(error)) throw emailTaken();
    throw error;
  }
  // Invitations sent to this e-mail before registration become memberships.
  await AccountMemberModel.updateMany(
    { email, status: 'pending' },
    { $set: { userId: user._id, status: 'active' } },
  );
  const account = await AccountModel.create({
    name: body.accountName ?? defaultAccountName(body.name),
    createdAt: new Date(),
  });
  await AccountMemberModel.create({
    accountId: account._id,
    userId: user._id,
    email,
    status: 'active',
    addedAt: new Date(),
  });
  return {
    token: signToken(String(user._id), { ttlSec: REMEMBER_TOKEN_TTL_SEC }),
    user: toUserDto(user),
    accounts: await listAccountsForUser(String(user._id)),
  };
}

export async function login(body: LoginBody, ip: string): Promise<SessionDto> {
  assertDbConnected();
  const email = body.email.toLowerCase();
  const now = Date.now();
  const key = `${ip}|${email}`;
  const failures = recentFailures(key, now);
  if (failures.length >= MAX_FAILED_LOGINS) {
    const retryAfterSec = Math.ceil(((failures[0] ?? now) + FAILED_LOGIN_WINDOW_MS - now) / 1000);
    throw new AppError(
      'TOO_MANY_ATTEMPTS',
      'Zbyt wiele nieudanych prób logowania. Spróbuj ponownie później.',
      429,
      { retryAfterSec },
    );
  }
  const user = await UserModel.findOne({ email });
  const valid = user !== null && (await verifyPassword(body.password, user.passwordHash));
  if (!user || !valid) {
    failures.push(now);
    throw new AppError('INVALID_CREDENTIALS', 'Nieprawidłowy e-mail lub hasło.', 401);
  }
  failedLogins.delete(key);
  return {
    token: signToken(String(user._id), {
      ttlSec: body.rememberMe ? REMEMBER_TOKEN_TTL_SEC : TOKEN_TTL_SEC,
    }),
    user: toUserDto(user),
    accounts: await listAccountsForUser(String(user._id)),
  };
}

export async function me(userId: string): Promise<MeDto> {
  assertDbConnected();
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
  return { user: toUserDto(user), accounts: await listAccountsForUser(userId) };
}

export async function updateProfile(userId: string, body: UpdateProfileBody): Promise<MeDto> {
  assertDbConnected();
  const user = await UserModel.findById(userId);
  if (!user) throw new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
  const changes: { name?: string; email?: string; passwordHash?: string } = {};
  if (body.name !== undefined) changes.name = body.name;
  const newEmail = body.email !== undefined && body.email !== user.email ? body.email : undefined;
  if (newEmail) changes.email = newEmail;
  if (newEmail || body.newPassword !== undefined) {
    if (body.currentPassword === undefined) {
      throw new AppError('VALIDATION_ERROR', 'Podaj obecne hasło.', 422, {
        field: 'currentPassword',
      });
    }
    if (!(await verifyPassword(body.currentPassword, user.passwordHash))) {
      throw new AppError('INVALID_CREDENTIALS', 'Nieprawidłowe obecne hasło.', 401);
    }
  }
  if (body.newPassword !== undefined) changes.passwordHash = await hashPassword(body.newPassword);
  if (newEmail && (await UserModel.exists({ email: newEmail }))) throw emailTaken();
  try {
    await UserModel.findByIdAndUpdate(userId, { $set: changes });
  } catch (error) {
    if (isDuplicateKey(error)) throw emailTaken();
    throw error;
  }
  // Invitations are matched by e-mail, so memberships follow the new address.
  if (newEmail) await AccountMemberModel.updateMany({ userId }, { $set: { email: newEmail } });
  return me(userId);
}

function emailTaken(): AppError {
  return new AppError('EMAIL_TAKEN', 'Konto z tym adresem e-mail już istnieje.', 409, {
    field: 'email',
  });
}
