import type { Market } from '../aggregates/exchange';
import type { Cent, Units } from '../values/currencies';
import { E, Fn } from '@/lib/shared/imports';
import type { LiquidityPosition } from '../aggregates/liquidity';
import { LiquidityValidationError, LiquidityLockError, MarketClosedError } from '../errors';
import { BigInt as BigIntEffect, Option } from 'effect';

export const MIN_LIQUIDITY_CENTS = 10_000n; // $100 in cents
export const LOCK_DURATION_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

// ── Helpers ──────────────────────────────────────────────────────────

const poolValueCents = (reserveQuote: bigint) => 2n * reserveQuote;
const meetsThreshold = (reserveQuote: bigint) =>
  poolValueCents(reserveQuote) >= MIN_LIQUIDITY_CENTS;

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
  const tolerance = BigIntEffect.max(lhs, rhs) / 100n;

  if (BigIntEffect.abs(lhs - rhs) > tolerance)
    return E.fail(
      new LiquidityValidationError({ cause: 'Deposit ratio must match current pool price' }),
    );
  return E.void;
}

// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
export const validateProvide = (p: {
  market: Market;
  amountBase: Units;
  amountQuote: Cent;
}) =>
  Fn.pipe(
    validateLiquidityParams(p),
    E.flatMap(() =>
      validateDepositRatio(
        BigInt(p.amountBase),
        BigInt(p.amountQuote),
        BigInt(p.market.ammPool.reserveBase),
        BigInt(p.market.ammPool.reserveQuote),
      ),
    ),
  );
// end of LLM written Code

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
  ? Fn.pipe(
      BigIntEffect.sqrt(p.amountBase * p.amountQuote),
      Option.getOrElse(() => 0n) 
    )
  : BigIntEffect.min(
      (p.amountBase * p.totalLpSupply) / p.reserveBase,
      (p.amountQuote * p.totalLpSupply) / p.reserveQuote
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

// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
export const provideLiquidity = (input: ProvideLiquidityInput): ProvideLiquidityResult =>
  Fn.pipe(
    {
      base: BigInt(input.amountBase),
      quote: BigInt(input.amountQuote),
      rBase: BigInt(input.market.ammPool.reserveBase),
      rQuote: BigInt(input.market.ammPool.reserveQuote),
    },
    (ctx) => ({
      ...ctx,
      lpTokensMinted: calcLpTokens({
        amountBase: ctx.base,
        amountQuote: ctx.quote,
        reserveBase: ctx.rBase,
        reserveQuote: ctx.rQuote,
        totalLpSupply: input.market.totalLpTokens,
      }),
      newReserveBase: ctx.rBase + ctx.base,
      newReserveQuote: ctx.rQuote + ctx.quote,
    }),
    (ctx) => ({
      lpTokensMinted: ctx.lpTokensMinted,
      newReserveBase: ctx.newReserveBase,
      newReserveQuote: ctx.newReserveQuote,
      newTotalLpTokens: input.market.totalLpTokens + ctx.lpTokensMinted,
      lockedUntil:
        input.market.status === 'active'
          ? new Date(input.currentTimestamp.getTime() + LOCK_DURATION_MS)
          : null,
      shouldActivateMarket:
        input.market.status === 'pending' && meetsThreshold(ctx.newReserveQuote),
    }),
  );
// end of LLM written Code

// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking

// ── Withdraw liquidity ───────────────────────────────────────────────

export type WithdrawLiquidityInput = {
  market: Market;
  position: LiquidityPosition;
  currentTimestamp: Date;
};

export type WithdrawLiquidityResult = {
  shareBase: bigint;
  shareQuote: bigint;
  newReserveBase: bigint;
  newReserveQuote: bigint;
  newTotalLpTokens: bigint;
  shouldDeactivateMarket: boolean;
};

export function validateWithdrawLiquidity(
  input: WithdrawLiquidityInput,
): E.Effect<void, LiquidityValidationError | LiquidityLockError | MarketClosedError> {
  if (input.market.status === 'closed')
    return E.fail(new MarketClosedError({ marketId: input.market.id }));
  if (input.position.status !== 'active')
    return E.fail(new LiquidityValidationError({ cause: 'Position is not active' }));
  if (
    input.position.lockedUntil !== null &&
    input.position.lockedUntil.getTime() > input.currentTimestamp.getTime()
  )
    return E.fail(
      new LiquidityLockError({
        cause: `Position locked until ${input.position.lockedUntil.toISOString()}`,
      }),
    );
  if (input.market.totalLpTokens === 0n)
    return E.fail(new LiquidityValidationError({ cause: 'No LP tokens in pool' }));
  return E.void;
}

export const withdrawLiquidity = (input: WithdrawLiquidityInput): WithdrawLiquidityResult =>
  Fn.pipe(
    {
      rBase: BigInt(input.market.ammPool.reserveBase),
      rQuote: BigInt(input.market.ammPool.reserveQuote),
      totalLp: input.market.totalLpTokens,
      posLp: input.position.lpTokens,
    },
    (ctx) => ({
      ...ctx,
      shareBase: (ctx.posLp * ctx.rBase) / ctx.totalLp,
      shareQuote: (ctx.posLp * ctx.rQuote) / ctx.totalLp,
    }),
    (ctx) => ({
      shareBase: ctx.shareBase,
      shareQuote: ctx.shareQuote,
      newReserveBase: ctx.rBase - ctx.shareBase,
      newReserveQuote: ctx.rQuote - ctx.shareQuote,
      newTotalLpTokens: ctx.totalLp - ctx.posLp,
      shouldDeactivateMarket:
        input.market.status === 'active' && !meetsThreshold(ctx.rQuote - ctx.shareQuote),
    }),
  );

export const executeWithdraw = (input: WithdrawLiquidityInput) =>
  Fn.pipe(
    validateWithdrawLiquidity(input),
    E.map(() => withdrawLiquidity(input)),
  );
// end of LLM written Code
