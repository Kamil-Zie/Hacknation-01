// T-004 DM-011 runSource: cache -> fetcher with timeout and one retry -> SourceResult; never throws
import { mongoSourceCache } from '@/services/sources/cache.service';
import type { SourceCacheStore } from '@/services/sources/cache.service';
import { getSourceTimeoutMs, SOURCE_TTL_MS } from '@/services/sources/catalog';
import type { SourceId, SourceResult } from '@/services/sources/types';
import { logger } from '@/utils/logger';

export type FetcherResult<T> = { data: T; dataPeriod?: string | null } | null;

export type RunSourceOptions<T> = {
  sourceId: SourceId;
  key: string;
  fetcher: (signal: AbortSignal) => Promise<FetcherResult<T>>;
  timeoutMs?: number;
  ttlMs?: number;
  retries?: number;
  // Outer budget (e.g. 25 s analysis limit), combined with the per-source timeout.
  signal?: AbortSignal;
  cache?: SourceCacheStore;
};

// Throw from a fetcher on a non-2xx response; only 5xx is retried.
export class HttpStatusError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP ${status}`);
    this.name = 'HttpStatusError';
  }
}

const MSG_TIMEOUT = 'Źródło nie odpowiedziało na czas';
const MSG_MISSING = 'Brak danych ze źródła';
const MSG_ERROR = 'Źródło zwróciło błąd';
const MSG_EUMETSAT = 'Źródło opcjonalne, brak dostępu do danych (nie wpływa na wynik)';

export async function runSource<T>(options: RunSourceOptions<T>): Promise<SourceResult<T>> {
  const startedAt = Date.now();
  const { sourceId, key } = options;
  const cache = options.cache ?? mongoSourceCache;
  const build = (partial: Partial<SourceResult<T>> & Pick<SourceResult<T>, 'status'>) => ({
    sourceId,
    data: null,
    message: null,
    fetchedAt: null,
    dataPeriod: null,
    durationMs: Date.now() - startedAt,
    ...partial,
  });

  // EUMETSAT is optional and unavailable (ADR-006 update, T-002): no fetcher call, no cache, fetchedAt stays null.
  if (sourceId === 'eumetsat') {
    return build({ status: 'missing', message: MSG_EUMETSAT });
  }

  try {
    const cached = await cache.get(key);
    if (cached) {
      return build({
        status: 'cached',
        data: cached.payload as T,
        fetchedAt: cached.fetchedAt,
        dataPeriod: cached.dataPeriod,
      });
    }

    const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? getSourceTimeoutMs(sourceId));
    const signal = options.signal
      ? AbortSignal.any([timeoutSignal, options.signal])
      : timeoutSignal;
    const fetched = await fetchWithRetry(options.fetcher, signal, options.retries ?? 1);

    if (!fetched || isEmpty(fetched.data)) {
      // DM-011: for missing, fetchedAt is the moment of the attempt.
      return build({ status: 'missing', message: MSG_MISSING, fetchedAt: new Date() });
    }
    const dataPeriod = fetched.dataPeriod ?? null;
    await cache.set(
      key,
      sourceId,
      fetched.data,
      options.ttlMs ?? SOURCE_TTL_MS[sourceId],
      dataPeriod,
    );
    return build({ status: 'ok', data: fetched.data, fetchedAt: new Date(), dataPeriod });
  } catch (error) {
    if (isAbort(error)) {
      logger.warn(`source ${sourceId} timeout`);
      return build({ status: 'timeout', message: MSG_TIMEOUT });
    }
    // Log only the error name: messages may contain URLs with keys.
    logger.warn(`source ${sourceId} failed: ${error instanceof Error ? error.name : 'unknown'}`);
    return build({ status: 'error', message: MSG_ERROR });
  }
}

async function fetchWithRetry<T>(
  fetcher: (signal: AbortSignal) => Promise<FetcherResult<T>>,
  signal: AbortSignal,
  retries: number,
): Promise<FetcherResult<T>> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await fetcher(signal);
    } catch (error) {
      if (signal.aborted || isAbort(error) || attempt >= retries || !isRetryable(error)) {
        throw error;
      }
    }
  }
}

function isRetryable(error: unknown): boolean {
  return !(error instanceof HttpStatusError) || error.status >= 500;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function isEmpty(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  return Array.isArray(data) && data.length === 0;
}
