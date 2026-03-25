import { sql } from 'drizzle-orm';
import { blob, index, integer, sqliteTable, text, uniqueIndex, sqliteView } from 'drizzle-orm/sqlite-core';
import { v4 as uuidv4 } from 'uuid';

// beginning of LLM written Code, Model: gpt-5.3-codex
/*
Decision questionnaire
- Where should model price history live?
  - [x] Dedicated append-only `model_price` table with FK to `markets`.
  - [ ] Mutable `markets.model_price` column.
*/
// end of LLM written Code
export const timestamps = {
  // beginning of LLM written Code, Model: gpt-5.3-codex
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`)
    .$onUpdate(() => sql`(unixepoch() * 1000)`),
  // end of LLM written Code
};

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey(),
    publicId: text('public_id')
      .notNull()
      .unique()
      .$defaultFn(() => uuidv4()),

    displayName: text('display_name').notNull(),
    email: text('email').notNull().unique(),
    nonce: integer('nonce').notNull().default(0),

    ...timestamps,
  },
  (table) => [
    index('users_public_id_idx').on(table.publicId),
    index('users_email_idx').on(table.email),
  ],
);

export type UserPrs = typeof users.$inferSelect;
export type NewUserPrs = typeof users.$inferInsert;

export const assets = sqliteTable(
  'assets',
  {
    id: integer('id').primaryKey(),
    publicId: text('public_id')
      .notNull()
      .unique()
      .$defaultFn(() => uuidv4()),
    name: text('name').notNull(),
    ticker: text('ticker').notNull().unique(),
    ...timestamps,
  },
  (table) => [
    index('assets_public_id_idx').on(table.publicId),
    index('assets_ticker_idx').on(table.ticker),
  ],
);

export type AssetPrs = typeof assets.$inferSelect;
export type NewAssetPrs = typeof assets.$inferInsert;

export const priceSeries = sqliteTable(
  'price_series',
  {
    id: integer('id').primaryKey(),
    publicId: text('public_id')
      .notNull()
      .unique()
      .$defaultFn(() => uuidv4()),
    assetId: integer('asset_id')
      .notNull()
      .references(() => assets.id),
    price: blob('price', { mode: 'bigint' }).notNull(),
    // beginning of LLM written Code, Model: gpt-5.3-codex
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    // end of LLM written Code
  },
  (table) => [
    index('price_series_public_id_idx').on(table.publicId),
    index('price_series_asset_id_idx').on(table.assetId),
  ],
);

export type PriceSeriesPrs = typeof priceSeries.$inferSelect;
export type NewPriceSeriesPrs = typeof priceSeries.$inferInsert;

export const ledgerEntries = sqliteTable(
  'ledger_entries',
  {
    id: integer('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    assetId: integer('asset_id')
      .notNull()
      .references(() => assets.id),
    drCr: text('dr_cr', { enum: ['dr', 'cr'] }).notNull(),
    amount: blob('amount', { mode: 'bigint' }).notNull(),
    units: text('unit', { enum: ['cent', 'unit'] }).notNull(),
    // beginning of LLM written Code, Model: gpt-5.3-codex
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
    // end of LLM written Code
  },
  (table) => [
    index('ledger_entries_user_id_idx').on(table.userId),
    index('ledger_entries_asset_id_idx').on(table.assetId),
    index('ledger_entries_created_at_idx').on(table.createdAt),
  ],
);

export type LedgerEntryPrs = typeof ledgerEntries.$inferSelect;
export type NewLedgerEntryPrs = typeof ledgerEntries.$inferInsert;

export const ledgerSummaryEntries = sqliteView('ledger_summary_entries', {
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  assetId: integer('asset_id')
    .notNull()
    .references(() => assets.id),
  balance: text('balance').notNull(),
}).as(sql`
	SELECT
		user_id,
		asset_id,
		CAST(SUM(CASE WHEN dr_cr = 'cr' THEN amount ELSE -amount END) AS TEXT) AS balance
	FROM ledger_entries
	GROUP BY user_id, asset_id
`);

export type LedgerSummaryEntryPrs = typeof ledgerSummaryEntries.$inferSelect;

export const ledgerEntriesWithBalance = sqliteView('ledger_entries_with_balance', {
  id: integer('id').notNull(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  assetId: integer('asset_id')
    .notNull()
    .references(() => assets.id),
  drCr: text('dr_cr', { enum: ['dr', 'cr'] }).notNull(),
  amount: blob('amount', { mode: 'bigint' }).notNull(),
  units: text('unit', { enum: ['cent', 'unit'] }).notNull(),
  // beginning of LLM written Code, Model: gpt-5.3-codex
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  // end of LLM written Code
  balance: text('balance').notNull(),
}).as(sql`
	SELECT
		ledger_entries.id,
		ledger_entries.user_id,
		ledger_entries.asset_id,
		ledger_entries.dr_cr,
		ledger_entries.amount,
		ledger_entries.unit,
		ledger_entries.created_at,
		ledger_summary_entries.balance
	FROM ledger_entries
	INNER JOIN ledger_summary_entries
		ON ledger_entries.user_id = ledger_summary_entries.user_id
		AND ledger_entries.asset_id = ledger_summary_entries.asset_id
`);

export type LedgerEntryWithBalancePrs = typeof ledgerEntriesWithBalance.$inferSelect;

// ── Exchange ─────────────────────────────────────────────────────────────

export const markets = sqliteTable(
  'markets',
  {
    id: integer('id').primaryKey(),
    publicId: text('public_id')
      .notNull()
      .unique()
      .$defaultFn(() => uuidv4()),
    baseAssetId: integer('base_asset_id')
      .notNull()
      .references(() => assets.id),
    quoteAssetId: integer('quote_asset_id')
      .notNull()
      .references(() => assets.id),
    sequenceNumber: integer('sequence_number').notNull().default(0),
    ammReserveBase: blob('amm_reserve_base', { mode: 'bigint' }).notNull(),
    ammReserveQuote: blob('amm_reserve_quote', { mode: 'bigint' }).notNull(),
    totalLpTokens: blob('total_lp_tokens', { mode: 'bigint' }).notNull().default(sql`0`),
    status: text('status', {
      // beginning of LLM written Code, Model: Claude
      enum: ['closed', 'pending', 'active'],
      // end of LLM written Code
    })
      .notNull()
      .default('closed'),
    // beginning of LLM written Code, Model: Claude claude-4.6-opus-high-thinking
    wasPreviouslyActive: integer('was_previously_active', { mode: 'boolean' })
      .notNull()
      .default(false),
    // end of LLM written Code
    ...timestamps,
  },
  (table) => [
    index('markets_public_id_idx').on(table.publicId),
    // beginning of LLM written Code, Model: gpt-5.3-codex-low
    uniqueIndex('markets_base_quote_unique').on(table.baseAssetId, table.quoteAssetId),
    // end of LLM written Code
  ],
);

export type MarketPrs = typeof markets.$inferSelect;
export type NewMarketPrs = typeof markets.$inferInsert;

// beginning of LLM written Code, Model: gpt-5.3-codex
export const modelPrice = sqliteTable(
  'model_price',
  {
    id: integer('id').primaryKey(),
    marketId: integer('market_id')
      .notNull()
      .references(() => markets.id),
    price: blob('price', { mode: 'bigint' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (table) => [
    index('model_price_market_id_idx').on(table.marketId),
    index('model_price_created_at_idx').on(table.createdAt),
  ],
);

export type ModelPricePrs = typeof modelPrice.$inferSelect;
export type NewModelPricePrs = typeof modelPrice.$inferInsert;
// end of LLM written Code

export const liquidityPositions = sqliteTable(
  'liquidity_positions',
  {
    id: integer('id').primaryKey(),
    publicId: text('public_id')
      .notNull()
      .unique()
      .$defaultFn(() => uuidv4()),
    marketId: integer('market_id')
      .notNull()
      .references(() => markets.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    lpTokens: blob('lp_tokens', { mode: 'bigint' }).notNull(),
    depositBase: blob('deposit_base', { mode: 'bigint' }).notNull(),
    depositQuote: blob('deposit_quote', { mode: 'bigint' }).notNull(),
    // beginning of LLM written Code, Model: gpt-5.3-codex
    lockedUntil: integer('locked_until', { mode: 'timestamp_ms' }),
    // end of LLM written Code
    status: text('status', { enum: ['active', 'withdrawn'] })
      .notNull()
      .default('active'),
    ...timestamps,
  },
  (table) => [
    index('lp_market_id_idx').on(table.marketId),
    index('lp_user_id_idx').on(table.userId),
  ],
);

export type LiquidityPositionPrs = typeof liquidityPositions.$inferSelect;
export type NewLiquidityPositionPrs = typeof liquidityPositions.$inferInsert;

export const orders = sqliteTable(
  'orders',
  {
    id: integer('id').primaryKey(),
    publicId: text('public_id')
      .notNull()
      .unique()
      .$defaultFn(() => uuidv4()),
    marketId: integer('market_id')
      .notNull()
      .references(() => markets.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    side: text('side', { enum: ['bid', 'ask'] }).notNull(),
    price: blob('price', { mode: 'bigint' }).notNull(),
    quantity: integer('quantity').notNull(),
    filled: integer('filled').notNull().default(0),
    stopLoss: blob('stop_loss', { mode: 'bigint' }).notNull(),
    marketSequenceNumber: integer('market_sequence_number').notNull(),
    nonce: integer('nonce').notNull().default(0),
    status: text('status', {
      enum: ['open', 'filled', 'cancelled', 'expired'],
    })
      .notNull()
      .default('open'),
    ...timestamps,
    // beginning of LLM written Code, Model: gpt-5.3-codex
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    // end of LLM written Code
  },
  (table) => [
    index('orders_market_id_idx').on(table.marketId),
    index('orders_user_id_idx').on(table.userId),
    index('orders_status_idx').on(table.status),
  ],
);

export type OrderPrs = typeof orders.$inferSelect;
export type NewOrderPrs = typeof orders.$inferInsert;

export const transactions = sqliteTable(
  'transactions',
  {
    id: integer('id').primaryKey(),
    marketId: integer('market_id')
      .notNull()
      .references(() => markets.id),
    makerOrderId: integer('maker_order_id').references(() => orders.id),
    takerOrderId: integer('taker_order_id')
      .notNull()
      .references(() => orders.id),
    makerUserId: integer('maker_user_id').references(() => users.id),
    takerUserId: integer('taker_user_id')
      .notNull()
      .references(() => users.id),
    price: blob('price', { mode: 'bigint' }).notNull(),
    quantity: integer('quantity').notNull(),
    side: text('side', { enum: ['bid', 'ask'] }).notNull(),
    source: text('source', { enum: ['book', 'amm'] }).notNull(),
    // beginning of LLM written Code, Model: gpt-5.3-codex
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    // end of LLM written Code
  },
  (table) => [
    index('transactions_market_id_idx').on(table.marketId),
    index('transactions_taker_user_id_idx').on(table.takerUserId),
    index('transactions_created_at_idx').on(table.createdAt),
  ],
);

export type TransactionPrs = typeof transactions.$inferSelect;
export type NewTransactionPrs = typeof transactions.$inferInsert;
