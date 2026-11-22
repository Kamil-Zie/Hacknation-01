// T-001 T-065 Server start: connect to MongoDB (non-fatal, retried until it works) and listen
import mongoose from 'mongoose';

import { createApp } from '@/app';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

const DEMO_PARCEL_ID = '061409_2.0009.612';
const DB_RETRY_MS = 15000;

async function connectDb(): Promise<void> {
  if (!env.MONGODB_URI) {
    logger.warn('MONGODB_URI is not set, running without database');
    return;
  }
  try {
    await mongoose.connect(env.MONGODB_URI, {
      dbName: env.MONGODB_DB,
      serverSelectionTimeoutMS: 8000,
    });
    logger.info(`MongoDB connected (${mongoose.connection.name})`);
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error instanceof Error ? error.message : error}`);
    // T-065: one failed attempt at start (Atlas IP list, DNS on the NAS) must not leave prod without a database
    logger.info(`MongoDB: next attempt in ${DB_RETRY_MS / 1000} s`);
    setTimeout(() => void connectDb(), DB_RETRY_MS);
  }
}

// Warm up the ULDK connection (DNS/TLS) so the first parcel search on stage does not hit a cold start.
// Direct request (bypasses source_cache, which would skip the network).
async function warmUpUldk(): Promise<void> {
  const startedAt = Date.now();
  try {
    const url = `https://uldk.gugik.gov.pl/?request=GetParcelById&id=${DEMO_PARCEL_ID}&result=teryt`;
    await (await fetch(url, { signal: AbortSignal.timeout(20000) })).text();
    logger.info(`ULDK warm-up ok (${Date.now() - startedAt} ms)`);
  } catch (error) {
    logger.warn(`ULDK warm-up failed: ${error instanceof Error ? error.name : 'unknown'}`);
  }
}

// Safety net for the demo: a stray rejected promise (e.g. a background source read) is logged instead of
// crashing the whole API for everyone. Request errors still go through errorHandler.
process.on('unhandledRejection', (reason) => {
  logger.error(
    `unhandled rejection (process kept alive): ${reason instanceof Error ? (reason.stack ?? reason.message) : String(reason)}`,
  );
});

// Listen only after the connection attempt (connectDb never throws), so the first requests see a ready database.
void connectDb().then(() => {
  createApp().listen(env.PORT, () => {
    logger.info(`API listening on :${env.PORT}/api/v1`);
  });
  void warmUpUldk();
});
