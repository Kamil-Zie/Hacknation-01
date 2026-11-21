// T-004 DM-002 source_cache access: getCached / setCached; Mongo errors are logged and treated as a miss
import mongoose from 'mongoose';

import { SourceCacheModel } from '@/models/SourceCache.model';
import type { SourceId } from '@/services/sources/types';
import { logger } from '@/utils/logger';

export type CachedEntry = {
  payload: unknown;
  dataPeriod: string | null;
  fetchedAt: Date;
};

export type SourceCacheStore = {
  get: (key: string) => Promise<CachedEntry | null>;
  set: (
    key: string,
    sourceId: SourceId,
    payload: unknown,
    ttlMs: number,
    dataPeriod: string | null,
  ) => Promise<void>;
};

export async function getCached(key: string): Promise<CachedEntry | null> {
  if (!isDbConnected()) return null;
  try {
    const doc = await SourceCacheModel.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
    if (!doc) return null;
    return { payload: doc.payload, dataPeriod: doc.dataPeriod ?? null, fetchedAt: doc.fetchedAt };
  } catch (error) {
    logger.warn(`source cache read failed (${key}): ${describeError(error)}`);
    return null;
  }
}

export async function setCached(
  key: string,
  sourceId: SourceId,
  payload: unknown,
  ttlMs: number,
  dataPeriod: string | null,
): Promise<void> {
  if (!isDbConnected()) return;
  const now = new Date();
  try {
    await SourceCacheModel.updateOne(
      { key },
      {
        $set: {
          key,
          sourceId,
          payload,
          dataPeriod,
          fetchedAt: now,
          expiresAt: new Date(now.getTime() + ttlMs),
        },
      },
      { upsert: true },
    );
  } catch (error) {
    logger.warn(`source cache write failed (${key}): ${describeError(error)}`);
  }
}

export const mongoSourceCache: SourceCacheStore = { get: getCached, set: setCached };

// Without a connection Mongoose would buffer the query for 10 s; treat it as a miss instead.
function isDbConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
