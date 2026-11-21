// T-DB-001 Seed: idempotent upsert of 2 demo reports (from contracts/api.json API-004), refuses hacknation_prod without --prod
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import { AccountModel } from '../apps/backend/src/models/Account.model';
import { AccountMemberModel } from '../apps/backend/src/models/AccountMember.model';
import { UserModel } from '../apps/backend/src/models/User.model';
import { ReportModel } from '../apps/backend/src/models/Report.model';
import { SourceCacheModel } from '../apps/backend/src/models/SourceCache.model';

dotenv.config({ path: resolve(process.cwd(), '../.env') });
dotenv.config();

const PROD_DB = 'hacknation_prod';
const DEMO_REPORTS = [
  { example: '201_complete', id: '665f0c0ffee0000000000001' },
  { example: '201_partial', id: '665f0c0ffee0000000000002' },
];

interface ApiContract {
  endpoints: { id: string; examples: Record<string, Record<string, unknown>> }[];
}

type DemoReport = Record<string, unknown> & { _id: mongoose.Types.ObjectId };

function loadDemoReports(): DemoReport[] {
  const path = resolve(import.meta.dirname, '../contracts/api.json');
  const api = JSON.parse(readFileSync(path, 'utf8')) as ApiContract;
  const endpoint = api.endpoints.find((item) => item.id === 'API-004');
  if (!endpoint) throw new Error('API-004 not found in contracts/api.json');
  return DEMO_REPORTS.map(({ example, id }) => {
    const rest = { ...endpoint.examples[example] };
    delete rest.id;
    return {
      ...rest,
      _id: new mongoose.Types.ObjectId(id),
      computedAt: new Date(rest.computedAt as string),
      createdAt: new Date(rest.createdAt as string),
    };
  });
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB ?? 'hacknation' });
  const dbName = mongoose.connection.name;
  if (dbName === PROD_DB && !process.argv.includes('--prod')) {
    throw new Error(`Refusing to seed ${PROD_DB} without --prod`);
  }
  // T-DB-010: accounts collections get indexes only (no users with passwords in the repo).
  await Promise.all([
    ReportModel.syncIndexes(),
    SourceCacheModel.syncIndexes(),
    UserModel.syncIndexes(),
    AccountModel.syncIndexes(),
    AccountMemberModel.syncIndexes(),
  ]);
  const reports = loadDemoReports();
  for (const report of reports) {
    await ReportModel.collection.replaceOne({ _id: report._id }, report, { upsert: true });
  }
  const ids = reports.map((report) => String(report._id)).join(', ');
  process.stdout.write(
    `Seed on ${dbName}: upserted ${reports.length} reports (${ids}); indexes synced\n`,
  );
  await mongoose.disconnect();
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
