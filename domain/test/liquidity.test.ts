/// <reference types="jest" />
import { E } from '@/lib/shared/imports';
import {
  provideLiquidity,
  validateLiquidityParams,
  validateDepositRatio,
  calcLpTokens,
  // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
  MIN_LIQUIDITY_CENTS,
  // end of LLM written Code
  LOCK_DURATION_MS,
  // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
  withdrawLiquidity,
  validateWithdrawLiquidity,
  // end of LLM written Code
} from '../workflows/liquidity';
import type { Market } from '../aggregates/exchange';
// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
import type { LiquidityPosition } from '../aggregates/liquidity';
// end of LLM written Code
import { Cent, Units } from '../values/currencies';
import { MarketId, MarketPublicId, MarketSequenceNumber } from '../values/exchange';
import type { AssetId } from '../values/asset';

const now = new Date('2026-01-15T12:00:00Z');

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
  modelPrice: Cent.new(1000n),
  totalLpTokens: 0n,
  status: 'pending',
  // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
  wasPreviouslyActive: false,
  // end of LLM written Code
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

/* ------------------------------------------------------------------ */
/*  provideLiquidity (pure)                                            */
/* ------------------------------------------------------------------ */
describe('provideLiquidity', () => {
  it('first deposit: LP tokens = sqrt(base * quote)', () => {
    const result = provideLiquidity({
      market: mkMarket(),
      amountBase: Units(5n),
      amountQuote: Cent.new(5000n),
      currentTimestamp: now,
    });

    expect(result.lpTokensMinted).toBe(158n);
    expect(result.newReserveBase).toBe(5n);
    expect(result.newReserveQuote).toBe(5000n);
    expect(result.newTotalLpTokens).toBe(158n);
  });

  it('subsequent deposit: LP tokens proportional via min formula', () => {
    const market = mkMarket({
      status: 'active',
      ammPool: { reserveBase: Units(10n), reserveQuote: Cent.new(10000n) },
      totalLpTokens: 316n,
    });

    const result = provideLiquidity({
      market,
      amountBase: Units(5n),
      amountQuote: Cent.new(5000n),
      currentTimestamp: now,
    });

    expect(result.lpTokensMinted).toBe(158n);
    expect(result.newReserveBase).toBe(15n);
    expect(result.newReserveQuote).toBe(15000n);
    expect(result.newTotalLpTokens).toBe(474n);
  });

  it('lockedUntil is null for pending market', () => {
    const result = provideLiquidity({
      market: mkMarket({ status: 'pending' }),
      amountBase: Units(5n),
      amountQuote: Cent.new(5000n),
      currentTimestamp: now,
    });

    expect(result.lockedUntil).toBeNull();
  });

  // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
  it('lockedUntil is now + 15d for active market', () => {
    const result = provideLiquidity({
      market: mkMarket({
        status: 'active',
        ammPool: { reserveBase: Units(10n), reserveQuote: Cent.new(10000n) },
        totalLpTokens: 316n,
        wasPreviouslyActive: true,
      }),
      amountBase: Units(5n),
      amountQuote: Cent.new(5000n),
      currentTimestamp: now,
    });

    expect(result.lockedUntil!.getTime()).toBe(now.getTime() + LOCK_DURATION_MS);
  });

  it('shouldActivateMarket when total pool value crosses $100 (MIN_LIQUIDITY_CENTS)', () => {
    const quoteNeeded = MIN_LIQUIDITY_CENTS / 2n; // $50 per side = $100 total
    const result = provideLiquidity({
      market: mkMarket({ status: 'pending' }),
      amountBase: Units(5n),
      amountQuote: Cent.new(quoteNeeded),
      currentTimestamp: now,
    });

    expect(result.shouldActivateMarket).toBe(true);
  });

  it('does not activate if below $100 threshold', () => {
    const quoteJustBelow = MIN_LIQUIDITY_CENTS / 2n - 1n;
    const result = provideLiquidity({
      market: mkMarket({ status: 'pending' }),
      amountBase: Units(4n),
      amountQuote: Cent.new(quoteJustBelow),
      currentTimestamp: now,
    });

    expect(result.shouldActivateMarket).toBe(false);
  });

  it('does not activate an already-active market', () => {
    const result = provideLiquidity({
      market: mkMarket({
        status: 'active',
        ammPool: {
          reserveBase: Units(10n),
          reserveQuote: Cent.new(MIN_LIQUIDITY_CENTS),
        },
        totalLpTokens: 316n,
        wasPreviouslyActive: true,
      }),
      amountBase: Units(50n),
      amountQuote: Cent.new(50000n),
      currentTimestamp: now,
    });

    expect(result.shouldActivateMarket).toBe(false);
  });
  // end of LLM written Code
});

