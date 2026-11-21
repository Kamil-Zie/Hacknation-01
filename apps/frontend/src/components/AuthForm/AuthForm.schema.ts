// UI-C-013 Zod schemas for AuthForm (login and register modes)
import { z } from 'zod';

const email = z.string().trim().min(1, 'Podaj e-mail').email('Podaj poprawny adres e-mail');
const password = z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków');

export const loginSchema = z.object({
  email,
  password,
  name: z.string().optional(),
  accountName: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1, 'Podaj nazwę lub imię'),
  accountName: z.string().trim().max(120, 'Nazwa może mieć najwyżej 120 znaków').optional(),
});

export interface AuthFormValues {
  email: string;
  password: string;
  name?: string;
  accountName?: string;
  rememberMe?: boolean;
}
