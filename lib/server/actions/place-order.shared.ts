// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import { QuoteAmount } from '@/domain/values/currencies';
import { divDown, divUp } from '@/domain/values/fixed-point';
import { type } from 'arktype';

const parsePrice = type('string.numeric.parse').pipe(Math.trunc).pipe(BigInt);

export const DEFAULT_ORDER_EXPIRY_MS = 365 * 24 * 60 * 60 * 1000;

export const parseOptionalStopLoss = (stopLoss: string | undefined) => {
  const normalized = stopLoss?.trim();
  if (!normalized) return QuoteAmount.zero;
  return QuoteAmount.new(parsePrice.assert(normalized));
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
  quantity: bigint;
}) => {
  if (o.quantity <= 0n) return o.pool;

  const k = o.pool.reserveBase * o.pool.reserveQuote;

  if (o.side === 'bid') {
    const reserveBase = o.pool.reserveBase - o.quantity;
    const reserveQuote = divUp(k, reserveBase);
    return { reserveBase, reserveQuote };
  }

  const reserveBase = o.pool.reserveBase + o.quantity;
  const reserveQuote = divDown(k, reserveBase);
  return { reserveBase, reserveQuote };
};
// end of LLM written Code
