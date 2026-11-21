// T-051 API-001 API-004 API-008 error code -> user-facing message and retry hint
import { ApiError } from '@/api/client';

const ERROR_MESSAGES: Record<string, string> = {
  PARCEL_NOT_FOUND: 'Nie znaleziono działki. Sprawdź numer albo kliknij działkę na mapie.',
  UPSTREAM_UNAVAILABLE: 'Serwis działek GUGiK chwilowo nie odpowiada. Spróbuj ponownie za chwilę.',
  UPSTREAM_TIMEOUT: 'Rejestr działek (ULDK) nie odpowiedział na czas. Spróbuj ponownie za chwilę.',
  TIMEOUT: 'Serwis odpowiada zbyt długo. Spróbuj ponownie.',
  NETWORK_ERROR: 'Brak połączenia z serwerem. Sprawdź internet i spróbuj ponownie.',
  NOT_A_MEMBER: 'Nie masz dostępu do tego gospodarstwa.',
  DB_UNAVAILABLE: 'Baza danych chwilowo niedostępna. Spróbuj ponownie za chwilę.',
};

const RETRYABLE = new Set([
  'UPSTREAM_TIMEOUT',
  'UPSTREAM_UNAVAILABLE',
  'TIMEOUT',
  'NETWORK_ERROR',
  'DB_UNAVAILABLE',
]);

export function errorMessage(error: unknown): { message: string; canRetry: boolean } {
  if (!(error instanceof ApiError)) {
    return { message: 'Nie udało się wykonać operacji. Spróbuj ponownie.', canRetry: true };
  }
  if (error.code === 'TOO_MANY_ATTEMPTS') {
    const seconds = error.details?.retryAfterSec;
    return {
      message:
        typeof seconds === 'number'
          ? `Za dużo prób logowania. Spróbuj ponownie za ${seconds} s.`
          : 'Za dużo prób logowania. Spróbuj ponownie za chwilę.',
      canRetry: false,
    };
  }
  // Known codes first (e.g. 503 DB_UNAVAILABLE must not read as a GUGiK outage); 502/503 is only a fallback
  const known = ERROR_MESSAGES[error.code];
  if (known) return { message: known, canRetry: RETRYABLE.has(error.code) };
  if (error.status === 502 || error.status === 503) {
    return { message: ERROR_MESSAGES.UPSTREAM_UNAVAILABLE ?? error.message, canRetry: true };
  }
  return {
    message: ERROR_MESSAGES[error.code] ?? error.message,
    canRetry: RETRYABLE.has(error.code),
  };
}
