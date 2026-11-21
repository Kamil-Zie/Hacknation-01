// T-041 API-007/API-008/API-015 Zod schemas for POST /auth/register, POST /auth/login, PATCH /auth/me
import { z } from 'zod';

const email = z.string().trim().toLowerCase().max(254).email();

export const registerBodySchema = z.object({
  email,
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(120),
  accountName: z.string().trim().min(1).max(120).optional(),
});

export const loginBodySchema = z.object({
  email,
  password: z.string().min(1).max(200),
  rememberMe: z.boolean().optional(),
});

// API-015: at least one of name/email/newPassword; currentPassword rules are checked in the service.
export const updateProfileBodySchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: email.optional(),
    newPassword: z.string().min(8).max(200).optional(),
    currentPassword: z.string().min(1).max(200).optional(),
  })
  .refine(
    (body) => body.name !== undefined || body.email !== undefined || body.newPassword !== undefined,
    { message: 'Podaj imię, e-mail lub nowe hasło.' },
  );

export type UpdateProfileBody = z.infer<typeof updateProfileBodySchema>;
export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
