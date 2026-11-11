CREATE TABLE "hidden_accounts" (
	"github_id" bigint PRIMARY KEY NOT NULL,
	"hidden_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_lookups" (
	"client" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_recaps" (
	"github_id" bigint PRIMARY KEY NOT NULL,
	"login" text NOT NULL,
	"data" jsonb,
	"schema_version" integer,
	"previous" jsonb,
	"fetched_at" timestamp with time zone,
	"fetching_since" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "public_lookups_client_at" ON "public_lookups" USING btree ("client","at");