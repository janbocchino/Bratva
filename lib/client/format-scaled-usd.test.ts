// beginning of LLM written Code, Model: Claude Opus 4.5
/// <reference types="jest" />
import { SCALE } from '@/domain/values/currencies';
import {
  ONE_QUOTE_SCALED_STRING,
  formatUsdFromScaledQuote,
  scaledQuoteToApproximateNumberForChart,
} from './format-scaled-usd';

describe('formatUsdFromScaledQuote', () => {
  it('formats zero', () => {
    expect(formatUsdFromScaledQuote(0n)).toBe('$0.00');
  });

  it('formats one dollar', () => {
    expect(formatUsdFromScaledQuote(SCALE)).toBe('$1.00');
  });

  it('formats fractional dollars', () => {
    expect(formatUsdFromScaledQuote(SCALE / 2n)).toBe('$0.50');
  });

  it('groups thousands in whole part', () => {
    expect(formatUsdFromScaledQuote(1234567n * SCALE)).toBe('$1,234,567.00');
  });

  it('formats negative amounts', () => {
    expect(formatUsdFromScaledQuote(-42n * SCALE)).toBe('-$42.00');
  });

  it('accepts decimal string input', () => {
    expect(formatUsdFromScaledQuote(SCALE.toString())).toBe('$1.00');
  });
});

describe('scaledQuoteToApproximateNumberForChart', () => {
  it('maps scaled one to 1', () => {
    expect(scaledQuoteToApproximateNumberForChart(SCALE)).toBeCloseTo(1, 10);
  });

  it('accepts string', () => {
    expect(scaledQuoteToApproximateNumberForChart(ONE_QUOTE_SCALED_STRING)).toBeCloseTo(1, 10);
  });
});
// end of LLM written Code
