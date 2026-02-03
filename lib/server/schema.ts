import { sql } from 'drizzle-orm';
import { blob, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { v4 as uuidv4 } from 'uuid';

export const timestamps = {
	createdAt: integer('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
	updatedAt: integer('updated_at')
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
		createdAt: integer('created_at')
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
