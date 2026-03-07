// beginning of LLM written Code, Model: Claude
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
  status: 'closed',
  wasPreviouslyActive: false,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('market workflow transitions', () => {
  // ── Closed → Pending / Active ─────────────────────────────────────

  it('moves closed market to pending on LP add below threshold', () => {
    const market = mkMarket({ status: 'closed' });
    const transitioned = E.runSync(
      transitionMarket(market, {
        _tag: 'LiquidityProvided',
        occurredAt: now,
        result: {
          lpTokensMinted: 5n,
          newReserveBase: 5n,
          newReserveQuote: 2_000n,
          newTotalLpTokens: 5n,
          lockedUntil: null,
          shouldActivateMarket: false,
        },
      }),
    );

    expect(transitioned.status).toBe('pending');
  });

  it('moves closed market directly to active on LP add meeting threshold', () => {
    const market = mkMarket({ status: 'closed' });
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
  });

  // ── Pending → Active ──────────────────────────────────────────────

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

  // ── Active → Pending ──────────────────────────────────────────────

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

  // ── Pool empty → Closed (one step) ────────────────────────────────

  it('closes market directly when pool becomes empty', () => {
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

    expect(transitioned.status).toBe('closed');
    expect(transitioned.modelPrice).toBe(Cent.new(2_500n));
  });

  it('closes pending market when pool becomes empty', () => {
    const market = mkMarket({
      status: 'pending',
      ammPool: { reserveBase: Units(5n), reserveQuote: Cent.new(2_000n) },
      totalLpTokens: 10n,
    });

    const transitioned = E.runSync(
      transitionMarket(market, {
        _tag: 'LiquidityWithdrawn',
        occurredAt: now,
        result: {
          shareBase: 5n,
          shareQuote: 2_000n,
          newReserveBase: 0n,
          newReserveQuote: 0n,
          newTotalLpTokens: 0n,
          shouldDeactivateMarket: false,
        },
      }),
    );

    expect(transitioned.status).toBe('closed');
  });

  // ── Rejected transitions ──────────────────────────────────────────

  it('rejects withdraw from closed market', () => {
    const market = mkMarket({ status: 'closed' });

    const error = E.runSync(
      E.flip(
        transitionMarket(market, {
          _tag: 'LiquidityWithdrawn',
          occurredAt: now,
          result: {
            shareBase: 5n,
            shareQuote: 5_000n,
            newReserveBase: 0n,
            newReserveQuote: 0n,
            newTotalLpTokens: 0n,
            shouldDeactivateMarket: false,
          },
        }),
      ),
    );

    expect(error._tag).toBe('IllegalMarketTransitionError');
  });
});
// end of LLM written Code
