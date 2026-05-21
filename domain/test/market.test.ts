// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/// <reference types="jest" />
import { E } from '@/lib/shared/imports';
import type { Market } from '../aggregates/market';
import { transitionMarket } from '../workflows/market';
import { TokenAmount, QuoteAmount, LpTokens, SCALE } from '../values/currencies';
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
    reserveBase: TokenAmount.new(0n),
    reserveQuote: QuoteAmount.new(0n),
  },
  modelPrice: QuoteAmount.new(1_000n * SCALE),
  totalLpTokens: LpTokens.new(0n),
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
          lpTokensMinted: LpTokens.new(5n * SCALE),
          lpDust: 0n,
          newReserveBase: 5n * SCALE,
          newReserveQuote: 2_000n * SCALE,
          newTotalLpTokens: LpTokens.new(5n * SCALE),
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
          lpTokensMinted: LpTokens.new(10n * SCALE),
          lpDust: 0n,
          newReserveBase: 50n * SCALE,
          newReserveQuote: 50_000n * SCALE,
          newTotalLpTokens: LpTokens.new(10n * SCALE),
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
          lpTokensMinted: LpTokens.new(10n * SCALE),
          lpDust: 0n,
          newReserveBase: 50n * SCALE,
          newReserveQuote: 50_000n * SCALE,
          newTotalLpTokens: LpTokens.new(10n * SCALE),
          lockedUntil: null,
          shouldActivateMarket: true,
        },
      }),
    );

    expect(transitioned.status).toBe('active');
    expect(transitioned.wasPreviouslyActive).toBe(true);
    expect(transitioned.totalLpTokens).toBe(LpTokens.new(10n * SCALE));
  });

  // ── Active → Pending ──────────────────────────────────────────────

  it('deactivates active market to pending on low-liquidity withdraw', () => {
    const market = mkMarket({
      status: 'active',
      wasPreviouslyActive: true,
      ammPool: {
        reserveBase: TokenAmount.new(100n * SCALE),
        reserveQuote: QuoteAmount.new(100_000n * SCALE),
      },
      totalLpTokens: LpTokens.new(100n * SCALE),
    });

    const transitioned = E.runSync(
      transitionMarket(market, {
        _tag: 'LiquidityWithdrawn',
        occurredAt: now,
        result: {
          shareBase: { amount: 99n * SCALE, dust: 0n },
          shareQuote: { amount: 99_000n * SCALE, dust: 0n },
          newReserveBase: 1n * SCALE,
          newReserveQuote: 1_000n * SCALE,
          newTotalLpTokens: LpTokens.new(1n * SCALE),
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
      modelPrice: QuoteAmount.new(2_500n * SCALE),
      ammPool: {
        reserveBase: TokenAmount.new(50n * SCALE),
        reserveQuote: QuoteAmount.new(125_000n * SCALE),
      },
      totalLpTokens: LpTokens.new(100n * SCALE),
    });

    const transitioned = E.runSync(
      transitionMarket(market, {
        _tag: 'LiquidityWithdrawn',
        occurredAt: now,
        result: {
          shareBase: { amount: 50n * SCALE, dust: 0n },
          shareQuote: { amount: 125_000n * SCALE, dust: 0n },
          newReserveBase: 0n,
          newReserveQuote: 0n,
          newTotalLpTokens: LpTokens.new(0n),
          shouldDeactivateMarket: true,
        },
      }),
    );

    expect(transitioned.status).toBe('closed');
    expect(transitioned.wasPreviouslyActive).toBe(false);
    expect(transitioned.modelPrice).toBe(QuoteAmount.new(2_500n * SCALE));
  });

  it('closes pending market when pool becomes empty', () => {
    const market = mkMarket({
      status: 'pending',
      ammPool: {
        reserveBase: TokenAmount.new(5n * SCALE),
        reserveQuote: QuoteAmount.new(2_000n * SCALE),
      },
      totalLpTokens: LpTokens.new(10n * SCALE),
    });

    const transitioned = E.runSync(
      transitionMarket(market, {
        _tag: 'LiquidityWithdrawn',
        occurredAt: now,
        result: {
          shareBase: { amount: 5n * SCALE, dust: 0n },
          shareQuote: { amount: 2_000n * SCALE, dust: 0n },
          newReserveBase: 0n,
          newReserveQuote: 0n,
          newTotalLpTokens: LpTokens.new(0n),
          shouldDeactivateMarket: false,
        },
      }),
    );

    expect(transitioned.status).toBe('closed');
    expect(transitioned.wasPreviouslyActive).toBe(false);
  });

  it('clears wasPreviouslyActive on close so closed→pending after a full cycle is pre-launch pending', () => {
    let m = mkMarket({ status: 'closed' });

    m = E.runSync(
      transitionMarket(m, {
        _tag: 'LiquidityProvided',
        occurredAt: now,
        result: {
          lpTokensMinted: LpTokens.new(10n * SCALE),
          lpDust: 0n,
          newReserveBase: 50n * SCALE,
          newReserveQuote: 50_000n * SCALE,
          newTotalLpTokens: LpTokens.new(10n * SCALE),
          lockedUntil: null,
          shouldActivateMarket: true,
        },
      }),
    );
    expect(m.status).toBe('active');
    expect(m.wasPreviouslyActive).toBe(true);

    m = E.runSync(
      transitionMarket(m, {
        _tag: 'LiquidityWithdrawn',
        occurredAt: now,
        result: {
          shareBase: { amount: 49n * SCALE, dust: 0n },
          shareQuote: { amount: 49_000n * SCALE, dust: 0n },
          newReserveBase: 1n * SCALE,
          newReserveQuote: 1_000n * SCALE,
          newTotalLpTokens: LpTokens.new(1n * SCALE),
          shouldDeactivateMarket: true,
        },
      }),
    );
    expect(m.status).toBe('pending');
    expect(m.wasPreviouslyActive).toBe(true);

    m = E.runSync(
      transitionMarket(m, {
        _tag: 'LiquidityWithdrawn',
        occurredAt: now,
        result: {
          shareBase: { amount: 1n * SCALE, dust: 0n },
          shareQuote: { amount: 1_000n * SCALE, dust: 0n },
          newReserveBase: 0n,
          newReserveQuote: 0n,
          newTotalLpTokens: LpTokens.new(0n),
          shouldDeactivateMarket: false,
        },
      }),
    );
    expect(m.status).toBe('closed');
    expect(m.wasPreviouslyActive).toBe(false);

    m = E.runSync(
      transitionMarket(m, {
        _tag: 'LiquidityProvided',
        occurredAt: now,
        result: {
          lpTokensMinted: LpTokens.new(5n * SCALE),
          lpDust: 0n,
          newReserveBase: 5n * SCALE,
          newReserveQuote: 2_000n * SCALE,
          newTotalLpTokens: LpTokens.new(5n * SCALE),
          lockedUntil: null,
          shouldActivateMarket: false,
        },
      }),
    );
    expect(m.status).toBe('pending');
    expect(m.wasPreviouslyActive).toBe(false);
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
            shareBase: { amount: 5n * SCALE, dust: 0n },
            shareQuote: { amount: 5_000n * SCALE, dust: 0n },
            newReserveBase: 0n,
            newReserveQuote: 0n,
            newTotalLpTokens: LpTokens.new(0n),
            shouldDeactivateMarket: false,
          },
        }),
      ),
    );

    expect(error._tag).toBe('IllegalMarketTransitionError');
  });
});
// end of LLM written Code
