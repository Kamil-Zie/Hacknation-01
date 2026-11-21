// T-082 DM-002 copy source_cache from the dev database to another database (prod on Synology): read-only on the
// source, upsert by key on the target, skips expired entries, refuses to write into the dev database 'hacknation'.
//
// Usage (from database/):
//   npm run copy-cache -- --target-db hacknation_prod [--source-db hacknation] [--only uldk,meteo] [--dry-run]
// Connections (secrets only from .env):
//   SOURCE_MONGODB_URI (default MONGODB_URI) – user that can read the source database
//   TARGET_MONGODB_URI (default MONGODB_URI) – user that can write the target database (prod user)
import { resolve } from 'node:path';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: resolve(process.cwd(), '../.env') });
dotenv.config();

const DEV_DB = 'hacknation';
const COLLECTION = 'source_cache';
const BATCH = 200;

type Args = { sourceDb: string; targetDb: string; only: string[] | null; dryRun: boolean };

export function parseArgs(argv: string[]): Args {
  const value = (name: string) => {
    const index = argv.indexOf(name);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  const targetDb = value('--target-db');
  if (!targetDb) throw new Error('Podaj --target-db (np. hacknation_prod)');
  const sourceDb = value('--source-db') ?? DEV_DB;
  if (targetDb === DEV_DB)
    throw new Error(`Odmowa: zapis do bazy dev '${DEV_DB}' jest zablokowany`);
  if (targetDb === sourceDb) throw new Error('Baza źródłowa i docelowa muszą być różne');
  const only = value('--only');
  return {
    sourceDb,
    targetDb,
    only: only
      ? only
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : null,
    dryRun: argv.includes('--dry-run'),
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const sourceUri = process.env.SOURCE_MONGODB_URI ?? process.env.MONGODB_URI;
  const targetUri = process.env.TARGET_MONGODB_URI ?? process.env.MONGODB_URI;
  if (!sourceUri || !targetUri) {
    throw new Error('Brak SOURCE_MONGODB_URI / TARGET_MONGODB_URI (albo MONGODB_URI) w .env');
  }

  const source = await mongoose.createConnection(sourceUri, { dbName: args.sourceDb }).asPromise();
  const target = await mongoose.createConnection(targetUri, { dbName: args.targetDb }).asPromise();
  try {
    const filter: Record<string, unknown> = { expiresAt: { $gt: new Date() } };
    if (args.only) filter.sourceId = { $in: args.only };

    const counts = new Map<string, number>();
    let batch: mongoose.mongo.AnyBulkWriteOperation[] = [];
    const flush = async () => {
      if (batch.length && !args.dryRun) {
        await target.db!.collection(COLLECTION).bulkWrite(batch, { ordered: false });
      }
      batch = [];
    };

    const cursor = source.db!.collection(COLLECTION).find(filter);
    for await (const doc of cursor) {
      const { _id, ...rest } = doc;
      void _id;
      counts.set(String(rest.sourceId), (counts.get(String(rest.sourceId)) ?? 0) + 1);
      batch.push({ replaceOne: { filter: { key: rest.key }, replacement: rest, upsert: true } });
      if (batch.length >= BATCH) await flush();
    }
    await flush();

    // TTL and unique key indexes as in the SourceCache model (no-op when they already exist).
    if (!args.dryRun) {
      await target.db!.collection(COLLECTION).createIndex({ key: 1 }, { unique: true });
      await target
        .db!.collection(COLLECTION)
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    }

    const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
    const mode = args.dryRun ? ' (dry run, nic nie zapisano)' : '';
    process.stdout.write(
      `source_cache ${args.sourceDb} → ${args.targetDb}: ${total} wpisów${mode}\n`,
    );
    for (const [sourceId, n] of [...counts.entries()].sort()) {
      process.stdout.write(`  ${sourceId}: ${n}\n`);
    }
  } finally {
    await source.close();
    await target.close();
  }
}

if (process.argv[1]?.endsWith('copy-cache.ts')) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exit(1);
  });
}
