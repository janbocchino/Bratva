CREATE TABLE `assets` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`ticker` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `assets_ticker_unique` ON `assets` (`ticker`);--> statement-breakpoint
CREATE INDEX `assets_ticker_idx` ON `assets` (`ticker`);