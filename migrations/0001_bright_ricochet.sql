DROP INDEX `markets_base_quote_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `markets_base_quote_unique` ON `markets` (`base_asset_id`,`quote_asset_id`);