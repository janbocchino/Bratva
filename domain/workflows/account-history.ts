// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/*
Decision questionnaire
- How should timestamps be normalized?
  - [x] Single normalization path in domain workflow.
  - [ ] Parse ad hoc in each caller.
- How should ledger duplicates be handled for composed events?
  - [x] Signature-based de-duplication against trade/liquidity events.
  - [ ] Render all ledger rows and accept duplicate user-visible actions.
*/
import type {
  AccountHistory,
  AccountHistoryEntry,
  LegacyHistoryEntry,
} from '@/domain/aggregates/account-history';
import type { UserLedger, LedgerUnits } from '@/domain/aggregates/ledger';
import type { LiquidityPosition } from '@/domain/aggregates/liquidity';
import type { Market } from '@/domain/aggregates/market';
import type { Transaction } from '@/domain/aggregates/exchange';
import type { AssetId } from '@/domain/values/asset';
import { QuoteAmount } from '@/domain/values/currencies';
import { normalizeTimestamp as sharedNormalizeTimestamp } from '@/domain/values/timestamp';
import type { UserId } from '@/domain/values/user';

const epochIso = new Date(0).toISOString();
export const normalizeTimestamp = sharedNormalizeTimestamp;

const historyTimestamp = (value: unknown): { occurredAtIso: string; hasAccurateTimestamp: boolean } => {
  const date = normalizeTimestamp(value);
  if (!date) return { occurredAtIso: epochIso, hasAccurateTimestamp: false };
  return { occurredAtIso: date.toISOString(), hasAccurateTimestamp: true };
};

const timestampBucket = (value: unknown): number | null => {
  const date = normalizeTimestamp(value);
  return date ? Math.floor(date.getTime() / 1000) : null;
};

type LedgerSignature = {
  drCr: 'dr' | 'cr';
  assetId: AssetId;
  units: LedgerUnits;
  amount: bigint;
  createdAt: unknown;
};

const ledgerSignatureKey = (signature: LedgerSignature): string | null => {
  const bucket = timestampBucket(signature.createdAt);
  if (bucket === null) return null;
  return `${signature.drCr}|${signature.assetId}|${signature.units}|${signature.amount.toString()}|${bucket}`;
};

export const composeAccountHistory = (input: {
  userId: UserId;
  ledger: UserLedger['transactions'];
  trades: Transaction[];
  liquidityPositions: LiquidityPosition[];
  markets: Market[];
  usdAssetId: AssetId | null;
}): AccountHistory => {
  const marketMap = new Map(input.markets.map((market) => [market.id, market] as const));
  const consumedLedgerSignatures = new Set<string>();
  const historyEntries: AccountHistoryEntry[] = [];

  for (const trade of input.trades) {
    const timestamp = historyTimestamp(trade.createdAt);
    const market = marketMap.get(trade.marketId);

    if (!market) {
      const legacyTradeEntry: LegacyHistoryEntry = {
        id: `trade-${trade.id}`,
        category: 'legacy',
        actionLabel: 'Legacy entry',
        reason: `Missing market metadata for trade ${trade.id.toString()}`,
        ...timestamp,
      };
      historyEntries.push(legacyTradeEntry);
      continue;
    }

    historyEntries.push({
      id: `trade-${trade.id}`,
      category: 'trade',
      actionLabel: 'Trade executed',
      marketPublicId: market.publicId,
      baseAssetId: market.baseAssetId,
      quoteAssetId: market.quoteAssetId,
      side: trade.side,
      source: trade.source,
      price: trade.price,
      quantity: trade.quantity,
      ...timestamp,
    });

    if (trade.takerUserId === input.userId) {
      const isBid = trade.side === 'bid';
      const key = ledgerSignatureKey({
        drCr: 'dr',
        assetId: isBid ? market.quoteAssetId : market.baseAssetId,
        units: 'scaled_unit',
        amount: isBid ? BigInt(trade.price) * BigInt(trade.quantity) : BigInt(trade.quantity),
        createdAt: trade.createdAt,
      });
      if (key) consumedLedgerSignatures.add(key);
    }

    if (trade.makerUserId === input.userId) {
      const makerReceivesQuote = trade.side === 'bid';
      const key = ledgerSignatureKey({
        drCr: 'cr',
        assetId: makerReceivesQuote ? market.quoteAssetId : market.baseAssetId,
        units: 'scaled_unit',
        amount: makerReceivesQuote
          ? BigInt(trade.price) * BigInt(trade.quantity)
          : BigInt(trade.quantity),
        createdAt: trade.createdAt,
      });
      if (key) consumedLedgerSignatures.add(key);
    }
  }

  for (const position of input.liquidityPositions) {
    const timestamp = historyTimestamp(position.createdAt);
    const market = marketMap.get(position.marketId);

    if (!market) {
      const legacyLiquidityEntry: LegacyHistoryEntry = {
        id: `liquidity-${position.id}`,
        category: 'legacy',
        actionLabel: 'Legacy entry',
        reason: `Missing market metadata for liquidity position ${position.id}`,
        ...timestamp,
      };
      historyEntries.push(legacyLiquidityEntry);
      continue;
    }

    const spentQuote = QuoteAmount.new(BigInt(position.depositQuote) * 2n);
    historyEntries.push({
      id: `liquidity-${position.id}`,
      category: 'liquidityProvided',
      actionLabel: 'Provide liquidity',
      marketPublicId: market.publicId,
      baseAssetId: market.baseAssetId,
      quoteAssetId: market.quoteAssetId,
      spentQuote,
      providedBase: position.depositBase,
      providedQuote: position.depositQuote,
      ...timestamp,
    });

    if (input.usdAssetId !== null) {
      const key = ledgerSignatureKey({
        drCr: 'dr',
        assetId: input.usdAssetId,
        units: 'scaled_unit',
        amount: BigInt(spentQuote),
        createdAt: position.createdAt,
      });
      if (key) consumedLedgerSignatures.add(key);
    }
  }

  for (let index = 0; index < input.ledger.length; index += 1) {
    const transaction = input.ledger[index];
    const signature = ledgerSignatureKey({
      drCr: transaction.drCr,
      assetId: transaction.assetId,
      units: transaction.units,
      amount: BigInt(transaction.amount),
      createdAt: transaction.createdAt,
    });
    if (signature !== null && consumedLedgerSignatures.has(signature)) {
      continue;
    }

    const timestamp = historyTimestamp(transaction.createdAt);
    historyEntries.push({
      id: `ledger-${index}`,
      category: 'balanceEdit',
      actionLabel:
        input.usdAssetId !== null && transaction.assetId === input.usdAssetId
          ? transaction.drCr === 'cr'
            ? 'Add balance in USD'
            : 'Withdraw balance in USD'
          : transaction.drCr === 'cr'
            ? 'Balance increased'
            : 'Balance decreased',
      assetId: transaction.assetId,
      amount: transaction.amount,
      units: transaction.units,
      drCr: transaction.drCr,
      ...timestamp,
    });
  }

  const entries = [...historyEntries].sort((left, right) => {
    const leftMs = Date.parse(left.occurredAtIso);
    const rightMs = Date.parse(right.occurredAtIso);
    if (leftMs === rightMs) return left.id.localeCompare(right.id);
    return rightMs - leftMs;
  });

  return {
    userId: input.userId,
    entries,
  };
};
// end of LLM written Code
