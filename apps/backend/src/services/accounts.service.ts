// T-041 API-007..009 Accounts of a user (AccountDto with memberCount) and membership check (used by T-042/T-043)
import { isValidObjectId } from 'mongoose';

import { AccountModel } from '@/models/Account.model';
import { AccountMemberModel } from '@/models/AccountMember.model';
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
