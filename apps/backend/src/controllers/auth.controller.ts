// T-041 API-007 POST /auth/register, API-008 POST /auth/login, API-009 GET /auth/me, API-015 PATCH /auth/me controller
import * as authService from '@/services/auth.service';
import { AppError } from '@/utils/AppError';
import { asyncHandler } from '@/utils/asyncHandler';
import type { LoginBody, RegisterBody, UpdateProfileBody } from '@/validation/auth.schema';

export const register = asyncHandler(async (req, res) => {
  res.status(201).json(await authService.register(req.body as RegisterBody));
});

export const login = asyncHandler(async (req, res) => {
  res.json(await authService.login(req.body as LoginBody, req.ip ?? 'unknown'));
});

export const me = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
  res.json(await authService.me(req.userId));
});

export const updateProfile = asyncHandler(async (req, res) => {
  if (!req.userId) throw new AppError('UNAUTHORIZED', 'Wymagane zalogowanie.', 401);
  res.json(await authService.updateProfile(req.userId, req.body as UpdateProfileBody));
});
