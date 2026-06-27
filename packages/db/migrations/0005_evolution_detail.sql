ALTER TABLE "dex"."evolution" ADD COLUMN "known_move_type" text;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "minimum_beauty" smallint;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "near_special_rock" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "relative_physical_stats" text;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "party_species" text;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "party_type" text;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "trade_species" text;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "needs_multiplayer" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "used_move" text;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "minimum_move_count" smallint;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "minimum_steps" integer;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "minimum_damage_taken" integer;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD COLUMN "region_id" integer;--> statement-breakpoint
ALTER TABLE "dex"."location_meta" ADD COLUMN "notable" boolean DEFAULT false NOT NULL;