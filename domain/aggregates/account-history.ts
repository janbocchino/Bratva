// beginning of LLM written Code, Model: gpt-5.3-codex
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
import type { Cent, Units } from '../values/currencies';
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
  amount: Cent | Units;
  units: 'cent' | 'unit';
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
  price: Cent;
  quantity: number;
};

export type LiquidityProvidedHistoryEntry = AccountHistoryEntryBase & {
  category: 'liquidityProvided';
  actionLabel: 'Provide liquidity';
  marketPublicId: MarketPublicId;
  baseAssetId: AssetId;
  quoteAssetId: AssetId;
  spentQuote: Cent;
  providedBase: Units;
  providedQuote: Cent;
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
