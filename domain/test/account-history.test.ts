/// <reference types="jest" />
// beginning of LLM written Code, Model: gpt-5.3-codex
import { composeAccountHistory, normalizeTimestamp } from '../workflows/account-history';
import { AssetId } from '../values/asset';
import { Cent, Units } from '../values/currencies';
import { MarketId, MarketPublicId, MarketSequenceNumber } from '../values/market';
import { TransactionId, OrderId } from '../values/exchange';
import { UserId } from '../values/user';

describe('normalizeTimestamp', () => {
  it('parses numeric timestamp strings as epoch milliseconds', () => {
    const parsed = normalizeTimestamp('1710806400000');
    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toBe('2024-03-19T00:00:00.000Z');
  });

  it('returns null for invalid values', () => {
    expect(normalizeTimestamp('not-a-date')).toBeNull();
  });

  it('parses bigint epoch timestamps', () => {
    const parsed = normalizeTimestamp(1710806400000n);
    expect(parsed).not.toBeNull();
    expect(parsed?.toISOString()).toBe('2024-03-19T00:00:00.000Z');
  });

  it('parses sqlite datetime strings', () => {
    const parsed = normalizeTimestamp('2026-03-24 09:05:01');
    expect(parsed).not.toBeNull();
    expect(Number.isNaN(parsed!.getTime())).toBe(false);
  });
});

describe('composeAccountHistory', () => {
  const userId = UserId(1);
  const baseAssetId = AssetId(101);
  const quoteAssetId = AssetId(102);
  const usdAssetId = AssetId(1);
  const marketId = MarketId(10);
  const occurredAt = new Date('2026-03-24T10:00:00.000Z');

  const market = {
    id: marketId,
    publicId: MarketPublicId('market-10'),
    baseAssetId,
    quoteAssetId,
    sequenceNumber: MarketSequenceNumber(1),
    ammPool: {
      reserveBase: Units(1000n),
      reserveQuote: Cent.new(100000n),
    },
    modelPrice: Cent.new(100n),
    totalLpTokens: 10n,
    status: 'active' as const,
    wasPreviouslyActive: true,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };

  it('maps trade rows to semantic trade history and de-duplicates matching ledger rows', () => {
    const result = composeAccountHistory({
      userId,
      ledger: [
        {
          assetId: quoteAssetId,
          drCr: 'dr',
          amount: Cent.new(300n),
          units: 'cent',
          createdAt: occurredAt,
        },
      ],
      trades: [
        {
          id: TransactionId(77),
          marketId,
          makerOrderId: OrderId(5),
          takerOrderId: OrderId(6),
          makerUserId: UserId(2),
          takerUserId: userId,
          price: Cent.new(100n),
          quantity: 3,
          side: 'bid',
          source: 'book',
          createdAt: occurredAt,
        },
      ],
      liquidityPositions: [],
      markets: [market],
      usdAssetId,
    });

    expect(result.entries.some((entry) => entry.category === 'trade')).toBe(true);
    expect(result.entries.some((entry) => entry.category === 'balanceEdit')).toBe(false);
  });

  it('maps liquidity rows with spent/provided amounts and de-duplicates corresponding ledger debit', () => {
    const result = composeAccountHistory({
      userId,
      ledger: [
        {
          assetId: usdAssetId,
          drCr: 'dr',
          amount: Cent.new(1000n),
          units: 'cent',
          createdAt: occurredAt,
        },
      ],
      trades: [],
      liquidityPositions: [
        {
          id: 33,
          publicId: 'lp-33',
          marketId,
          userId,
          lpTokens: 10n,
          depositBase: Units(5n),
          depositQuote: Cent.new(500n),
          lockedUntil: null,
          status: 'active',
          createdAt: occurredAt,
          updatedAt: occurredAt,
        },
      ],
      markets: [market],
      usdAssetId,
    });

    const liquidityEntry = result.entries.find((entry) => entry.category === 'liquidityProvided');
    expect(liquidityEntry).toBeDefined();
    if (!liquidityEntry || liquidityEntry.category !== 'liquidityProvided') return;

    expect(liquidityEntry.spentQuote.toString()).toBe('1000');
    expect(liquidityEntry.providedBase.toString()).toBe('5');
    expect(liquidityEntry.providedQuote.toString()).toBe('500');
    expect(result.entries.some((entry) => entry.category === 'balanceEdit')).toBe(false);
  });

  it('keeps invalid ledger timestamps as balance edits with unavailable timestamp', () => {
    const result = composeAccountHistory({
      userId,
      ledger: [
        {
          assetId: quoteAssetId,
          drCr: 'cr',
          amount: Cent.new(10n),
          units: 'cent',
          createdAt: 'bad-date' as unknown as Date,
        },
      ],
      trades: [],
      liquidityPositions: [],
      markets: [market],
      usdAssetId,
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].category).toBe('balanceEdit');
    expect(result.entries[0].hasAccurateTimestamp).toBe(false);
  });
});
// end of LLM written Code
