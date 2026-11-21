// T-001 Seed skeleton (empty): idempotent, refuses hacknation_prod without --prod
import { resolve } from 'node:path';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: resolve(process.cwd(), '../.env') });
dotenv.config();

const PROD_DB = 'hacknation_prod';

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);
  const dbName = mongoose.connection.name;
  if (dbName === PROD_DB && !process.argv.includes('--prod')) {
    throw new Error(`Refusing to seed ${PROD_DB} without --prod`);
  }
  // TODO(T-DB): insert demo data once models exist
  process.stdout.write(`Seed on ${dbName}: nothing to seed yet\n`);
  await mongoose.disconnect();
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
