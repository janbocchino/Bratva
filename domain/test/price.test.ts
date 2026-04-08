// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/// <reference types="jest" />
import type { Market } from '../aggregates/market';
import { selectMarketDisplayPrice } from '../workflows/price';
import { TokenAmount, QuoteAmount, LpTokens, SCALE } from '../values/currencies';
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
    reserveBase: TokenAmount.new(50n * SCALE),
    reserveQuote: QuoteAmount.new(100_000n * SCALE),
  },
  modelPrice: QuoteAmount.new(1_750n * SCALE),
  totalLpTokens: LpTokens.new(1_000n * SCALE),
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
      modelPrice: QuoteAmount.new(2_345n * SCALE),
      ammPool: { reserveBase: TokenAmount.new(200n * SCALE), reserveQuote: QuoteAmount.new(50_000n * SCALE) },
    });

    expect(selectMarketDisplayPrice(market)).toBe(QuoteAmount.new(2_345n * SCALE));
  });

  it('uses AMM price when market is pending', () => {
    const market = mkMarket({
      status: 'pending',
      ammPool: { reserveBase: TokenAmount.new(40n * SCALE), reserveQuote: QuoteAmount.new(10_000n * SCALE) },
    });

    expect(selectMarketDisplayPrice(market)).toBe(QuoteAmount.new(250n * SCALE));
  });

  it('falls back to model price when AMM reserves are invalid', () => {
    const market = mkMarket({
      status: 'active',
      modelPrice: QuoteAmount.new(999n * SCALE),
      ammPool: { reserveBase: TokenAmount.new(0n), reserveQuote: QuoteAmount.new(10_000n * SCALE) },
    });

    expect(selectMarketDisplayPrice(market)).toBe(QuoteAmount.new(999n * SCALE));
  });
});
// end of LLM written Code
