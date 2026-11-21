// T-042 API-010 GET, API-011 POST, API-012 DELETE, T-092 API-021 PATCH /accounts/:accountId/members controller
import * as membersService from '@/services/members.service';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';
import { listMembersQuerySchema } from '@/validation/members.schema';
import type { AddMemberBody, UpdateMemberParcelsBody } from '@/validation/members.schema';

function currentUser(userId: string | undefined): string {
  if (!userId) throw new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
  return userId;
}

export const list = asyncHandler(async (req, res) => {
  const query = listMembersQuerySchema.parse(req.query);
  res.json(
    await membersService.listMembers(currentUser(req.userId), String(req.params.accountId), query),
  );
});

export const add = asyncHandler(async (req, res) => {
  const { email } = req.body as AddMemberBody;
  res
    .status(201)
    .json(
      await membersService.addMember(currentUser(req.userId), String(req.params.accountId), email),
    );
});

export const remove = asyncHandler(async (req, res) => {
  await membersService.removeMember(
    currentUser(req.userId),
    String(req.params.accountId),
    String(req.params.memberId),
  );
  res.status(204).end();
});

export const updateParcels = asyncHandler(async (req, res) => {
  const { parcelIds } = req.body as UpdateMemberParcelsBody;
  res.json(
    await membersService.updateMemberParcels(
      currentUser(req.userId),
      String(req.params.accountId),
      String(req.params.memberId),
      parcelIds,
    ),
  );
});
