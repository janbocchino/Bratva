// beginning of LLM written Code, Model: Claude
import { E } from '@/lib/shared/imports';
import type { Market } from '../aggregates/market';
import { IllegalMarketTransitionError } from '../errors';
import type { ProvideLiquidityResult, WithdrawLiquidityResult } from './liquidity';

export type MarketEvent =
  | {
      _tag: 'LiquidityProvided';
      result: ProvideLiquidityResult;
      occurredAt: Date;
    }
  | {
      _tag: 'LiquidityWithdrawn';
      result: WithdrawLiquidityResult;
      occurredAt: Date;
    };

export type MarketTransitionError = IllegalMarketTransitionError;

const withUpdatedAt = (market: Market, updatedAt: Date): Market => ({
  ...market,
  updatedAt,
});

export const isPoolEmpty = (market: Pick<Market, 'ammPool' | 'totalLpTokens'>): boolean =>
  market.totalLpTokens === 0n ||
  (BigInt(market.ammPool.reserveBase) === 0n && BigInt(market.ammPool.reserveQuote) === 0n);

const canTransition = (market: Market, event: MarketEvent): boolean => {
  if (market.status === 'closed' && event._tag === 'LiquidityWithdrawn') return false;
  return true;
};

const applyProvideResult = (
  market: Market,
  event: Extract<MarketEvent, { _tag: 'LiquidityProvided' }>,
): Market => {
  const nextMarket = withUpdatedAt(
    {
      ...market,
      ammPool: {
        reserveBase: event.result.newReserveBase as typeof market.ammPool.reserveBase,
        reserveQuote: event.result.newReserveQuote as typeof market.ammPool.reserveQuote,
      },
      totalLpTokens: event.result.newTotalLpTokens,
    },
    event.occurredAt,
  );

  if (
    (market.status === 'closed' || market.status === 'pending') &&
    event.result.shouldActivateMarket
  ) {
    return {
      ...nextMarket,
      status: 'active' as const,
      wasPreviouslyActive: true,
    };
  }

  if (market.status === 'closed') {
    return {
      ...nextMarket,
      status: 'pending' as const,
    };
  }

  return nextMarket;
};

const applyWithdrawResult = (
  market: Market,
  event: Extract<MarketEvent, { _tag: 'LiquidityWithdrawn' }>,
): Market => {
  const nextMarket = withUpdatedAt(
    {
      ...market,
      ammPool: {
        reserveBase: event.result.newReserveBase as typeof market.ammPool.reserveBase,
        reserveQuote: event.result.newReserveQuote as typeof market.ammPool.reserveQuote,
      },
      totalLpTokens: event.result.newTotalLpTokens,
    },
    event.occurredAt,
  );

  if (isPoolEmpty(nextMarket)) {
    return {
      ...nextMarket,
      status: 'closed' as const,
    };
  }

  if (market.status === 'active' && event.result.shouldDeactivateMarket) {
    return {
      ...nextMarket,
      status: 'pending' as const,
    };
  }

  return nextMarket;
};

export function transitionMarket(
  market: Market,
  event: MarketEvent,
): E.Effect<Market, MarketTransitionError> {
  if (!canTransition(market, event)) {
    return E.fail(
      new IllegalMarketTransitionError({
        status: market.status,
        event: event._tag,
      }),
    );
  }

  switch (event._tag) {
    case 'LiquidityProvided':
      return E.succeed(applyProvideResult(market, event));

    case 'LiquidityWithdrawn':
      return E.succeed(applyWithdrawResult(market, event));
  }
}
// end of LLM written Code
