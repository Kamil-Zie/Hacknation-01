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

// T-049: in-process LRU in front of Mongo. Reading a large entry (nasa_power, 10 years x 11 variables)
// from Atlas takes ~10 s on the hackathon network; from memory it is instant. Same TTL as Mongo.
export const MEMORY_CACHE_MAX_ENTRIES = 50;
type MemoryEntry = CachedEntry & { expiresAt: number };
const memory = new Map<string, MemoryEntry>();

function memoryGet(key: string): CachedEntry | null {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  // Re-insert to mark as most recently used (Map keeps insertion order).
  memory.delete(key);
  memory.set(key, entry);
  return { payload: entry.payload, dataPeriod: entry.dataPeriod, fetchedAt: entry.fetchedAt };
}

function memorySet(key: string, entry: MemoryEntry): void {
  memory.delete(key);
  memory.set(key, entry);
  while (memory.size > MEMORY_CACHE_MAX_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest === undefined) break;
    memory.delete(oldest);
  }
}

export function clearMemoryCache(): void {
  memory.clear();
}

export async function getCached(key: string): Promise<CachedEntry | null> {
  const fromMemory = memoryGet(key);
  if (fromMemory) return fromMemory;
  if (!isDbConnected()) return null;
  try {
    const doc = await SourceCacheModel.findOne({ key, expiresAt: { $gt: new Date() } }).lean();
    if (!doc) return null;
    const entry = {
      payload: doc.payload,
      dataPeriod: doc.dataPeriod ?? null,
      fetchedAt: doc.fetchedAt,
    };
    memorySet(key, { ...entry, expiresAt: doc.expiresAt.getTime() });
    return entry;
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
  const now = new Date();
  memorySet(key, { payload, dataPeriod, fetchedAt: now, expiresAt: now.getTime() + ttlMs });
  if (!isDbConnected()) return;
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
