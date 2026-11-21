// T-041 API-007..009 (T-092 parcel access) Accounts of a user (AccountDto with memberCount) and membership check (used by T-042/T-043); T-056 API-014 rename
import { isValidObjectId } from 'mongoose';

import { AccountModel } from '@/models/Account.model';
import { AccountMemberModel } from '@/models/AccountMember.model';
import { AppError } from '@/utils/AppError';
import { assertDbConnected } from '@/utils/db';

export interface AccountDto {
  id: string;
  name: string;
  memberCount: number;
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
  const account = (await isMember(userId, accountId))
    ? await AccountModel.findByIdAndUpdate(accountId, { $set: { name } }, { new: true })
    : null;
  if (!account) throw new AppError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa.', 403);
  const memberCount = await AccountMemberModel.countDocuments({ accountId, status: 'active' });
  return { id: String(account._id), name: account.name, memberCount };
}

export async function listAccountsForUser(userId: string): Promise<AccountDto[]> {
  assertDbConnected();
  const memberships = await AccountMemberModel.find({ userId, status: 'active' });
  const accountIds = memberships.map((member) => member.accountId);
  const [accounts, members] = await Promise.all([
    AccountModel.find({ _id: { $in: accountIds } }).sort({ createdAt: 1 }),
    AccountMemberModel.find({ accountId: { $in: accountIds }, status: 'active' }),
  ]);
  return accounts.map((account) => ({
    id: String(account._id),
    name: account.name,
    memberCount: members.filter((member) => String(member.accountId) === String(account._id))
      .length,
  }));
}
