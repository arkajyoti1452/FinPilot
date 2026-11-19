import { describe, expect, it } from 'vitest';
import { currencyDigits, formatMinorAmount, parseMajorAmount } from './money';

describe('money helpers', () => {
  it('formats integer minor units as currency', () => {
    expect(formatMinorAmount(123456, 'INR', 'en-IN')).toContain('1,234.56');
  });

  it('respects currencies without fractional minor units', () => {
    expect(currencyDigits('JPY')).toBe(0);
    expect(parseMajorAmount('1200', 'JPY')).toBe(1200);
  });

  it('rejects precision that the currency cannot represent', () => {
    expect(parseMajorAmount('12.345', 'INR')).toBeNull();
  });

  it('rejects unsafe and non-positive values', () => {
    expect(parseMajorAmount('0', 'INR')).toBeNull();
    expect(parseMajorAmount('999999999999999999', 'INR')).toBeNull();
    expect(() => formatMinorAmount(Number.MAX_SAFE_INTEGER + 1)).toThrow(RangeError);
  });
});
