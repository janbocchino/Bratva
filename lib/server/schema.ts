import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
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
