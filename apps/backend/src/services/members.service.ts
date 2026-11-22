// T-042 API-010 API-011 API-012 (T-092 API-021 parcel access, T-104 roles) Account members: list, add by e-mail, remove
// (never the creator; partner removes only member/guest), owner sets roles and parcel access
import mongoose from 'mongoose';

import { AccountMemberModel } from '@/models/AccountMember.model';
import type { MemberRole } from '@/models/memberRoles';
import { UserModel } from '@/models/User.model';
import { creatorMemberId, effectiveRole, isMember, roleOf } from '@/services/accounts.service';
import { AppError } from '@/utils/AppError';
import type { ListMembersQuery } from '@/validation/members.schema';

export interface MemberDto {
  id: string;
  email: string;
  name: string | null;
  status: 'active' | 'pending';
  addedAt: string;
  parcelIds: string[] | null;
  role: MemberRole;
  // the person who created the account: always owner, cannot be removed or re-tagged
  isCreator: boolean;
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
  parcelIds?: string[] | null;
  role?: string | null;
}

function toMemberDto(member: MemberRow, name: string | null, creatorId: string | null): MemberDto {
  return {
    id: String(member._id),
    email: member.email,
    name,
    status: member.status,
    addedAt: member.addedAt.toISOString(),
    parcelIds: member.parcelIds && member.parcelIds.length > 0 ? [...member.parcelIds] : null,
    role: effectiveRole(member, creatorId),
    isCreator: creatorId !== null && String(member._id) === creatorId,
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

async function assertRole(
  userId: string,
  accountId: string,
  roles: MemberRole[],
  message: string,
): Promise<MemberRole> {
  const role = await roleOf(userId, accountId);
  if (role === null) throw new AppError('NOT_A_MEMBER', 'Nie należysz do tego gospodarstwa.', 403);
  if (!roles.includes(role)) throw new AppError('READ_ONLY_ROLE', message, 403);
  return role;
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
  const creatorId = await creatorMemberId(accountId);
  return {
    items: members.map((member) =>
      toMemberDto(
        member,
        member.userId ? (names.get(String(member.userId)) ?? null) : null,
        creatorId,
      ),
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
  await assertRole(
    userId,
    accountId,
    ['owner', 'partner'],
    'Zapraszać mogą właściciel i wspólnik.',
  );
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
      // T-104 a new person only views until the owner gives them another tag
      role: 'member',
    });
    return toMemberDto(member, user ? user.name : null, await creatorMemberId(accountId));
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
  const creatorId = await creatorMemberId(accountId);
  if (creatorId !== null && String(member._id) === creatorId) {
    throw new AppError(
      'CANNOT_REMOVE_CREATOR',
      'Nie można usunąć twórcy gospodarstwa: zawsze pozostaje jego właścicielem.',
      409,
    );
  }
  const myRole = await roleOf(userId, accountId);
  const targetRole = effectiveRole(member, creatorId);
  const isSelf =
    member.userId !== null && member.userId !== undefined && String(member.userId) === userId;
  // owner removes anyone (but the creator), partner only member/guest, everyone may leave
  const allowed =
    isSelf ||
    myRole === 'owner' ||
    (myRole === 'partner' && (targetRole === 'member' || targetRole === 'guest'));
  if (!allowed) {
    throw new AppError(
      'READ_ONLY_ROLE',
      myRole === 'partner'
        ? 'Wspólnik może usunąć tylko członka albo gościa.'
        : 'Usuwać osoby mogą właściciel i wspólnik.',
      403,
    );
  }
  if (member.status === 'active') {
    const active = await AccountMemberModel.countDocuments({ accountId, status: 'active' });
    if (active <= 1) {
      throw new AppError('LAST_MEMBER', 'Nie można usunąć ostatniego członka gospodarstwa.', 409);
    }
  }
  await AccountMemberModel.deleteOne({ _id: memberId, accountId });
}

// API-021 (T-104) Only the owner changes parcel access and role tags; never their own, never the creator's.
export async function updateMember(
  userId: string,
  accountId: string,
  memberId: string,
  change: { parcelIds?: string[] | null; role?: MemberRole },
): Promise<MemberDto> {
  await assertMember(userId, accountId);
  await assertRole(
    userId,
    accountId,
    ['owner'],
    'Dostęp do działek i tagi wspólników zmienia tylko właściciel.',
  );
  const member = await AccountMemberModel.findOne({ _id: memberId, accountId });
  if (!member) throw new AppError('MEMBER_NOT_FOUND', 'Nie ma takiego członka gospodarstwa.', 404);
  if (member.userId && String(member.userId) === userId) {
    throw new AppError('CANNOT_RESTRICT_SELF', 'Nie możesz zmienić dostępu samemu sobie.', 422, {
      field: 'memberId',
    });
  }
  const creatorId = await creatorMemberId(accountId);
  if (creatorId !== null && String(member._id) === creatorId) {
    throw new AppError(
      'CANNOT_CHANGE_CREATOR',
      'Twórca gospodarstwa zawsze jest właścicielem z dostępem do wszystkich działek.',
      409,
      { field: 'memberId' },
    );
  }
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  if (change.role !== undefined) set.role = change.role;
  if (change.parcelIds !== undefined) {
    if (change.parcelIds) set.parcelIds = change.parcelIds;
    else unset.parcelIds = 1;
  }
  const update: Record<string, unknown> = {};
  if (Object.keys(set).length > 0) update.$set = set;
  if (Object.keys(unset).length > 0) update.$unset = unset;
  const updated = await AccountMemberModel.findOneAndUpdate({ _id: memberId, accountId }, update, {
    new: true,
  });
  if (!updated) throw new AppError('MEMBER_NOT_FOUND', 'Nie ma takiego członka gospodarstwa.', 404);
  const user = updated.userId ? await UserModel.findById(updated.userId) : null;
  return toMemberDto(updated, user ? user.name : null, creatorId);
}

// Kept for callers of API-021 that send only parcelIds
export async function updateMemberParcels(
  userId: string,
  accountId: string,
  memberId: string,
  parcelIds: string[] | null,
): Promise<MemberDto> {
  return updateMember(userId, accountId, memberId, { parcelIds });
}
