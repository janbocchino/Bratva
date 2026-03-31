// beginning of LLM written Code, Model: GPT-5.4
import { Cent } from '@/domain/values/currencies';
import { type } from 'arktype';

const parsePrice = type('string.numeric.parse').pipe(Math.trunc).pipe(BigInt);

export const DEFAULT_ORDER_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;

export const parseOptionalStopLoss = (stopLoss: string | undefined) => {
  const normalized = stopLoss?.trim();
  if (!normalized) return Cent.new(0n);
  return Cent.new(parsePrice.assert(normalized));
};

export const parseOptionalExpiresAt = (expiresAt: string | undefined) => {
  const normalized = expiresAt?.trim();
  if (!normalized) return new Date(Date.now() + DEFAULT_ORDER_EXPIRY_MS);

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) throw new Error('Invalid expiresAt');
  return parsed;
};

export const applyAmmFillToPool = (o: {
  side: 'bid' | 'ask';
  pool: { reserveBase: bigint; reserveQuote: bigint };
  quantity: number;
}) => {
  if (o.quantity <= 0) return o.pool;

  const quantity = BigInt(o.quantity);
  const k = o.pool.reserveBase * o.pool.reserveQuote;

  if (o.side === 'bid') {
    const reserveBase = o.pool.reserveBase - quantity;
    const reserveQuote = (k + reserveBase - 1n) / reserveBase;
    return { reserveBase, reserveQuote };
  }

  const reserveBase = o.pool.reserveBase + quantity;
  const reserveQuote = k / reserveBase;
  return { reserveBase, reserveQuote };
};
// end of LLM written Code
