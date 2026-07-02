CREATE TABLE "dex"."location_items" (
	"id" integer PRIMARY KEY NOT NULL,
	"location_id" integer NOT NULL,
	"item_id" integer,
	"label" text NOT NULL,
	"note" text,
	"hidden" boolean DEFAULT false NOT NULL,
	"spots" smallint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dex"."location_items" ADD CONSTRAINT "location_items_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "dex"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."location_items" ADD CONSTRAINT "location_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "dex"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "location_items_location_idx" ON "dex"."location_items" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "location_items_item_idx" ON "dex"."location_items" USING btree ("item_id");