/* ------------------------------------------------------------------ */
/*  Validation (Effect-based)                                          */
/* ------------------------------------------------------------------ */
describe('validateLiquidityParams', () => {
  it('rejects closed market', () => {
    const exit = E.runSyncExit(
      validateLiquidityParams({
        market: mkMarket({ status: 'closed' }),
        amountBase: Units(5n),
        amountQuote: Cent.new(5000n),
      }),
    );
    expect(exit._tag).toBe('Failure');
  });

  it('rejects zero base amount', () => {
    const exit = E.runSyncExit(
      validateLiquidityParams({
        market: mkMarket(),
        amountBase: Units(0n),
        amountQuote: Cent.new(5000n),
      }),
    );
    expect(exit._tag).toBe('Failure');
  });

  it('rejects zero quote amount', () => {
    const exit = E.runSyncExit(
      validateLiquidityParams({
        market: mkMarket(),
        amountBase: Units(5n),
        amountQuote: Cent.new(0n),
      }),
    );
    expect(exit._tag).toBe('Failure');
  });
});

describe('validateDepositRatio', () => {
  it('passes for empty pool', () => {
    const exit = E.runSyncExit(validateDepositRatio(5n, 2000n, 0n, 0n));
    expect(exit._tag).toBe('Success');
  });

  it('rejects bad ratio for non-empty pool', () => {
    const exit = E.runSyncExit(validateDepositRatio(5n, 2000n, 10n, 10000n));
    expect(exit._tag).toBe('Failure');
  });

  it('passes matching ratio', () => {
    const exit = E.runSyncExit(validateDepositRatio(5n, 5000n, 10n, 10000n));
    expect(exit._tag).toBe('Success');
  });
});

/* ------------------------------------------------------------------ */
/*  calcLpTokens (pure)                                                */
/* ------------------------------------------------------------------ */
describe('calcLpTokens', () => {
  it('first deposit: sqrt(base * quote)', () => {
    expect(
      calcLpTokens({
        amountBase: 5n,
        amountQuote: 5000n,
        reserveBase: 0n,
        reserveQuote: 0n,
        totalLpSupply: 0n,
      }),
    ).toBe(158n);
  });

  it('subsequent deposit: proportional', () => {
    expect(
      calcLpTokens({
        amountBase: 5n,
        amountQuote: 5000n,
        reserveBase: 10n,
        reserveQuote: 10000n,
        totalLpSupply: 316n,
      }),
    ).toBe(158n);
  });
});

// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking

/* ------------------------------------------------------------------ */
/*  withdrawLiquidity (pure)                                           */
/* ------------------------------------------------------------------ */

