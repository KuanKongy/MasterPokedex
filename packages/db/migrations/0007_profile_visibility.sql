ALTER TABLE "trainers" ADD COLUMN "show_bag" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "show_favorites" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "show_activity" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "trainers" ADD COLUMN "show_friends" boolean DEFAULT true NOT NULL;