// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/// <reference types="jest" />
import { E } from '@/lib/shared/imports';
import {
  provideLiquidity,
  validateLiquidityParams,
  validateDepositRatio,
  calcLpTokens,
  MIN_LIQUIDITY_AMOUNT,
  LOCK_DURATION_MS,
  withdrawLiquidity,
  validateWithdrawLiquidity,
} from '../workflows/liquidity';
import type { Market } from '../aggregates/market';
import type { LiquidityPosition } from '../aggregates/liquidity';
import { TokenAmount, QuoteAmount, LpTokens, SCALE } from '../values/currencies';
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
    reserveBase: TokenAmount.new(0n),
    reserveQuote: QuoteAmount.new(0n),
  },
  modelPrice: QuoteAmount.new(1000n * SCALE),
  totalLpTokens: LpTokens.new(0n),
  status: 'closed',
  wasPreviouslyActive: false,
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
      amountBase: TokenAmount.new(5n * SCALE),
      amountQuote: QuoteAmount.new(5000n * SCALE),
      currentTimestamp: now,
    });

    expect(result.lpTokensMinted).toBe(LpTokens.new(158113883008418966599n));
    expect(result.newReserveBase).toBe(5n * SCALE);
    expect(result.newReserveQuote).toBe(5000n * SCALE);
    expect(result.newTotalLpTokens).toBe(LpTokens.new(158113883008418966599n));
  });

  it('subsequent deposit: LP tokens proportional via min formula', () => {
    const market = mkMarket({
      status: 'active',
      ammPool: { reserveBase: TokenAmount.new(10n * SCALE), reserveQuote: QuoteAmount.new(10000n * SCALE) },
      totalLpTokens: LpTokens.new(316n * SCALE),
    });

    const result = provideLiquidity({
      market,
      amountBase: TokenAmount.new(5n * SCALE),
      amountQuote: QuoteAmount.new(5000n * SCALE),
      currentTimestamp: now,
    });

    expect(result.lpTokensMinted).toBe(LpTokens.new(158n * SCALE));
    expect(result.newReserveBase).toBe(15n * SCALE);
    expect(result.newReserveQuote).toBe(15000n * SCALE);
    expect(result.newTotalLpTokens).toBe(LpTokens.new(474n * SCALE));
  });

  it('lockedUntil is null for pending market', () => {
    const result = provideLiquidity({
      market: mkMarket({ status: 'pending' }),
      amountBase: TokenAmount.new(5n * SCALE),
      amountQuote: QuoteAmount.new(5000n * SCALE),
      currentTimestamp: now,
    });

    expect(result.lockedUntil).toBeNull();
  });

  it('lockedUntil is now + 15d for active market', () => {
    const result = provideLiquidity({
      market: mkMarket({
        status: 'active',
        ammPool: { reserveBase: TokenAmount.new(10n * SCALE), reserveQuote: QuoteAmount.new(10000n * SCALE) },
        totalLpTokens: LpTokens.new(316n * SCALE),
        wasPreviouslyActive: true,
      }),
      amountBase: TokenAmount.new(5n * SCALE),
      amountQuote: QuoteAmount.new(5000n * SCALE),
      currentTimestamp: now,
    });

    expect(result.lockedUntil!.getTime()).toBe(now.getTime() + LOCK_DURATION_MS);
  });

  it('shouldActivateMarket when total pool value crosses $100 (MIN_LIQUIDITY_AMOUNT)', () => {
    const quoteNeeded = MIN_LIQUIDITY_AMOUNT / 2n;
    const result = provideLiquidity({
      market: mkMarket({ status: 'pending' }),
      amountBase: TokenAmount.new(5n * SCALE),
      amountQuote: QuoteAmount.new(quoteNeeded),
      currentTimestamp: now,
    });

    expect(result.shouldActivateMarket).toBe(true);
  });

  it('does not activate if below $100 threshold', () => {
    const quoteJustBelow = MIN_LIQUIDITY_AMOUNT / 2n - 1n;
    const result = provideLiquidity({
      market: mkMarket({ status: 'pending' }),
      amountBase: TokenAmount.new(4n * SCALE),
      amountQuote: QuoteAmount.new(quoteJustBelow),
      currentTimestamp: now,
    });

    expect(result.shouldActivateMarket).toBe(false);
  });

  it('does not activate an already-active market', () => {
    const result = provideLiquidity({
      market: mkMarket({
        status: 'active',
        ammPool: {
          reserveBase: TokenAmount.new(10n * SCALE),
          reserveQuote: QuoteAmount.new(MIN_LIQUIDITY_AMOUNT),
        },
        totalLpTokens: LpTokens.new(316n * SCALE),
        wasPreviouslyActive: true,
      }),
      amountBase: TokenAmount.new(50n * SCALE),
      amountQuote: QuoteAmount.new(50000n * SCALE),
      currentTimestamp: now,
    });

    expect(result.shouldActivateMarket).toBe(false);
  });

  it('shouldActivateMarket when total pool value crosses $100 from closed status', () => {
    const quoteNeeded = MIN_LIQUIDITY_AMOUNT / 2n;
    const result = provideLiquidity({
      market: mkMarket({ status: 'closed' }),
      amountBase: TokenAmount.new(5n * SCALE),
      amountQuote: QuoteAmount.new(quoteNeeded),
      currentTimestamp: now,
    });

    expect(result.shouldActivateMarket).toBe(true);
  });

  it('does not activate a closed market below threshold', () => {
    const quoteJustBelow = MIN_LIQUIDITY_AMOUNT / 2n - 1n;
    const result = provideLiquidity({
      market: mkMarket({ status: 'closed' }),
      amountBase: TokenAmount.new(4n * SCALE),
      amountQuote: QuoteAmount.new(quoteJustBelow),
      currentTimestamp: now,
    });

    expect(result.shouldActivateMarket).toBe(false);
  });
});

