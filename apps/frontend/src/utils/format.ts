// UI-S-003 Number and date formatters (pl-PL)
const DATE_FORMAT = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long' });
const DATE_TIME_FORMAT = new Intl.DateTimeFormat('pl-PL', {
  dateStyle: 'long',
  timeStyle: 'short',
});

export function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export const NO_DATA = 'Brak danych';

/** Number with unit, or "Brak danych" when the value is missing (null, undefined, NaN) */
export function formatWithUnit(value: number | null | undefined, unit: string, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return NO_DATA;
  return `${formatNumber(value, digits)} ${unit}`;
}

export function formatSigned(value: number, digits = 1): string {
  const text = formatNumber(Math.abs(value), digits);
  if (value > 0) return `+${text}`;
  return value < 0 ? `−${text}` : text;
}

export function formatDate(value: string): string {
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : DATE_FORMAT.format(date);
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DATE_TIME_FORMAT.format(date);
}
