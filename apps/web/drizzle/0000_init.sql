CREATE SCHEMA IF NOT EXISTS "punchcard";
--> statement-breakpoint
CREATE TYPE "punchcard"."entry_source" AS ENUM('manual', 'geofence', 'widget', 'live_activity');--> statement-breakpoint
CREATE TYPE "punchcard"."plan" AS ENUM('free', 'pro');--> statement-breakpoint
CREATE TYPE "punchcard"."platform" AS ENUM('ios', 'android');--> statement-breakpoint
CREATE TABLE "punchcard"."account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "punchcard"."clients" (
	"id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"hourly_rate_cents" integer DEFAULT 0 NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"address" text,
	"lat" double precision,
	"lng" double precision,
	"geofence_radius_m" integer,
	"archived_at" timestamp with time zone,
	CONSTRAINT "clients_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "punchcard"."devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expo_push_token" text NOT NULL,
	"platform" "punchcard"."platform" NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_expo_push_token_unique" UNIQUE("expo_push_token")
);
--> statement-breakpoint
CREATE TABLE "punchcard"."entitlements" (
	"user_id" text PRIMARY KEY NOT NULL,
	"plan" "punchcard"."plan" DEFAULT 'free' NOT NULL,
	"source" text DEFAULT 'revenuecat' NOT NULL,
	"expires_at" timestamp with time zone,
	"event_at" timestamp with time zone,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "punchcard"."entries" (
	"id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" text NOT NULL,
	"job_id" text,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"break_seconds" integer DEFAULT 0 NOT NULL,
	"break_started_at" timestamp with time zone,
	"note" text DEFAULT '' NOT NULL,
	"mileage_km" double precision,
	"source" "punchcard"."entry_source" DEFAULT 'manual' NOT NULL,
	"edited_note" text,
	CONSTRAINT "entries_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "punchcard"."entry_photos" (
	"id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"entry_id" text NOT NULL,
	"local_uri" text NOT NULL,
	"remote_url" text,
	CONSTRAINT "entry_photos_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "punchcard"."jobs" (
	"id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"deleted_at" timestamp with time zone,
	"server_updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_id" text NOT NULL,
	"name" text NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "jobs_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "punchcard"."revenuecat_events" (
	"id" text PRIMARY KEY NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" text NOT NULL,
	"app_user_id" text,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "punchcard"."session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "punchcard"."user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "punchcard"."verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "punchcard"."account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "punchcard"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punchcard"."clients" ADD CONSTRAINT "clients_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "punchcard"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punchcard"."devices" ADD CONSTRAINT "devices_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "punchcard"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punchcard"."entitlements" ADD CONSTRAINT "entitlements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "punchcard"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punchcard"."entries" ADD CONSTRAINT "entries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "punchcard"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punchcard"."entry_photos" ADD CONSTRAINT "entry_photos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "punchcard"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punchcard"."jobs" ADD CONSTRAINT "jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "punchcard"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "punchcard"."session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "punchcard"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "punchcard"."account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "clients_user_server_updated_idx" ON "punchcard"."clients" USING btree ("user_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "devices_user_id_idx" ON "punchcard"."devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "entries_user_server_updated_idx" ON "punchcard"."entries" USING btree ("user_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "entries_user_started_idx" ON "punchcard"."entries" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "entry_photos_user_server_updated_idx" ON "punchcard"."entry_photos" USING btree ("user_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "jobs_user_server_updated_idx" ON "punchcard"."jobs" USING btree ("user_id","server_updated_at");--> statement-breakpoint
CREATE INDEX "revenuecat_events_app_user_id_idx" ON "punchcard"."revenuecat_events" USING btree ("app_user_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "punchcard"."session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "punchcard"."verification" USING btree ("identifier");