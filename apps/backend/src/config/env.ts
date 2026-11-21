// T-001 Environment variables: the only place that reads process.env
import { resolve } from 'node:path';

import dotenv from 'dotenv';
import { z } from 'zod';

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
});

export const env = envSchema.parse(process.env);
