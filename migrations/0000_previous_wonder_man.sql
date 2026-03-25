CREATE TABLE `assets` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`name` text NOT NULL,
	`ticker` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_public_id_unique` ON `assets` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `assets_ticker_unique` ON `assets` (`ticker`);--> statement-breakpoint
CREATE INDEX `assets_public_id_idx` ON `assets` (`public_id`);--> statement-breakpoint
CREATE INDEX `assets_ticker_idx` ON `assets` (`ticker`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`asset_id` integer NOT NULL,
	`dr_cr` text NOT NULL,
	`amount` blob NOT NULL,
	`unit` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ledger_entries_user_id_idx` ON `ledger_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `ledger_entries_asset_id_idx` ON `ledger_entries` (`asset_id`);--> statement-breakpoint
CREATE INDEX `ledger_entries_created_at_idx` ON `ledger_entries` (`created_at`);--> statement-breakpoint
CREATE TABLE `liquidity_positions` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`market_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`lp_tokens` blob NOT NULL,
	`deposit_base` blob NOT NULL,
	`deposit_quote` blob NOT NULL,
	`locked_until` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `liquidity_positions_public_id_unique` ON `liquidity_positions` (`public_id`);--> statement-breakpoint
CREATE INDEX `lp_market_id_idx` ON `liquidity_positions` (`market_id`);--> statement-breakpoint
CREATE INDEX `lp_user_id_idx` ON `liquidity_positions` (`user_id`);--> statement-breakpoint
CREATE TABLE `markets` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`base_asset_id` integer NOT NULL,
	`quote_asset_id` integer NOT NULL,
	`sequence_number` integer DEFAULT 0 NOT NULL,
	`amm_reserve_base` blob NOT NULL,
	`amm_reserve_quote` blob NOT NULL,
	`total_lp_tokens` blob DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'closed' NOT NULL,
	`was_previously_active` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`base_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quote_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `markets_public_id_unique` ON `markets` (`public_id`);--> statement-breakpoint
CREATE INDEX `markets_public_id_idx` ON `markets` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `markets_base_quote_unique` ON `markets` (`base_asset_id`,`quote_asset_id`);--> statement-breakpoint
CREATE TABLE `model_price` (
	`id` integer PRIMARY KEY NOT NULL,
	`market_id` integer NOT NULL,
	`price` blob NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `model_price_market_id_idx` ON `model_price` (`market_id`);--> statement-breakpoint
CREATE INDEX `model_price_created_at_idx` ON `model_price` (`created_at`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`market_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`side` text NOT NULL,
	`price` blob NOT NULL,
	`quantity` integer NOT NULL,
	`filled` integer DEFAULT 0 NOT NULL,
	`stop_loss` blob NOT NULL,
	`market_sequence_number` integer NOT NULL,
	`nonce` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_public_id_unique` ON `orders` (`public_id`);--> statement-breakpoint
CREATE INDEX `orders_market_id_idx` ON `orders` (`market_id`);--> statement-breakpoint
CREATE INDEX `orders_user_id_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);--> statement-breakpoint
CREATE TABLE `price_series` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`asset_id` integer NOT NULL,
	`price` blob NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_series_public_id_unique` ON `price_series` (`public_id`);--> statement-breakpoint
CREATE INDEX `price_series_public_id_idx` ON `price_series` (`public_id`);--> statement-breakpoint
CREATE INDEX `price_series_asset_id_idx` ON `price_series` (`asset_id`);--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY NOT NULL,
	`market_id` integer NOT NULL,
	`maker_order_id` integer,
	`taker_order_id` integer NOT NULL,
	`maker_user_id` integer,
	`taker_user_id` integer NOT NULL,
	`price` blob NOT NULL,
	`quantity` integer NOT NULL,
	`side` text NOT NULL,
	`source` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`maker_order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`taker_order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`maker_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`taker_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `transactions_market_id_idx` ON `transactions` (`market_id`);--> statement-breakpoint
CREATE INDEX `transactions_taker_user_id_idx` ON `transactions` (`taker_user_id`);--> statement-breakpoint
CREATE INDEX `transactions_created_at_idx` ON `transactions` (`created_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`nonce` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_public_id_unique` ON `users` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_public_id_idx` ON `users` (`public_id`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE VIEW `ledger_entries_with_balance` AS 
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
;--> statement-breakpoint
CREATE VIEW `ledger_summary_entries` AS 
	SELECT
		user_id,
		asset_id,
		CAST(SUM(CASE WHEN dr_cr = 'cr' THEN amount ELSE -amount END) AS TEXT) AS balance
	FROM ledger_entries
	GROUP BY user_id, asset_id
;