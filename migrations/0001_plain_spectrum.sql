PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_markets` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`base_asset_id` integer NOT NULL,
	`quote_asset_id` integer NOT NULL,
	`sequence_number` integer DEFAULT 0 NOT NULL,
	`amm_reserve_base` blob NOT NULL,
	`amm_reserve_quote` blob NOT NULL,
	`total_lp_tokens` blob NOT NULL,
	`status` text DEFAULT 'closed' NOT NULL,
	`was_previously_active` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`base_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`quote_asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_markets`("id", "public_id", "base_asset_id", "quote_asset_id", "sequence_number", "amm_reserve_base", "amm_reserve_quote", "total_lp_tokens", "status", "was_previously_active", "created_at", "updated_at") SELECT "id", "public_id", "base_asset_id", "quote_asset_id", "sequence_number", "amm_reserve_base", "amm_reserve_quote", "total_lp_tokens", "status", "was_previously_active", "created_at", "updated_at" FROM `markets`;--> statement-breakpoint
DROP TABLE `markets`;--> statement-breakpoint
ALTER TABLE `__new_markets` RENAME TO `markets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `markets_public_id_unique` ON `markets` (`public_id`);--> statement-breakpoint
CREATE INDEX `markets_public_id_idx` ON `markets` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `markets_base_quote_unique` ON `markets` (`base_asset_id`,`quote_asset_id`);--> statement-breakpoint
CREATE TABLE `__new_orders` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`market_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`side` text NOT NULL,
	`price` blob NOT NULL,
	`quantity` blob NOT NULL,
	`filled` blob NOT NULL,
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
INSERT INTO `__new_orders`("id", "public_id", "market_id", "user_id", "side", "price", "quantity", "filled", "stop_loss", "market_sequence_number", "nonce", "status", "created_at", "updated_at", "expires_at") SELECT "id", "public_id", "market_id", "user_id", "side", "price", "quantity", "filled", "stop_loss", "market_sequence_number", "nonce", "status", "created_at", "updated_at", "expires_at" FROM `orders`;--> statement-breakpoint
DROP TABLE `orders`;--> statement-breakpoint
ALTER TABLE `__new_orders` RENAME TO `orders`;--> statement-breakpoint
CREATE UNIQUE INDEX `orders_public_id_unique` ON `orders` (`public_id`);--> statement-breakpoint
CREATE INDEX `orders_market_id_idx` ON `orders` (`market_id`);--> statement-breakpoint
CREATE INDEX `orders_user_id_idx` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `orders_status_idx` ON `orders` (`status`);