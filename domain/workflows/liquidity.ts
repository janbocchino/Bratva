// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { Market } from '../aggregates/market';
import { SCALE, type TokenAmount, type QuoteAmount, type LpTokens } from '../values/currencies';
import { E, Fn } from '@/lib/shared/imports';
import type { LiquidityPosition } from '../aggregates/liquidity';
import { LiquidityValidationError, LiquidityLockError, MarketClosedError } from '../errors';
import { BigInt as BigIntEffect, Option } from 'effect';
import { settledMulDiv, type SettledAmount } from '../values/settlement';

/** Notional pool value is `2 * reserveQuote` when quote/base are 50/50 in USD; threshold is $100 scaled. */
export const MIN_LIQUIDITY_AMOUNT = 100n * SCALE;
export const LOCK_DURATION_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

// ── Helpers ──────────────────────────────────────────────────────────

const poolValueQuote = (reserveQuote: bigint) => 2n * reserveQuote;
const meetsThreshold = (reserveQuote: bigint) =>
  poolValueQuote(reserveQuote) >= MIN_LIQUIDITY_AMOUNT;

// ── Validation (called from action layer) ────────────────────────────

export function validateLiquidityParams(p: {
  market: Market;
  amountBase: TokenAmount;
  amountQuote: QuoteAmount;
}): E.Effect<void, LiquidityValidationError> {
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

export const validateProvide = (p: {
  market: Market;
  amountBase: TokenAmount;
  amountQuote: QuoteAmount;
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

// ── Pure computation ─────────────────────────────────────────────────

export type CalcLpTokensResult = {
  lpTokens: SettledAmount<LpTokens>;
};

export function calcLpTokens(p: {
  amountBase: bigint;
  amountQuote: bigint;
  reserveBase: bigint;
  reserveQuote: bigint;
  totalLpSupply: bigint;
}): CalcLpTokensResult {
  const isEmptyPool = p.reserveBase === 0n && p.reserveQuote === 0n;

  if (isEmptyPool) {
    const sqrtResult = Fn.pipe(
      BigIntEffect.sqrt(p.amountBase * p.amountQuote),
      Option.getOrElse(() => 0n),
    );
    return {
      lpTokens: { amount: sqrtResult as LpTokens, dust: 0n },
    };
  }

  const fromBase = settledMulDiv(p.amountBase, p.totalLpSupply, p.reserveBase);
  const fromQuote = settledMulDiv(p.amountQuote, p.totalLpSupply, p.reserveQuote);

  const binding = fromBase.amount <= fromQuote.amount ? fromBase : fromQuote;

  return {
    lpTokens: { amount: binding.amount as LpTokens, dust: binding.dust },
  };
}

export type ProvideLiquidityInput = {
  market: Market;
  amountBase: TokenAmount;
  amountQuote: QuoteAmount;
  currentTimestamp: Date;
};

export type ProvideLiquidityResult = {
  lpTokensMinted: LpTokens;
  lpDust: bigint;
  newReserveBase: bigint;
  newReserveQuote: bigint;
  newTotalLpTokens: LpTokens;
  lockedUntil: Date | null;
  shouldActivateMarket: boolean;
};

export const provideLiquidity = (input: ProvideLiquidityInput): ProvideLiquidityResult =>
  Fn.pipe(
    {
      base: BigInt(input.amountBase),
      quote: BigInt(input.amountQuote),
      rBase: BigInt(input.market.ammPool.reserveBase),
      rQuote: BigInt(input.market.ammPool.reserveQuote),
    },
    (ctx) => {
      const lpResult = calcLpTokens({
        amountBase: ctx.base,
        amountQuote: ctx.quote,
        reserveBase: ctx.rBase,
        reserveQuote: ctx.rQuote,
        totalLpSupply: BigInt(input.market.totalLpTokens),
      });

      const newReserveBase = ctx.rBase + ctx.base;
      const newReserveQuote = ctx.rQuote + ctx.quote;

      return {
        lpTokensMinted: lpResult.lpTokens.amount,
        lpDust: lpResult.lpTokens.dust,
        newReserveBase,
        newReserveQuote,
        newTotalLpTokens: (BigInt(input.market.totalLpTokens) +
          BigInt(lpResult.lpTokens.amount)) as LpTokens,
        lockedUntil:
          input.market.status === 'active'
            ? new Date(input.currentTimestamp.getTime() + LOCK_DURATION_MS)
            : null,
        shouldActivateMarket:
          (input.market.status === 'closed' || input.market.status === 'pending') &&
          meetsThreshold(newReserveQuote),
      };
    },
  );

// ── Withdraw liquidity ───────────────────────────────────────────────

export type WithdrawLiquidityInput = {
  market: Market;
  position: LiquidityPosition;
  currentTimestamp: Date;
};

export type WithdrawLiquidityResult = {
  shareBase: SettledAmount;
  shareQuote: SettledAmount;
  newReserveBase: bigint;
  newReserveQuote: bigint;
  newTotalLpTokens: LpTokens;
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
  if (BigInt(input.market.totalLpTokens) === 0n)
    return E.fail(new LiquidityValidationError({ cause: 'No LP tokens in pool' }));
  return E.void;
}

export const withdrawLiquidity = (input: WithdrawLiquidityInput): WithdrawLiquidityResult =>
  Fn.pipe(
    {
      rBase: BigInt(input.market.ammPool.reserveBase),
      rQuote: BigInt(input.market.ammPool.reserveQuote),
      totalLp: BigInt(input.market.totalLpTokens),
      posLp: BigInt(input.position.lpTokens),
    },
    (ctx) => {
      const shareBase = settledMulDiv(ctx.posLp, ctx.rBase, ctx.totalLp);
      const shareQuote = settledMulDiv(ctx.posLp, ctx.rQuote, ctx.totalLp);

      return {
        shareBase,
        shareQuote,
        newReserveBase: ctx.rBase - shareBase.amount,
        newReserveQuote: ctx.rQuote - shareQuote.amount,
        newTotalLpTokens: (ctx.totalLp - ctx.posLp) as LpTokens,
        shouldDeactivateMarket:
          input.market.status === 'active' && !meetsThreshold(ctx.rQuote - shareQuote.amount),
      };
    },
  );

export const executeWithdraw = (input: WithdrawLiquidityInput) =>
  Fn.pipe(
    validateWithdrawLiquidity(input),
    E.map(() => withdrawLiquidity(input)),
  );
// end of LLM written Code
