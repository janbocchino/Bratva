// beginning of LLM written Code, Model: gpt-5.3-codex
/// <reference types="jest" />
import type { Market } from '../aggregates/market';
import { selectMarketDisplayPrice } from '../workflows/price';
import { Cent, Units } from '../values/currencies';
import { MarketId, MarketPublicId, MarketSequenceNumber } from '../values/market';
import type { AssetId } from '../values/asset';

const now = new Date('2026-03-15T12:00:00Z');

const mkMarket = (overrides: Partial<Market> = {}): Market => ({
  id: MarketId(1),
  publicId: MarketPublicId('market-1'),
  baseAssetId: 1 as AssetId,
  quoteAssetId: 2 as AssetId,
  sequenceNumber: MarketSequenceNumber(0),
  ammPool: {
    reserveBase: Units(50n),
    reserveQuote: Cent.new(100_000n),
  },
  modelPrice: Cent.new(1_750n),
  totalLpTokens: 1_000n,
  status: 'active',
  wasPreviouslyActive: true,
  createdAt: now,
  updatedAt: now,
  ...overrides,
});

describe('selectMarketDisplayPrice', () => {
  it('uses model price when market is closed', () => {
    const market = mkMarket({
      status: 'closed',
      modelPrice: Cent.new(2_345n),
      ammPool: { reserveBase: Units(200n), reserveQuote: Cent.new(50_000n) },
    });

    expect(selectMarketDisplayPrice(market)).toBe(Cent.new(2_345n));
  });

  it('uses AMM price when market is pending', () => {
    const market = mkMarket({
      status: 'pending',
      ammPool: { reserveBase: Units(40n), reserveQuote: Cent.new(10_000n) },
    });

    expect(selectMarketDisplayPrice(market)).toBe(Cent.new(250n));
  });

  it('falls back to model price when AMM reserves are invalid', () => {
    const market = mkMarket({
      status: 'active',
      modelPrice: Cent.new(999n),
      ammPool: { reserveBase: Units(0n), reserveQuote: Cent.new(10_000n) },
    });

    expect(selectMarketDisplayPrice(market)).toBe(Cent.new(999n));
  });
});
// end of LLM written Code
