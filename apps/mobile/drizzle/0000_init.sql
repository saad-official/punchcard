CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`hourly_rate_cents` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`address` text,
	`lat` real,
	`lng` real,
	`geofence_radius_m` integer,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `clients_updated_at_idx` ON `clients` (`updated_at`);--> statement-breakpoint
CREATE TABLE `entries` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`job_id` text,
	`started_at` text NOT NULL,
	`ended_at` text,
	`break_seconds` integer DEFAULT 0 NOT NULL,
	`break_started_at` text,
	`note` text DEFAULT '' NOT NULL,
	`mileage_km` real,
	`source` text DEFAULT 'manual' NOT NULL,
	`edited_note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entries_started_at_idx` ON `entries` (`started_at`);--> statement-breakpoint
CREATE INDEX `entries_client_id_idx` ON `entries` (`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `entries_single_running_idx` ON `entries` ((ended_at IS NULL)) WHERE ended_at IS NULL AND deleted_at IS NULL;--> statement-breakpoint
CREATE TABLE `entry_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`local_uri` text NOT NULL,
	`remote_url` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`entry_id`) REFERENCES `entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `entry_photos_entry_id_idx` ON `entry_photos` (`entry_id`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`name` text NOT NULL,
	`archived_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `jobs_client_id_idx` ON `jobs` (`client_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_state` (
	`table_name` text PRIMARY KEY NOT NULL,
	`last_pulled_at` text,
	`dirty_ids` text DEFAULT '[]' NOT NULL
);
