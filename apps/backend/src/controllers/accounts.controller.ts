// T-056 API-014 PATCH /accounts/:accountId controller
import * as accountsService from '@/services/accounts.service';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';
import type { RenameAccountBody } from '@/validation/accounts.schema';

export const rename = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
  const { name } = req.body as RenameAccountBody;
  res.json(await accountsService.renameAccount(req.userId, String(req.params.accountId), name));
});
