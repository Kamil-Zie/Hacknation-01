// T-041 API-007..009 (T-092 parcel access, T-104 roles) Accounts of a user (AccountDto with memberCount) and membership check (used by T-042/T-043); T-056 API-014 rename
import { isValidObjectId } from 'mongoose';

import { AccountModel } from '@/models/Account.model';
import { AccountMemberModel } from '@/models/AccountMember.model';
import type { MemberRole } from '@/models/memberRoles';
import { AppError } from '@/utils/AppError';
import { assertDbConnected } from '@/utils/db';

export interface AccountDto {
  id: string;
  name: string;
  memberCount: number;
  // T-104 role of the signed-in user in this account
  role: MemberRole;
}

interface RoleRow {
  _id: unknown;
  role?: string | null;
}

interface MemberLike extends RoleRow {
  userId?: unknown;
  status?: string;
  addedAt?: Date | null;
}

// T-104 The creator is the oldest membership of the account (made at registration); never removable.
function creatorOf(members: MemberLike[]): string | null {
  let first: MemberLike | null = null;
  for (const member of members) {
    const at = member.addedAt ? new Date(member.addedAt).getTime() : Infinity;
    const best = first?.addedAt ? new Date(first.addedAt).getTime() : Infinity;
    if (first === null || at < best) first = member;
  }
  return first ? String(first._id) : null;
}

export async function creatorMemberId(accountId: string): Promise<string | null> {
  return creatorOf((await AccountMemberModel.find({ accountId })) as MemberLike[]);
}

// Older rows have no role: creator = owner, others = partner (they could edit before T-104).
export function effectiveRole(member: RoleRow, creatorId: string | null): MemberRole {
  if (creatorId !== null && String(member._id) === creatorId) return 'owner';
  return (member.role as MemberRole | null | undefined) ?? 'partner';
}

export async function roleOf(userId: string, accountId: string): Promise<MemberRole | null> {
  if (!isValidObjectId(userId) || !isValidObjectId(accountId)) return null;
  assertDbConnected();
  const members = (await AccountMemberModel.find({ accountId })) as MemberLike[];
  const me = members.find(
    (member) => String(member.userId) === userId && member.status === 'active',
  );
  return me ? effectiveRole(me, creatorOf(members)) : null;
}

export function canEdit(role: MemberRole | null): boolean {
  return role === 'owner' || role === 'partner';
}

export function readOnlyError(): AppError {
  return new AppError(
    'READ_ONLY_ROLE',
    'Jako członek albo gość możesz tylko oglądać. Zmiany wprowadza właściciel lub wspólnik.',
    403,
  );
}

// 403 NOT_A_MEMBER for outsiders, 403 READ_ONLY_ROLE for member/guest
export async function assertCanEdit(userId: string, accountId: string): Promise<MemberRole> {
  const role = await roleOf(userId, accountId);
  if (role === null) throw new AppError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa.', 403);
  if (!canEdit(role)) throw readOnlyError();
  return role;
}

export async function isMember(userId: string, accountId: string): Promise<boolean> {
  if (!isValidObjectId(userId) || !isValidObjectId(accountId)) return false;
  assertDbConnected();
  const member = await AccountMemberModel.exists({ userId, accountId, status: 'active' });
  return member !== null;
}

// T-092 Parcels the member may see: null = every parcel of the account (no restriction)
export async function allowedParcelIds(
  userId: string,
  accountId: string,
): Promise<Set<string> | null> {
  if (!isValidObjectId(userId) || !isValidObjectId(accountId)) return null;
  const member = await AccountMemberModel.findOne({ userId, accountId, status: 'active' });
  return member?.parcelIds && member.parcelIds.length > 0 ? new Set(member.parcelIds) : null;
}

// A field is visible only when the member sees every parcel in it (the field report shows each parcel)
export function canSeeField(allowed: Set<string> | null, parcelIds: string[]): boolean {
  return allowed === null || parcelIds.every((id) => allowed.has(id));
}

export async function renameAccount(
  userId: string,
  accountId: string,
  name: string,
): Promise<AccountDto> {
  assertDbConnected();
  const role = await roleOf(userId, accountId);
  if (role === null) throw new AppError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa.', 403);
  if (role !== 'owner') {
    throw new AppError('READ_ONLY_ROLE', 'Nazwę gospodarstwa zmienia tylko właściciel.', 403);
  }
  const account = await AccountModel.findByIdAndUpdate(
    accountId,
    { $set: { name } },
    { new: true },
  );
  if (!account) throw new AppError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa.', 403);
  const memberCount = await AccountMemberModel.countDocuments({ accountId, status: 'active' });
  return { id: String(account._id), name: account.name, memberCount, role };
}

export async function listAccountsForUser(userId: string): Promise<AccountDto[]> {
  assertDbConnected();
  // Oldest membership first: the user's own farm (joined at registration) comes before farms that
  // added them later as a partner, so the frontend opens the own farm after login (accounts[0]).
  const memberships = await AccountMemberModel.find({ userId, status: 'active' }).sort({
    addedAt: 1,
  });
  const accountIds = memberships.map((member) => member.accountId);
  const [found, members] = await Promise.all([
    AccountModel.find({ _id: { $in: accountIds } }),
    AccountMemberModel.find({ accountId: { $in: accountIds }, status: 'active' }),
  ]);
  const byId = new Map(found.map((account) => [String(account._id), account]));
  const creators = new Map(
    await Promise.all(
      accountIds.map(async (id) => [String(id), await creatorMemberId(String(id))] as const),
    ),
  );
  const myRole = new Map(
    memberships.map((member) => [
      String(member.accountId),
      effectiveRole(member, creators.get(String(member.accountId)) ?? null),
    ]),
  );
  const accounts = accountIds.flatMap((id) => {
    const account = byId.get(String(id));
    return account ? [account] : [];
  });
  return accounts.map((account) => ({
    id: String(account._id),
    name: account.name,
    memberCount: members.filter((member) => String(member.accountId) === String(account._id))
      .length,
    role: myRole.get(String(account._id)) ?? 'partner',
  }));
}
