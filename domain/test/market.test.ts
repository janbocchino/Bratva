// beginning of LLM written Code, Model: gpt-5.3-codex
/// <reference types="jest" />
import { E } from '@/lib/shared/imports';
import type { Market } from '../aggregates/market';
import { transitionMarket } from '../workflows/market';
import { Cent, Units } from '../values/currencies';
import { MarketId, MarketPublicId, MarketSequenceNumber } from '../values/market';
import type { AssetId } from '../values/asset';

const now = new Date('2026-03-03T12:00:00Z');

const mkMarket = (overrides: Partial<Market> = {}): Market => ({
  id: MarketId(1),
  publicId: MarketPublicId('market-1'),
  baseAssetId: 1 as AssetId,
  quoteAssetId: 2 as AssetId,
  sequenceNumber: MarketSequenceNumber(0),
  ammPool: {
    reserveBase: Units(0n),
    reserveQuote: Cent.new(0n),
  },
  modelPrice: Cent.new(1_000n),
  totalLpTokens: 0n,
  status: 'pending',
  wasPreviouslyActive: false,
  resolvedAt: null,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('market workflow transitions', () => {
  it('activates pending market when liquidity event says shouldActivateMarket', () => {
    const market = mkMarket({ status: 'pending' });
    const transitioned = E.runSync(
      transitionMarket(market, {
        _tag: 'LiquidityProvided',
        occurredAt: now,
        result: {
          lpTokensMinted: 10n,
          newReserveBase: 50n,
          newReserveQuote: 50_000n,
          newTotalLpTokens: 10n,
          lockedUntil: null,
          shouldActivateMarket: true,
        },
      }),
    );

    expect(transitioned.status).toBe('active');
    expect(transitioned.wasPreviouslyActive).toBe(true);
    expect(transitioned.totalLpTokens).toBe(10n);
  });

  it('deactivates active market to pending on low-liquidity withdraw', () => {
    const market = mkMarket({
      status: 'active',
      wasPreviouslyActive: true,
      ammPool: { reserveBase: Units(100n), reserveQuote: Cent.new(100_000n) },
      totalLpTokens: 100n,
    });

    const transitioned = E.runSync(
      transitionMarket(market, {
        _tag: 'LiquidityWithdrawn',
        occurredAt: now,
        result: {
          shareBase: 99n,
          shareQuote: 99_000n,
          newReserveBase: 1n,
          newReserveQuote: 1_000n,
          newTotalLpTokens: 1n,
          shouldDeactivateMarket: true,
        },
      }),
    );

    expect(transitioned.status).toBe('pending');
  });

  it('resolves market and resets to model price when pool becomes empty', () => {
    const market = mkMarket({
      status: 'active',
      wasPreviouslyActive: true,
      modelPrice: Cent.new(2_500n),
      ammPool: { reserveBase: Units(50n), reserveQuote: Cent.new(125_000n) },
      totalLpTokens: 100n,
    });

    const transitioned = E.runSync(
      transitionMarket(market, {
        _tag: 'LiquidityWithdrawn',
        occurredAt: now,
        result: {
          shareBase: 50n,
          shareQuote: 125_000n,
          newReserveBase: 0n,
          newReserveQuote: 0n,
          newTotalLpTokens: 0n,
          shouldDeactivateMarket: true,
        },
      }),
    );

    expect(transitioned.status).toBe('resolved');
    expect(transitioned.modelPrice).toBe(Cent.new(2_500n));
    expect(transitioned.resolvedAt?.toISOString()).toBe(now.toISOString());
  });

  it('closes resolved market', () => {
    const market = mkMarket({
      status: 'resolved',
      resolvedAt: now,
      wasPreviouslyActive: true,
    });

    const transitioned = E.runSync(
      transitionMarket(market, {
        _tag: 'Close',
        occurredAt: now,
      }),
    );

    expect(transitioned.status).toBe('closed');
  });

  it('rejects close transition from active market', () => {
    const market = mkMarket({
      status: 'active',
      wasPreviouslyActive: true,
    });

    const error = E.runSync(
      E.flip(
        transitionMarket(market, {
          _tag: 'Close',
          occurredAt: now,
        }),
      ),
    );

    expect(error._tag).toBe('IllegalMarketTransitionError');
  });
});
// end of LLM written Code