/* ------------------------------------------------------------------ */
/*  Validation (Effect-based)                                          */
/* ------------------------------------------------------------------ */
describe('validateLiquidityParams', () => {
  it('allows LP add on closed market (LP add is the entry point)', () => {
    const exit = E.runSyncExit(
      validateLiquidityParams({
        market: mkMarket({ status: 'closed' }),
        amountBase: TokenAmount.new(5n * SCALE),
        amountQuote: QuoteAmount.new(5000n * SCALE),
      }),
    );
    expect(exit._tag).toBe('Success');
  });

  it('rejects zero base amount', () => {
    const exit = E.runSyncExit(
      validateLiquidityParams({
        market: mkMarket(),
        amountBase: TokenAmount.new(0n),
        amountQuote: QuoteAmount.new(5000n * SCALE),
      }),
    );
    expect(exit._tag).toBe('Failure');
  });

  it('rejects zero quote amount', () => {
    const exit = E.runSyncExit(
      validateLiquidityParams({
        market: mkMarket(),
        amountBase: TokenAmount.new(5n * SCALE),
        amountQuote: QuoteAmount.new(0n),
      }),
    );
    expect(exit._tag).toBe('Failure');
  });
});

describe('validateDepositRatio', () => {
  it('passes for empty pool', () => {
    const exit = E.runSyncExit(validateDepositRatio(5n * SCALE, 2000n * SCALE, 0n, 0n));
    expect(exit._tag).toBe('Success');
  });

  it('rejects bad ratio for non-empty pool', () => {
    const exit = E.runSyncExit(validateDepositRatio(5n * SCALE, 2000n * SCALE, 10n * SCALE, 10000n * SCALE));
    expect(exit._tag).toBe('Failure');
  });

  it('passes matching ratio', () => {
    const exit = E.runSyncExit(validateDepositRatio(5n * SCALE, 5000n * SCALE, 10n * SCALE, 10000n * SCALE));
    expect(exit._tag).toBe('Success');
  });
});

/* ------------------------------------------------------------------ */
/*  calcLpTokens (pure)                                                */
/* ------------------------------------------------------------------ */
describe('calcLpTokens', () => {
  it('first deposit: sqrt(base * quote)', () => {
    const result = calcLpTokens({
      amountBase: 5n * SCALE,
      amountQuote: 5000n * SCALE,
      reserveBase: 0n,
      reserveQuote: 0n,
      totalLpSupply: 0n,
    });
    expect(result.lpTokens.amount).toBe(LpTokens.new(158113883008418966599n));
  });

  it('subsequent deposit: proportional', () => {
    const result = calcLpTokens({
      amountBase: 5n * SCALE,
      amountQuote: 5000n * SCALE,
      reserveBase: 10n * SCALE,
      reserveQuote: 10000n * SCALE,
      totalLpSupply: 316n * SCALE,
    });
    expect(result.lpTokens.amount).toBe(LpTokens.new(158n * SCALE));
  });
});

/* ------------------------------------------------------------------ */
/*  withdrawLiquidity (pure)                                           */
/* ------------------------------------------------------------------ */

