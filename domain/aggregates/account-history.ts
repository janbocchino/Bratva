// beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
/*
Decision questionnaire
- How to add account history without schema changes?
  - [x] Compose a typed feed from existing ledgers/trades/liquidity rows.
  - [ ] Extend ledger schema and backfill metadata.
- How to handle low-confidence legacy rows?
  - [x] Use explicit legacy variant instead of pretending certainty.
  - [ ] Infer action labels for every row.
*/
import type { AssetId } from '../values/asset';
import type { TokenAmount, QuoteAmount } from '../values/currencies';
import type { LedgerUnits } from '../aggregates/ledger';
import type { MarketPublicId } from '../values/market';
import type { UserId } from '../values/user';

export type AccountHistoryCategory = 'balanceEdit' | 'trade' | 'liquidityProvided' | 'legacy';

type AccountHistoryEntryBase = {
  id: string;
  category: AccountHistoryCategory;
  occurredAtIso: string;
  hasAccurateTimestamp: boolean;
};

export type BalanceEditHistoryEntry = AccountHistoryEntryBase & {
  category: 'balanceEdit';
  actionLabel:
    | 'Add balance in USD'
    | 'Withdraw balance in USD'
    | 'Balance increased'
    | 'Balance decreased';
  assetId: AssetId;
  amount: TokenAmount | QuoteAmount;
  units: LedgerUnits;
  drCr: 'dr' | 'cr';
};

export type TradeHistoryEntry = AccountHistoryEntryBase & {
  category: 'trade';
  actionLabel: 'Trade executed';
  marketPublicId: MarketPublicId;
  baseAssetId: AssetId;
  quoteAssetId: AssetId;
  side: 'bid' | 'ask';
  source: 'book' | 'amm';
  price: QuoteAmount;
  quantity: TokenAmount;
};

export type LiquidityProvidedHistoryEntry = AccountHistoryEntryBase & {
  category: 'liquidityProvided';
  actionLabel: 'Provide liquidity';
  marketPublicId: MarketPublicId;
  baseAssetId: AssetId;
  quoteAssetId: AssetId;
  spentQuote: QuoteAmount;
  providedBase: TokenAmount;
  providedQuote: QuoteAmount;
};

export type LegacyHistoryEntry = AccountHistoryEntryBase & {
  category: 'legacy';
  actionLabel: 'Legacy entry';
  reason: string;
};

export type AccountHistoryEntry =
  | BalanceEditHistoryEntry
  | TradeHistoryEntry
  | LiquidityProvidedHistoryEntry
  | LegacyHistoryEntry;

export type AccountHistory = {
  userId: UserId;
  entries: AccountHistoryEntry[];
};
// end of LLM written Code
