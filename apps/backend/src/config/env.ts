// T-001 Environment variables: the only place that reads process.env
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

import { logger } from '@/utils/logger';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().optional(),
  MONGODB_DB: z.string().default('hacknation'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  EUMETSAT_CONSUMER_KEY: z.string().optional(),
  EUMETSAT_CONSUMER_SECRET: z.string().optional(),
  EUMETSAT_TOKEN_URL: z.string().default('https://api.eumetsat.int/token'),
  EUMETSAT_API_URL: z.string().default('https://api.eumetsat.int/data'),
  EUMETSAT_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  ANALYSIS_BUDGET_MS: z.coerce.number().int().positive().default(25000),
  OVERPASS_URL: z.string().default('https://overpass-api.de/api/interpreter'),
  OVERPASS_FALLBACK_URL: z.string().default('https://overpass.kumi.systems/api/interpreter'),
  JWT_SECRET: z.string().optional(),
});

const parsed = envSchema.parse(process.env);
let jwtSecret = parsed.JWT_SECRET;
if (!jwtSecret) {
  if (parsed.NODE_ENV === 'production') throw new Error('JWT_SECRET is required in production');
  // Dev/test: random per process, so tokens stop working after a restart.
  jwtSecret = randomBytes(32).toString('hex');
  if (parsed.NODE_ENV === 'development') {
    logger.warn('JWT_SECRET is empty: using a random secret, sessions reset on restart');
  }
}

export const env = { ...parsed, JWT_SECRET: jwtSecret };
