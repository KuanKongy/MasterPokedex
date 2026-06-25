ALTER TABLE "dex"."location_meta" ADD COLUMN "notable_trainers" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "dex"."pokemon" ADD COLUMN "form_label" text;--> statement-breakpoint
ALTER TABLE "dex"."pokemon" ADD COLUMN "is_mega" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dex"."pokemon" ADD COLUMN "is_gmax" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dex"."pokemon" ADD COLUMN "is_regional" boolean DEFAULT false NOT NULL;