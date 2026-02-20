import type { Market } from '../aggregates/exchange';
import type { Cent, Units } from '../values/currencies';
import { E } from '@/lib/shared/imports';
import { LiquidityValidationError, MarketClosedError } from '../errors';

export const MIN_LIQUIDITY = 100n;
export const LOCK_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Helpers ──────────────────────────────────────────────────────────

function sqrt(value: bigint): bigint {
  if (value < 0n) throw new Error('sqrt of negative number');
  if (value === 0n) return 0n;
  let z = value;
  let x = value / 2n + 1n;
  while (x < z) {
    z = x;
    x = (value / x + x) / 2n;
  }
  return z;
}

const bigMin = (a: bigint, b: bigint) => (a < b ? a : b);
const bigMax = (a: bigint, b: bigint) => (a > b ? a : b);
const bigAbs = (a: bigint) => (a < 0n ? -a : a);

// ── Validation (called from action layer) ────────────────────────────

export function validateLiquidityParams(p: {
  market: Market;
  amountBase: Units;
  amountQuote: Cent;
}): E.Effect<void, LiquidityValidationError | MarketClosedError> {
  if (p.market.status === 'closed') return E.fail(new MarketClosedError({ marketId: p.market.id }));
  if (p.amountBase <= 0n)
    return E.fail(new LiquidityValidationError({ cause: 'Base amount must be > 0' }));
  if (p.amountQuote <= 0n)
    return E.fail(new LiquidityValidationError({ cause: 'Quote amount must be > 0' }));
  return E.void;
}

export function validateDepositRatio(
  amountBase: bigint,
  amountQuote: bigint,
  reserveBase: bigint,
  reserveQuote: bigint,
): E.Effect<void, LiquidityValidationError> {
  if (reserveBase === 0n && reserveQuote === 0n) return E.void;

  const lhs = amountBase * reserveQuote;
  const rhs = amountQuote * reserveBase;
  const tolerance = bigMax(lhs, rhs) / 100n;

  if (bigAbs(lhs - rhs) > tolerance)
    return E.fail(
      new LiquidityValidationError({ cause: 'Deposit ratio must match current pool price' }),
    );
  return E.void;
}

// ── Pure computation ─────────────────────────────────────────────────

export function calcLpTokens(p: {
  amountBase: bigint;
  amountQuote: bigint;
  reserveBase: bigint;
  reserveQuote: bigint;
  totalLpSupply: bigint;
}): bigint {
  const isEmptyPool = p.reserveBase === 0n && p.reserveQuote === 0n;

  return isEmptyPool
    ? sqrt(p.amountBase * p.amountQuote)
    : bigMin(
        (p.amountBase * p.totalLpSupply) / p.reserveBase,
        (p.amountQuote * p.totalLpSupply) / p.reserveQuote,
      );
}

export type ProvideLiquidityInput = {
  market: Market;
  amountBase: Units;
  amountQuote: Cent;
  currentTimestamp: Date;
};

export type ProvideLiquidityResult = {
  lpTokensMinted: bigint;
  newReserveBase: bigint;
  newReserveQuote: bigint;
  newTotalLpTokens: bigint;
  lockedUntil: Date | null;
  shouldActivateMarket: boolean;
};

export function provideLiquidity(input: ProvideLiquidityInput): ProvideLiquidityResult {
  const base = BigInt(input.amountBase);
  const quote = BigInt(input.amountQuote);
  const reserveBase = BigInt(input.market.ammPool.reserveBase);
  const reserveQuote = BigInt(input.market.ammPool.reserveQuote);

  const lpTokensMinted = calcLpTokens({
    amountBase: base,
    amountQuote: quote,
    reserveBase,
    reserveQuote,
    totalLpSupply: input.market.totalLpTokens,
  });

  const newReserveBase = reserveBase + base;

  return {
    lpTokensMinted,
    newReserveBase,
    newReserveQuote: reserveQuote + quote,
    newTotalLpTokens: input.market.totalLpTokens + lpTokensMinted,
    lockedUntil:
      input.market.status === 'active'
        ? new Date(input.currentTimestamp.getTime() + LOCK_DURATION_MS)
        : null,
    shouldActivateMarket: input.market.status === 'pending' && newReserveBase >= MIN_LIQUIDITY,
  };
}
