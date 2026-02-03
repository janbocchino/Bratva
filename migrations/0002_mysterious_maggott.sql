CREATE TABLE `ledger_entries` (
	`id` integer PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`asset_id` integer NOT NULL,
	`dr_cr` text NOT NULL,
	`amount` blob NOT NULL,
	`unit` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ledger_entries_user_id_idx` ON `ledger_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `ledger_entries_asset_id_idx` ON `ledger_entries` (`asset_id`);--> statement-breakpoint
CREATE INDEX `ledger_entries_created_at_idx` ON `ledger_entries` (`created_at`);--> statement-breakpoint
CREATE TABLE `price_series` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`asset_id` integer NOT NULL,
	`price` blob NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `price_series_public_id_unique` ON `price_series` (`public_id`);--> statement-breakpoint
CREATE INDEX `price_series_public_id_idx` ON `price_series` (`public_id`);--> statement-breakpoint
CREATE INDEX `price_series_asset_id_idx` ON `price_series` (`asset_id`);--> statement-breakpoint
ALTER TABLE `assets` ADD `public_id` text NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `assets_public_id_unique` ON `assets` (`public_id`);--> statement-breakpoint
CREATE INDEX `assets_public_id_idx` ON `assets` (`public_id`);--> statement-breakpoint
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
		SUM(CASE WHEN dr_cr = 'cr' THEN amount ELSE -amount END) AS balance
	FROM ledger_entries
	GROUP BY user_id, asset_id
;