const mkPosition = (overrides: Partial<LiquidityPosition> = {}): LiquidityPosition => ({
  id: 1,
  publicId: 'pos-1',
  marketId: MarketId(1),
  userId: 1 as any,
  lpTokens: 158n,
  depositBase: Units(5n),
  depositQuote: Cent.new(5000n),
  lockedUntil: null,
  status: 'active',
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('withdrawLiquidity', () => {
  it('computes pro-rata share of reserves', () => {
    const market = mkMarket({
      status: 'active',
      ammPool: { reserveBase: Units(10n), reserveQuote: Cent.new(10000n) },
      totalLpTokens: 316n,
      wasPreviouslyActive: true,
    });
    const position = mkPosition({ lpTokens: 158n });

    const result = withdrawLiquidity({ market, position, currentTimestamp: now });

    expect(result.shareBase).toBe(5n);
    expect(result.shareQuote).toBe(5000n);
    expect(result.newReserveBase).toBe(5n);
    expect(result.newReserveQuote).toBe(5000n);
    expect(result.newTotalLpTokens).toBe(158n);
  });

  it('shouldDeactivateMarket when reserves drop below $100', () => {
    const market = mkMarket({
      status: 'active',
      ammPool: { reserveBase: Units(6n), reserveQuote: Cent.new(6000n) },
      totalLpTokens: 316n,
      wasPreviouslyActive: true,
    });
    const position = mkPosition({ lpTokens: 158n });

    const result = withdrawLiquidity({ market, position, currentTimestamp: now });

    expect(result.shouldDeactivateMarket).toBe(true);
  });

  it('does not deactivate when remaining reserves >= $100', () => {
    const market = mkMarket({
      status: 'active',
      ammPool: { reserveBase: Units(20n), reserveQuote: Cent.new(20000n) },
      totalLpTokens: 632n,
      wasPreviouslyActive: true,
    });
    const position = mkPosition({ lpTokens: 158n });

    const result = withdrawLiquidity({ market, position, currentTimestamp: now });

    expect(result.shouldDeactivateMarket).toBe(false);
  });
});

describe('validateWithdrawLiquidity', () => {
  it('rejects withdrawn position', () => {
    const market = mkMarket({ status: 'active', wasPreviouslyActive: true });
    const position = mkPosition({ status: 'withdrawn' });
    const exit = E.runSyncExit(
      validateWithdrawLiquidity({ market, position, currentTimestamp: now }),
    );
    expect(exit._tag).toBe('Failure');
  });

  it('rejects locked position', () => {
    const market = mkMarket({ status: 'active', wasPreviouslyActive: true });
    const futureDate = new Date(now.getTime() + 86400000);
    const position = mkPosition({ lockedUntil: futureDate });
    const exit = E.runSyncExit(
      validateWithdrawLiquidity({ market, position, currentTimestamp: now }),
    );
    expect(exit._tag).toBe('Failure');
  });

  it('allows unlocked active position', () => {
    const market = mkMarket({
      status: 'active',
      totalLpTokens: 316n,
      ammPool: { reserveBase: Units(10n), reserveQuote: Cent.new(10000n) },
      wasPreviouslyActive: true,
    });
    const pastDate = new Date(now.getTime() - 86400000);
    const position = mkPosition({ lockedUntil: pastDate });
    const exit = E.runSyncExit(
      validateWithdrawLiquidity({ market, position, currentTimestamp: now }),
    );
    expect(exit._tag).toBe('Success');
  });

  it('rejects closed market', () => {
    const market = mkMarket({ status: 'closed' });
    const position = mkPosition();
    const exit = E.runSyncExit(
      validateWithdrawLiquidity({ market, position, currentTimestamp: now }),
    );
    expect(exit._tag).toBe('Failure');
  });
});

/* ------------------------------------------------------------------ */
/*  validateOrderParams token-holder gating                            */
/* ------------------------------------------------------------------ */
import { validateOrderParams } from '../workflows/exchange';

describe('validateOrderParams – token-holder gating', () => {
  it('allows orders on active market without ledger', () => {
    const market = mkMarket({
      status: 'active',
      wasPreviouslyActive: true,
      ammPool: { reserveBase: Units(10n), reserveQuote: Cent.new(10000n) },
    });
    const exit = E.runSyncExit(
      validateOrderParams({ market, price: Cent.new(100n), quantity: 1, side: 'bid' }),
    );
    expect(exit._tag).toBe('Success');
  });

  it('rejects orders on fresh pending market', () => {
    const market = mkMarket({ status: 'pending', wasPreviouslyActive: false });
    const exit = E.runSyncExit(
      validateOrderParams({ market, price: Cent.new(100n), quantity: 1, side: 'bid' }),
    );
    expect(exit._tag).toBe('Failure');
  });

  it('allows token holders on degraded-pending market', () => {
    const market = mkMarket({ status: 'pending', wasPreviouslyActive: true });
    const exit = E.runSyncExit(
      validateOrderParams({
        market,
        price: Cent.new(100n),
        quantity: 1,
        side: 'bid',
        userLedgerSummary: [{ assetId: 1 as AssetId, balance: Units(5n), units: 'unit' }],
      }),
    );
    expect(exit._tag).toBe('Success');
  });

  it('rejects non-token-holders on degraded-pending market', () => {
    const market = mkMarket({ status: 'pending', wasPreviouslyActive: true });
    const exit = E.runSyncExit(
      validateOrderParams({
        market,
        price: Cent.new(100n),
        quantity: 1,
        side: 'bid',
        userLedgerSummary: [{ assetId: 2 as AssetId, balance: Cent.new(5000n), units: 'cent' }],
      }),
    );
    expect(exit._tag).toBe('Failure');
  });

  it('rejects token holders with zero balance on degraded-pending market', () => {
    const market = mkMarket({ status: 'pending', wasPreviouslyActive: true });
    const exit = E.runSyncExit(
      validateOrderParams({
        market,
        price: Cent.new(100n),
        quantity: 1,
        side: 'bid',
        userLedgerSummary: [{ assetId: 1 as AssetId, balance: Units(0n), units: 'unit' }],
      }),
    );
    expect(exit._tag).toBe('Failure');
  });
});
// end of LLM written Code
