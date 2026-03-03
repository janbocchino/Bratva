import { E } from '@/lib/shared/imports';
import type { Market } from '../aggregates/market';
import {
  IllegalMarketTransitionError,
  MarketAlreadyClosedError,
  ModelPriceNotSetError,
} from '../errors';
import type { ProvideLiquidityResult, WithdrawLiquidityResult } from './liquidity';
import type { Cent } from '../values/currencies';

// beginning of LLM written Code, Model: gpt-5.3-codex
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
    }
  | {
      _tag: 'ResolveWithModelPrice';
      modelPrice: Cent;
      occurredAt: Date;
    }
  | {
      _tag: 'Close';
      occurredAt: Date;
    };

export type MarketTransitionError =
  | IllegalMarketTransitionError
  | MarketAlreadyClosedError
  | ModelPriceNotSetError;

const withUpdatedAt = (market: Market, updatedAt: Date): Market => ({
  ...market,
  updatedAt,
});

export const isPoolEmpty = (market: Pick<Market, 'ammPool' | 'totalLpTokens'>): boolean =>
  market.totalLpTokens === 0n ||
  (BigInt(market.ammPool.reserveBase) === 0n && BigInt(market.ammPool.reserveQuote) === 0n);

const canTransition = (market: Market, event: MarketEvent): boolean => {
  if (market.status === 'closed') return event._tag === 'Close';
  if (event._tag === 'Close') return market.status === 'resolved';
  return true;
};

export const resetToModelPrice = (market: Market, modelPrice: Cent): Market => ({
  ...market,
  modelPrice,
});

export const resolveMarket = (market: Market, modelPrice: Cent, occurredAt: Date): Market => ({
  ...market,
  status: 'resolved',
  modelPrice,
  resolvedAt: occurredAt,
  updatedAt: occurredAt,
});

export const closeMarket = (market: Market, occurredAt: Date): Market => ({
  ...market,
  status: 'closed',
  updatedAt: occurredAt,
});

const applyProvideResult = (market: Market, event: Extract<MarketEvent, { _tag: 'LiquidityProvided' }>) => {
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

  if (market.status === 'pending' && event.result.shouldActivateMarket) {
    return {
      ...nextMarket,
      status: 'active' as const,
      wasPreviouslyActive: true,
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
    return resolveMarket(resetToModelPrice(nextMarket, nextMarket.modelPrice), nextMarket.modelPrice, event.occurredAt);
  }

  if (market.status === 'active' && event.result.shouldDeactivateMarket) {
    return {
      ...nextMarket,
      status: 'pending',
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

  if (market.status === 'closed' && event._tag !== 'Close') {
    return E.fail(new MarketAlreadyClosedError({ marketId: market.id }));
  }

  switch (event._tag) {
    case 'LiquidityProvided':
      return E.succeed(applyProvideResult(market, event));

    case 'LiquidityWithdrawn':
      return E.succeed(applyWithdrawResult(market, event));

    case 'ResolveWithModelPrice':
      if (event.modelPrice <= 0n) {
        return E.fail(new ModelPriceNotSetError({ marketId: market.id }));
      }
      return E.succeed(resolveMarket(market, event.modelPrice, event.occurredAt));

    case 'Close':
      if (market.status === 'closed') return E.succeed(withUpdatedAt(market, event.occurredAt));
      if (market.status !== 'resolved') {
        return E.fail(
          new IllegalMarketTransitionError({
            status: market.status,
            event: event._tag,
          }),
        );
      }
      return E.succeed(closeMarket(market, event.occurredAt));
  }
}
// end of LLM written Code