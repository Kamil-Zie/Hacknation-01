// T-001 fetch wrapper: base URL from VITE_API_URL, shared error handling
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  timeoutMs?: number,
): Promise<T> {
  const controller = new AbortController();
  const timer = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : undefined;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'Przekroczono czas oczekiwania na serwer', 0);
    }
    throw new ApiError('NETWORK_ERROR', 'Brak połączenia z serwerem', 0);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      code?: string;
      message?: string;
      details?: Record<string, unknown>;
    } | null;
    throw new ApiError(
      body?.code ?? 'UNKNOWN',
      body?.message ?? 'Błąd serwera',
      response.status,
      body?.details,
    );
  }
  // 204 No Content (e.g. API-012 DELETE member) has no body to parse
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
