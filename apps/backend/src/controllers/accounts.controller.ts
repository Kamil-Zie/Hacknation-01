// T-056 API-014 PATCH /accounts/:accountId, T-091 API-020 GET /accounts/:accountId/parcels controllers
import * as accountParcelsService from '@/services/accountParcels.service';
import * as accountsService from '@/services/accounts.service';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';
import type { RenameAccountBody } from '@/validation/accounts.schema';

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
