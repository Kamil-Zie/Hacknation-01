// T-016 DM-010 Polish number formatting tests
import { describe, expect, it } from 'vitest';

import { fmt } from './format.js';

describe('fmt', () => {
  it('uses a decimal comma', () => {
    expect(fmt(26.4)).toBe('26,4');
    expect(fmt(69.3333)).toBe('69,3');
  });

  it('drops ",0" for whole numbers with default digits', () => {
    expect(fmt(18)).toBe('18');
    expect(fmt(52.04)).toBe('52');
  });

  it('keeps fixed precision for explicit digits', () => {
    expect(fmt(0.4, 2)).toBe('0,40');
    expect(fmt(82.4, 0)).toBe('82');
  });

  it('has no thousands separator and no negative zero', () => {
    expect(fmt(1234.5)).toBe('1234,5');
    expect(fmt(-0.01)).toBe('0');
    expect(fmt(-0.01, 1)).toBe('0,0');
  });
});
