/// <reference types="jest" />
import { E } from '@/lib/shared/imports';
import {
  provideLiquidity,
  validateLiquidityParams,
  validateDepositRatio,
  calcLpTokens,
  MIN_LIQUIDITY,
  LOCK_DURATION_MS,
} from '../workflows/liquidity';
import type { Market } from '../aggregates/exchange';
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

  it('lockedUntil is now + 30d for active market', () => {
    const result = provideLiquidity({
      market: mkMarket({
        status: 'active',
        ammPool: { reserveBase: Units(10n), reserveQuote: Cent.new(10000n) },
        totalLpTokens: 316n,
      }),
      amountBase: Units(5n),
      amountQuote: Cent.new(5000n),
      currentTimestamp: now,
    });

    expect(result.lockedUntil!.getTime()).toBe(now.getTime() + LOCK_DURATION_MS);
  });

  it('shouldActivateMarket when deposit crosses MIN_LIQUIDITY', () => {
    const result = provideLiquidity({
      market: mkMarket({ status: 'pending' }),
      amountBase: Units(MIN_LIQUIDITY),
      amountQuote: Cent.new(MIN_LIQUIDITY * 1000n),
      currentTimestamp: now,
    });

    expect(result.shouldActivateMarket).toBe(true);
  });

  it('does not activate if below threshold', () => {
    const result = provideLiquidity({
      market: mkMarket({ status: 'pending' }),
      amountBase: Units(MIN_LIQUIDITY - 1n),
      amountQuote: Cent.new((MIN_LIQUIDITY - 1n) * 1000n),
      currentTimestamp: now,
    });

    expect(result.shouldActivateMarket).toBe(false);
  });

  it('does not activate an already-active market', () => {
    const result = provideLiquidity({
      market: mkMarket({
        status: 'active',
        ammPool: {
          reserveBase: Units(MIN_LIQUIDITY),
          reserveQuote: Cent.new(MIN_LIQUIDITY * 1000n),
        },
        totalLpTokens: 316n,
      }),
      amountBase: Units(50n),
      amountQuote: Cent.new(50000n),
      currentTimestamp: now,
    });

    expect(result.shouldActivateMarket).toBe(false);
  });
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
