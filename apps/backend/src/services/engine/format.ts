// T-016 DM-010 Polish number formatting for report texts
const LOCALE = 'pl-PL';
const DEFAULT_MAX_DIGITS = 1;

// Decimal comma, no thousands separator. With the default digits the trailing ",0" is dropped
// (18 -> "18", 26.4 -> "26,4"); with explicit digits the precision is fixed (0.4, 2 -> "0,40").
export function fmt(value: number, digits?: number): string {
  const isExplicit = digits !== undefined;
  const maxDigits = digits ?? DEFAULT_MAX_DIGITS;
  const formatted = new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: isExplicit ? maxDigits : 0,
    maximumFractionDigits: maxDigits,
    useGrouping: false,
  }).format(value);
  // Rounding a tiny negative value must not produce "-0".
  return /^-0(,0+)?$/.test(formatted) ? formatted.slice(1) : formatted;
}
