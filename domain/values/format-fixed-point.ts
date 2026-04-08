// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { SCALE, DECIMALS } from './currencies';

export const formatFixedPoint = (
  value: bigint,
  displayDecimals: number = 4,
): string => {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const whole = abs / SCALE;
  const frac = abs % SCALE;
  const fracStr = frac.toString().padStart(DECIMALS, '0').slice(0, displayDecimals);
  const formatted = displayDecimals > 0 ? `${whole}.${fracStr}` : `${whole}`;
  return negative ? `-${formatted}` : formatted;
};

export const formatTokenAmount = (value: bigint, displayDecimals = 4): string =>
  formatFixedPoint(value, displayDecimals);

export const formatQuoteAmount = (value: bigint, displayDecimals = 2): string =>
  formatFixedPoint(value, displayDecimals);
// end of LLM written Code
