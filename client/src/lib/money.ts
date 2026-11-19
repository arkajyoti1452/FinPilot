export function currencyDigits(currency: string): number {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function formatMinorAmount(
  amountMinor: number,
  currency = 'INR',
  locale = 'en-IN',
): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('Money amounts must be safe integer minor units.');
  }

  const majorAmount = amountMinor / 10 ** currencyDigits(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: currencyDigits(currency),
  }).format(majorAmount);
}

export function parseMajorAmount(value: string, currency = 'INR'): number | null {
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;

  const digits = currencyDigits(currency);
  const [whole = '', fraction = ''] = normalized.split('.');
  if (fraction.length > digits) return null;

  const paddedFraction = fraction.padEnd(digits, '0');
  const amountMinor = Number(whole) * 10 ** digits + Number(paddedFraction || 0);
  return Number.isSafeInteger(amountMinor) && amountMinor > 0 ? amountMinor : null;
}
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}
