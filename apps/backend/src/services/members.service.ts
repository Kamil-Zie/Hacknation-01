// T-042 API-010 API-011 API-012 Account members: list, add by e-mail (active/pending), remove (not the last active)
import mongoose from 'mongoose';

import { AccountMemberModel } from '@/models/AccountMember.model';
import { UserModel } from '@/models/User.model';
import { isMember } from '@/services/accounts.service';
import { AppError } from '@/utils/AppError';
import type { ListMembersQuery } from '@/validation/members.schema';

export interface MemberDto {
  id: string;
  email: string;
  name: string | null;
  status: 'active' | 'pending';
  addedAt: string;
}

export interface MemberPage {
  items: MemberDto[];
  page: number;
  pageSize: number;
  total: number;
}

interface MemberRow {
  _id: unknown;
  userId?: unknown;
  email: string;
  status: 'active' | 'pending';
  addedAt: Date;
}

function toMemberDto(member: MemberRow, name: string | null): MemberDto {
  return {
    id: String(member._id),
    email: member.email,
    name,
    status: member.status,
    addedAt: member.addedAt.toISOString(),
  };
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

function alreadyMember(): AppError {
  return new AppError('ALREADY_MEMBER', 'Ta osoba już należy do gospodarstwa.', 409, {
    field: 'email',
  });
}

async function assertMember(userId: string, accountId: string): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    throw new AppError('DB_UNAVAILABLE', 'Baza danych jest niedostępna', 503);
  }
  if (!(await isMember(userId, accountId))) {
    throw new AppError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa.', 403);
  }
}

export async function listMembers(
  userId: string,
  accountId: string,
  query: ListMembersQuery,
): Promise<MemberPage> {
  await assertMember(userId, accountId);
  const { page, pageSize } = query;
  const [members, total] = await Promise.all([
    AccountMemberModel.find({ accountId })
      .sort({ addedAt: 1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
    AccountMemberModel.countDocuments({ accountId }),
  ]);
  const userIds = members.flatMap((member) => (member.userId ? [member.userId] : []));
  const users = await UserModel.find({ _id: { $in: userIds } });
  const names = new Map(users.map((user) => [String(user._id), user.name]));
  return {
    items: members.map((member) =>
      toMemberDto(member, member.userId ? (names.get(String(member.userId)) ?? null) : null),
    ),
    page,
    pageSize,
    total,
  };
}

export async function addMember(
  userId: string,
  accountId: string,
  email: string,
): Promise<MemberDto> {
  await assertMember(userId, accountId);
  const normalized = email.trim().toLowerCase();
  if (await AccountMemberModel.exists({ accountId, email: normalized })) throw alreadyMember();
  const user = await UserModel.findOne({ email: normalized });
  try {
    const member = await AccountMemberModel.create({
      accountId,
      userId: user ? user._id : null,
      email: normalized,
      status: user ? 'active' : 'pending',
      addedAt: new Date(),
    });
    return toMemberDto(member, user ? user.name : null);
  } catch (error) {
    if (isDuplicateKey(error)) throw alreadyMember();
    throw error;
  }
}

export async function removeMember(
  userId: string,
  accountId: string,
  memberId: string,
): Promise<void> {
  await assertMember(userId, accountId);
  const member = await AccountMemberModel.findOne({ _id: memberId, accountId });
  if (!member) throw new AppError('MEMBER_NOT_FOUND', 'Nie ma takiego członka gospodarstwa.', 404);
  if (member.status === 'active') {
    const active = await AccountMemberModel.countDocuments({ accountId, status: 'active' });
    if (active <= 1) {
      throw new AppError('LAST_MEMBER', 'Nie można usunąć ostatniego członka gospodarstwa.', 409);
    }
  }
  await AccountMemberModel.deleteOne({ _id: memberId, accountId });
}
