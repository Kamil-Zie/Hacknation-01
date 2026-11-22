// T-056 API-014 PATCH /accounts/:accountId, T-091 API-020 GET and T-098 API-022 POST /accounts/:accountId/parcels controllers
import * as accountParcelsService from '@/services/accountParcels.service';
import * as accountsService from '@/services/accounts.service';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';
import type { AddAccountParcelBody, RenameAccountBody } from '@/validation/accounts.schema';

export const rename = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
  const { name } = req.body as RenameAccountBody;
  res.json(await accountsService.renameAccount(req.userId, String(req.params.accountId), name));
});

export const listParcels = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
  res.json(
    await accountParcelsService.listAccountParcels(req.userId, String(req.params.accountId)),
  );
});

export const addParcel = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
  const { parcelId } = req.body as AddAccountParcelBody;
  const { created, item } = await accountParcelsService.addAccountParcel(
    req.userId,
    String(req.params.accountId),
    parcelId,
  );
  res.status(created ? 201 : 200).json(item);
});