const mkPosition = (overrides: Partial<LiquidityPosition> = {}): LiquidityPosition => ({
  id: 1,
  publicId: 'pos-1',
  marketId: MarketId(1),
  userId: 1 as any,
  lpTokens: LpTokens.new(158n * SCALE),
  depositBase: TokenAmount.new(5n * SCALE),
  depositQuote: QuoteAmount.new(5000n * SCALE),
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
      ammPool: { reserveBase: TokenAmount.new(10n * SCALE), reserveQuote: QuoteAmount.new(10000n * SCALE) },
      totalLpTokens: LpTokens.new(316n * SCALE),
      wasPreviouslyActive: true,
    });
    const position = mkPosition({ lpTokens: LpTokens.new(158n * SCALE) });

    const result = withdrawLiquidity({ market, position, currentTimestamp: now });

    expect(result.shareBase.amount).toBe(5n * SCALE);
    expect(result.shareQuote.amount).toBe(5000n * SCALE);
    expect(result.newReserveBase).toBe(5n * SCALE);
    expect(result.newReserveQuote).toBe(5000n * SCALE);
    expect(result.newTotalLpTokens).toBe(LpTokens.new(158n * SCALE));
  });

  it('shouldDeactivateMarket when reserves drop below $100', () => {
    // Pool ~$120 notional (2×60 quote); withdrawing 1/3 of LP removes 20 quote → 40 left → 2×40 < $100 threshold.
    const market = mkMarket({
      status: 'active',
      ammPool: { reserveBase: TokenAmount.new(10n * SCALE), reserveQuote: QuoteAmount.new(60n * SCALE) },
      totalLpTokens: LpTokens.new(300n * SCALE),
      wasPreviouslyActive: true,
    });
    const position = mkPosition({ lpTokens: LpTokens.new(100n * SCALE) });

    const result = withdrawLiquidity({ market, position, currentTimestamp: now });

    expect(result.shouldDeactivateMarket).toBe(true);
  });

  it('does not deactivate when remaining reserves >= $100', () => {
    const market = mkMarket({
      status: 'active',
      ammPool: { reserveBase: TokenAmount.new(20n * SCALE), reserveQuote: QuoteAmount.new(20000n * SCALE) },
      totalLpTokens: LpTokens.new(632n * SCALE),
      wasPreviouslyActive: true,
    });
    const position = mkPosition({ lpTokens: LpTokens.new(158n * SCALE) });

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
      totalLpTokens: LpTokens.new(316n * SCALE),
      ammPool: { reserveBase: TokenAmount.new(10n * SCALE), reserveQuote: QuoteAmount.new(10000n * SCALE) },
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
      ammPool: { reserveBase: TokenAmount.new(10n * SCALE), reserveQuote: QuoteAmount.new(10000n * SCALE) },
    });
    const exit = E.runSyncExit(
      validateOrderParams({ market, price: QuoteAmount.new(100n * SCALE), quantity: TokenAmount.new(1n * SCALE), side: 'bid' }),
    );
    expect(exit._tag).toBe('Success');
  });

  it('rejects orders on fresh pending market', () => {
    const market = mkMarket({ status: 'pending', wasPreviouslyActive: false });
    const exit = E.runSyncExit(
      validateOrderParams({ market, price: QuoteAmount.new(100n * SCALE), quantity: TokenAmount.new(1n * SCALE), side: 'bid' }),
    );
    expect(exit._tag).toBe('Failure');
  });

  it('allows token holders on degraded-pending market', () => {
    const market = mkMarket({ status: 'pending', wasPreviouslyActive: true });
    const exit = E.runSyncExit(
      validateOrderParams({
        market,
        price: QuoteAmount.new(100n * SCALE),
        quantity: TokenAmount.new(1n * SCALE),
        side: 'bid',
        userLedgerSummary: [{ assetId: 1 as AssetId, balance: TokenAmount.new(5n * SCALE), units: 'unit' }],
      }),
    );
    expect(exit._tag).toBe('Success');
  });

  it('rejects non-token-holders on degraded-pending market', () => {
    const market = mkMarket({ status: 'pending', wasPreviouslyActive: true });
    const exit = E.runSyncExit(
      validateOrderParams({
        market,
        price: QuoteAmount.new(100n * SCALE),
        quantity: TokenAmount.new(1n * SCALE),
        side: 'bid',
        userLedgerSummary: [{ assetId: 2 as AssetId, balance: QuoteAmount.new(5000n * SCALE), units: 'cent' }],
      }),
    );
    expect(exit._tag).toBe('Failure');
  });

  it('rejects token holders with zero balance on degraded-pending market', () => {
    const market = mkMarket({ status: 'pending', wasPreviouslyActive: true });
    const exit = E.runSyncExit(
      validateOrderParams({
        market,
        price: QuoteAmount.new(100n * SCALE),
        quantity: TokenAmount.new(1n * SCALE),
        side: 'bid',
        userLedgerSummary: [{ assetId: 1 as AssetId, balance: TokenAmount.new(0n), units: 'unit' }],
      }),
    );
    expect(exit._tag).toBe('Failure');
  });
});
// end of LLM written Code
