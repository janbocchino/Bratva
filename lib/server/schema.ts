import { sql } from 'drizzle-orm';
import {
	blob,
	index,
	integer,
	sqliteTable,
	text,
	sqliteView,
} from 'drizzle-orm/sqlite-core';
import { v4 as uuidv4 } from 'uuid';

export const timestamps = {
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
		.$onUpdate(() => sql`CURRENT_TIMESTAMP`),
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
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`CURRENT_TIMESTAMP`),
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
		createdAt: integer('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
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

export const ledgerEntriesWithBalance = sqliteView(
	'ledger_entries_with_balance',
	{
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
		createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
		balance: text('balance').notNull(),
	},
).as(sql`
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

export type LedgerEntryWithBalancePrs =
	typeof ledgerEntriesWithBalance.$inferSelect;
