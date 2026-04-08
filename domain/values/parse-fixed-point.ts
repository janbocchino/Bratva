// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { DECIMALS } from './currencies';

export const parseFixedPoint = (input: string, decimals: number = DECIMALS): bigint => {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed === '.') throw new Error('Empty input');

  const negative = trimmed.startsWith('-');
  const unsigned = negative ? trimmed.slice(1) : trimmed;

  const [wholePart, fracPart, ...rest] = unsigned.split('.');
  if (rest.length > 0) throw new Error('Multiple decimal points');

  const whole = wholePart || '0';
  if (!/^\d+$/.test(whole)) throw new Error('Non-numeric whole part');

  const frac = (fracPart ?? '').slice(0, decimals).padEnd(decimals, '0');
  if (!/^\d*$/.test(fracPart ?? '')) throw new Error('Non-numeric fractional part');

  const raw = BigInt(whole + frac);
  return negative ? -raw : raw;
};
// end of LLM written Code
