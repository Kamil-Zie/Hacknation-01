// T-050 DM-011 DM-012 reasonCode -> short Polish text for farmers (source status and data gaps)
const REASON_TEXTS: Record<string, string> = {
  NO_SCENE: 'Brak zdjęcia satelitarnego z ostatnich tygodni',
  CLOUD_COVER: 'Chmury zasłoniły działkę na zdjęciach satelitarnych z ostatnich tygodni',
  PARCEL_TOO_SMALL: 'Działka jest za mała na odczyt ze zdjęcia satelitarnego',
  TIMEOUT: 'Źródło nie odpowiedziało na czas',
  RATE_LIMIT: 'Chwilowy limit zapytań źródła, spróbuj za kilka minut',
  UPSTREAM_ERROR: 'Źródło danych chwilowo nie działa',
  NOT_CONFIGURED: 'To źródło nie jest jeszcze podłączone',
};

/** Unknown or missing code falls back to the message from the API */
export function reasonText(code: string | null | undefined, fallback: string): string;
export function reasonText(code: string | null | undefined, fallback: string | null): string | null;
export function reasonText(
  code: string | null | undefined,
  fallback: string | null,
): string | null {
  return (code && REASON_TEXTS[code]) || fallback;
}
