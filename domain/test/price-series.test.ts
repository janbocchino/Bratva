// beginning of LLM written Code, Model: gpt-5.3-codex
/// <reference types="jest" />
import type { Market } from '../aggregates/market';
import type { CreateTransactionParams } from '../ports/exchange';
import { mapTransactionsToUsdPriceSeriesPoints } from '../workflows/price-series';
import { AssetId } from '../values/asset';
import { Cent, Units } from '../values/currencies';
import { MarketId, MarketPublicId, MarketSequenceNumber } from '../values/market';

const usdAssetId = AssetId(1);
const baseAssetId = AssetId(2);
const nonUsdAssetId = AssetId(3);

const mkMarket = (quoteAssetId = usdAssetId): Market => ({
  id: MarketId(11),
  publicId: MarketPublicId('market-11'),
  baseAssetId,
  quoteAssetId,
  sequenceNumber: MarketSequenceNumber(0),
  ammPool: {
    reserveBase: Units(100n),
    reserveQuote: Cent.new(10_000n),
  },
  modelPrice: Cent.new(1_000n),
  totalLpTokens: 0n,
  status: 'active',
  wasPreviouslyActive: true,
  createdAt: new Date('2026-03-20T00:00:00.000Z'),
  updatedAt: new Date('2026-03-20T00:00:00.000Z'),
});

const mkTransactions = (): readonly CreateTransactionParams[] => [
  {
    marketId: MarketId(11),
    makerOrderId: 101,
    takerOrderId: 201,
    makerUserId: 301,
    takerUserId: 401,
    price: Cent.new(1_234n),
    quantity: 4,
    side: 'bid',
    source: 'book',
  },
  {
    marketId: MarketId(11),
    makerOrderId: null,
    takerOrderId: 202,
    makerUserId: null,
    takerUserId: 402,
    price: Cent.new(1_250n),
    quantity: 2,
    side: 'ask',
    source: 'amm',
  },
];

describe('mapTransactionsToUsdPriceSeriesPoints', () => {
  it('emits one point per fill for USD-quoted markets', () => {
    const executedAt = new Date('2026-03-21T11:30:00.000Z');
    const result = mapTransactionsToUsdPriceSeriesPoints({
      market: mkMarket(usdAssetId),
      usdAssetId,
      transactions: mkTransactions(),
      executedAt,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      assetId: baseAssetId,
      price: Cent.new(1_234n),
      createdAt: new Date('2026-03-21T11:30:00.000Z'),
    });
    expect(result[1]).toEqual({
      assetId: baseAssetId,
      price: Cent.new(1_250n),
      createdAt: new Date('2026-03-21T11:30:00.001Z'),
    });
  });

  it('returns empty for non-USD quoted markets in V1', () => {
    const result = mapTransactionsToUsdPriceSeriesPoints({
      market: mkMarket(nonUsdAssetId),
      usdAssetId,
      transactions: mkTransactions(),
      executedAt: new Date('2026-03-21T11:30:00.000Z'),
    });

    expect(result).toEqual([]);
  });

  it('returns empty when no fills are executed', () => {
    const result = mapTransactionsToUsdPriceSeriesPoints({
      market: mkMarket(usdAssetId),
      usdAssetId,
      transactions: [],
      executedAt: new Date('2026-03-21T11:30:00.000Z'),
    });

    expect(result).toEqual([]);
  });
});
// end of LLM written Code
