// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/// <reference types="jest" />
import { composeAccountHistory, normalizeTimestamp } from '../workflows/account-history';
import { AssetId } from '../values/asset';
import { TokenAmount, QuoteAmount, LpTokens, SCALE } from '../values/currencies';
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
      reserveBase: TokenAmount.new(1000n * SCALE),
      reserveQuote: QuoteAmount.new(100000n * SCALE),
    },
    modelPrice: QuoteAmount.new(100n * SCALE),
    totalLpTokens: LpTokens.new(10n * SCALE),
    status: 'active' as const,
    wasPreviouslyActive: true,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };

  it('maps trade rows to semantic trade history and de-duplicates matching ledger rows', () => {
    const tradePrice = QuoteAmount.new(100n * SCALE);
    const tradeQty = TokenAmount.new(3n * SCALE);
    const deDupAmount = BigInt(tradePrice) * BigInt(tradeQty);

    const result = composeAccountHistory({
      userId,
      ledger: [
        {
          assetId: quoteAssetId,
          drCr: 'dr',
          amount: QuoteAmount.new(deDupAmount),
          units: 'scaled_unit',
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
          price: tradePrice,
          quantity: tradeQty,
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
    const depositQuote = QuoteAmount.new(500n * SCALE);
    const spentQuoteValue = BigInt(depositQuote) * 2n;

    const result = composeAccountHistory({
      userId,
      ledger: [
        {
          assetId: usdAssetId,
          drCr: 'dr',
          amount: QuoteAmount.new(spentQuoteValue),
          units: 'scaled_unit',
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
          lpTokens: LpTokens.new(10n * SCALE),
          depositBase: TokenAmount.new(5n * SCALE),
          depositQuote,
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

    expect(liquidityEntry.spentQuote.toString()).toBe(spentQuoteValue.toString());
    expect(liquidityEntry.providedBase.toString()).toBe((5n * SCALE).toString());
    expect(liquidityEntry.providedQuote.toString()).toBe((500n * SCALE).toString());
    expect(result.entries.some((entry) => entry.category === 'balanceEdit')).toBe(false);
  });

  it('keeps invalid ledger timestamps as balance edits with unavailable timestamp', () => {
    const result = composeAccountHistory({
      userId,
      ledger: [
        {
          assetId: quoteAssetId,
          drCr: 'cr',
          amount: QuoteAmount.new(10n * SCALE),
          units: 'scaled_unit',
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
