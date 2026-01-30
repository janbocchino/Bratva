CREATE TABLE `users` (
	`id` integer PRIMARY KEY NOT NULL,
	`public_id` text NOT NULL,
	`display_name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` integer DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_public_id_unique` ON `users` (`public_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_public_id_idx` ON `users` (`public_id`);--> statement-breakpoint
CREATE INDEX `users_email_idx` ON `users` (`email`);