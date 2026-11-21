// T-077 API-016 POST, API-017 GET, API-018 DELETE /accounts/:accountId/fields controller
import * as fieldsService from '@/services/fields.service';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';
import { listFieldsQuerySchema } from '@/validation/fields.schema';
import type { CreateFieldBody } from '@/validation/fields.schema';

function currentUser(userId: string | undefined): string {
  if (!userId) throw new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
  return userId;
}

export const create = asyncHandler(async (req, res) => {
  res
    .status(201)
    .json(
      await fieldsService.createField(
        currentUser(req.userId),
        String(req.params.accountId),
        req.body as CreateFieldBody,
      ),
    );
});

export const list = asyncHandler(async (req, res) => {
  const query = listFieldsQuerySchema.parse(req.query);
  res.json(
    await fieldsService.listFields(currentUser(req.userId), String(req.params.accountId), query),
  );
});

export const remove = asyncHandler(async (req, res) => {
  await fieldsService.deleteField(
    currentUser(req.userId),
    String(req.params.accountId),
    String(req.params.fieldId),
  );
  res.status(204).end();
});
