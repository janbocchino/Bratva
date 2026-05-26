CREATE TABLE `assets_data` (
	`id` integer PRIMARY KEY NOT NULL,
	`asset_id` integer NOT NULL,
	`field` text NOT NULL,
	`value` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assets_data_asset_field_created_idx` ON `assets_data` (`asset_id`,`field`,`created_at`);--> statement-breakpoint
ALTER TABLE `assets` ADD `kind` text DEFAULT 'token' NOT NULL;--> statement-breakpoint
CREATE INDEX `assets_kind_idx` ON `assets` (`kind`);