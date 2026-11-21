// T-041 API-007/API-008 Zod schemas for POST /auth/register and POST /auth/login
import { z } from 'zod';

const email = z.string().trim().toLowerCase().max(254).email();

export const registerBodySchema = z.object({
  email,
  password: z.string().min(8).max(200),
  name: z.string().trim().min(1).max(120),
});

export const loginBodySchema = z.object({
  email,
  password: z.string().min(1).max(200),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
