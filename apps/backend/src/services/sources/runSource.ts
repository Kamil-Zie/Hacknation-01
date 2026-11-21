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
  // Optional per-attempt limit: a slow first attempt (cold connection) is cut and retried within timeoutMs.
  attemptTimeoutMs?: number;
  ttlMs?: number;
  retries?: number;
  // T-067: base delay before a retry (doubles each attempt); also makes HTTP 429 retryable. Unset = immediate retry.
  retryDelayMs?: number;
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

const inflight = new Map<string, Promise<unknown>>();

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
    return build({ status: 'missing', message: MSG_EUMETSAT, reasonCode: 'NOT_CONFIGURED' });
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
    // T-078: parallel calls with the same key (neighbouring parcels of a field share the weather grid)
    // wait for one upstream request instead of sending their own.
    let pending = inflight.get(key) as Promise<FetcherResult<T>> | undefined;
    if (!pending) {
      pending = fetchWithRetry(
        options.fetcher,
        signal,
        options.retries ?? 1,
        options.attemptTimeoutMs,
        options.retryDelayMs,
      ).finally(() => inflight.delete(key));
      inflight.set(key, pending);
    }
    const fetched = await pending;

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
      return build({ status: 'timeout', message: MSG_TIMEOUT, reasonCode: 'TIMEOUT' });
    }
    // Log the error kind only (HTTP status or network error code), never the message: it may contain URLs with keys.
    logger.warn(`source ${sourceId} failed: ${errorKind(error)}`);
    const reasonCode =
      error instanceof HttpStatusError && error.status === 429 ? 'RATE_LIMIT' : 'UPSTREAM_ERROR';
    return build({ status: 'error', message: MSG_ERROR, reasonCode });
  }
}

async function fetchWithRetry<T>(
  fetcher: (signal: AbortSignal) => Promise<FetcherResult<T>>,
  signal: AbortSignal,
  retries: number,
  attemptTimeoutMs?: number,
  retryDelayMs?: number,
): Promise<FetcherResult<T>> {
  for (let attempt = 0; ; attempt += 1) {
    const attemptSignal = attemptTimeoutMs
      ? AbortSignal.any([signal, AbortSignal.timeout(attemptTimeoutMs)])
      : signal;
    try {
      return await fetcher(attemptSignal);
    } catch (error) {
      // An attempt cut by attemptTimeoutMs (outer signal still alive) is retryable.
      const attemptTimedOut = !signal.aborted && attemptSignal.aborted;
      if (signal.aborted || attempt >= retries || (!attemptTimedOut && isAbort(error))) {
        throw error;
      }
      if (!attemptTimedOut && !isRetryable(error, retryDelayMs !== undefined)) throw error;
      if (retryDelayMs) await delay(retryDelayMs * 2 ** attempt, signal);
    }
  }
}

function isRetryable(error: unknown, withBackoff: boolean): boolean {
  if (!(error instanceof HttpStatusError)) return true;
  return error.status >= 500 || (withBackoff && error.status === 429);
}

// Waits before a retry; rejects with the abort reason when the outer budget ends first.
function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function errorKind(error: unknown): string {
  if (error instanceof HttpStatusError) return `HTTP ${error.status}`;
  if (!(error instanceof Error)) return 'unknown';
  const cause = (error as { cause?: { code?: unknown } }).cause;
  return typeof cause?.code === 'string' ? `${error.name} (${cause.code})` : error.name;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === 'AbortError' || error.name === 'TimeoutError');
}

function isEmpty(data: unknown): boolean {
  if (data === null || data === undefined) return true;
  return Array.isArray(data) && data.length === 0;
}
