CREATE SCHEMA "dex";
--> statement-breakpoint
CREATE TYPE "public"."activity_kind" AS ENUM('caught', 'team_created', 'friend_added', 'badge_earned', 'shiny_caught');--> statement-breakpoint
CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."pokemon_gender" AS ENUM('male', 'female', 'genderless');--> statement-breakpoint
CREATE TYPE "public"."team_category" AS ENUM('party', 'box', 'showcase');--> statement-breakpoint
CREATE TYPE "public"."trainer_rank" AS ENUM('rookie', 'trainer', 'ace', 'veteran', 'elite', 'champion');--> statement-breakpoint
CREATE TABLE "dex"."abilities" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"short_effect" text,
	"generation_id" smallint,
	CONSTRAINT "abilities_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dex"."encounter_methods" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer,
	CONSTRAINT "encounter_methods_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dex"."encounters" (
	"id" integer PRIMARY KEY NOT NULL,
	"location_area_id" integer NOT NULL,
	"pokemon_id" integer NOT NULL,
	"method_id" integer NOT NULL,
	"slot" smallint,
	"rarity" double precision DEFAULT 0 NOT NULL,
	"min_level" smallint NOT NULL,
	"max_level" smallint NOT NULL,
	"conditions" text[] DEFAULT '{}'::text[] NOT NULL,
	"versions" text[] DEFAULT '{}'::text[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dex"."evolution" (
	"id" integer PRIMARY KEY NOT NULL,
	"evolved_species_id" integer NOT NULL,
	"trigger" text,
	"minimum_level" smallint,
	"trigger_item" text,
	"held_item" text,
	"known_move" text,
	"minimum_happiness" smallint,
	"minimum_affection" smallint,
	"time_of_day" text,
	"gender" text,
	"location_id" integer,
	"needs_overworld_rain" boolean DEFAULT false NOT NULL,
	"turn_upside_down" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dex"."experience" (
	"growth_rate_id" integer NOT NULL,
	"level" smallint NOT NULL,
	"experience" integer NOT NULL,
	CONSTRAINT "experience_growth_rate_id_level_pk" PRIMARY KEY("growth_rate_id","level")
);
--> statement-breakpoint
CREATE TABLE "dex"."growth_rates" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "growth_rates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dex"."item_categories" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"pocket" text,
	CONSTRAINT "item_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dex"."items" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"category_id" integer NOT NULL,
	"cost" integer,
	"fling_power" smallint,
	"short_effect" text,
	"sprite" text GENERATED ALWAYS AS ('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/' || name || '.png') STORED,
	CONSTRAINT "items_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dex"."location_areas" (
	"id" integer PRIMARY KEY NOT NULL,
	"location_id" integer NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dex"."location_meta" (
	"location_id" integer PRIMARY KEY NOT NULL,
	"map_x" real,
	"map_y" real,
	"image" text,
	"description" text,
	"kind" text,
	"neighbor_ids" integer[] DEFAULT '{}'::integer[] NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dex"."locations" (
	"id" integer PRIMARY KEY NOT NULL,
	"region_id" integer,
	"name" text NOT NULL,
	"display_name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dex"."moves" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"type_id" integer NOT NULL,
	"damage_class" text NOT NULL,
	"power" smallint,
	"pp" smallint,
	"accuracy" smallint,
	"priority" smallint DEFAULT 0 NOT NULL,
	"generation_id" smallint,
	"short_effect" text,
	CONSTRAINT "moves_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dex"."pokemon" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"species_id" integer NOT NULL,
	"generation_id" smallint NOT NULL,
	"height" integer DEFAULT 0 NOT NULL,
	"weight" integer DEFAULT 0 NOT NULL,
	"base_experience" integer,
	"is_default" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	"hp" smallint NOT NULL,
	"attack" smallint NOT NULL,
	"defense" smallint NOT NULL,
	"special_attack" smallint NOT NULL,
	"special_defense" smallint NOT NULL,
	"speed" smallint NOT NULL,
	"total" integer GENERATED ALWAYS AS (hp + attack + defense + special_attack + special_defense + speed) STORED,
	"sprite" text GENERATED ALWAYS AS ('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' || id || '.png') STORED,
	"artwork" text GENERATED ALWAYS AS ('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/' || id || '.png') STORED
);
--> statement-breakpoint
CREATE TABLE "dex"."pokemon_abilities" (
	"pokemon_id" integer NOT NULL,
	"ability_id" integer NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"slot" smallint NOT NULL,
	CONSTRAINT "pokemon_abilities_pokemon_id_ability_id_pk" PRIMARY KEY("pokemon_id","ability_id")
);
--> statement-breakpoint
CREATE TABLE "dex"."pokemon_moves" (
	"pokemon_id" integer NOT NULL,
	"move_id" integer NOT NULL,
	"learn_method" text NOT NULL,
	"level" smallint,
	CONSTRAINT "pokemon_moves_pokemon_id_move_id_learn_method_pk" PRIMARY KEY("pokemon_id","move_id","learn_method")
);
--> statement-breakpoint
CREATE TABLE "dex"."pokemon_types" (
	"pokemon_id" integer NOT NULL,
	"type_id" integer NOT NULL,
	"slot" smallint NOT NULL,
	CONSTRAINT "pokemon_types_pokemon_id_type_id_pk" PRIMARY KEY("pokemon_id","type_id")
);
--> statement-breakpoint
CREATE TABLE "dex"."regions" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"map_image" text,
	CONSTRAINT "regions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dex"."species" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text,
	"genus" text,
	"description" text,
	"generation_id" smallint NOT NULL,
	"evolves_from_species_id" integer,
	"evolution_chain_id" integer,
	"color" text,
	"habitat" text,
	"shape" text,
	"gender_rate" smallint,
	"capture_rate" smallint,
	"base_happiness" smallint,
	"hatch_counter" smallint,
	"is_baby" boolean DEFAULT false NOT NULL,
	"is_legendary" boolean DEFAULT false NOT NULL,
	"is_mythical" boolean DEFAULT false NOT NULL,
	"growth_rate_id" integer,
	CONSTRAINT "species_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "dex"."type_efficacy" (
	"damage_type_id" integer NOT NULL,
	"target_type_id" integer NOT NULL,
	"damage_factor" smallint NOT NULL,
	CONSTRAINT "type_efficacy_damage_type_id_target_type_id_pk" PRIMARY KEY("damage_type_id","target_type_id")
);
--> statement-breakpoint
CREATE TABLE "dex"."types" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"generation_id" smallint,
	CONSTRAINT "types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"kind" "activity_kind" NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "caught_pokemon" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"team_id" uuid NOT NULL,
	"pokemon_id" integer NOT NULL,
	"nickname" text,
	"level" smallint DEFAULT 1 NOT NULL,
	"experience" integer DEFAULT 0 NOT NULL,
	"is_shiny" boolean DEFAULT false NOT NULL,
	"gender" "pokemon_gender",
	"height_cm" real,
	"weight_kg" real,
	"caught_at" timestamp with time zone DEFAULT now() NOT NULL,
	"caught_location_area_id" integer,
	"notes" text,
	CONSTRAINT "caught_level_range" CHECK ("caught_pokemon"."level" between 1 and 100),
	CONSTRAINT "caught_experience_nonneg" CHECK ("caught_pokemon"."experience" >= 0)
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"trainer_id" uuid NOT NULL,
	"pokemon_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorites_trainer_id_pokemon_id_pk" PRIMARY KEY("trainer_id","pokemon_id")
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" "friendship_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone,
	CONSTRAINT "friendships_no_self" CHECK ("friendships"."requester_id" <> "friendships"."addressee_id")
);
--> statement-breakpoint
CREATE TABLE "team_categories" (
	"slug" "team_category" PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"capacity" smallint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "team_category" DEFAULT 'box' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainer_items" (
	"trainer_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trainer_items_trainer_id_item_id_pk" PRIMARY KEY("trainer_id","item_id"),
	CONSTRAINT "trainer_items_quantity_nonneg" CHECK ("trainer_items"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "trainers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"bio" text,
	"region_id" integer,
	"favorite_type_id" integer,
	"rank" "trainer_rank" DEFAULT 'rookie' NOT NULL,
	"badges" smallint DEFAULT 0 NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_guest" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trainers_username_lowercase" CHECK ("trainers"."username" = lower("trainers"."username")),
	CONSTRAINT "trainers_username_format" CHECK ("trainers"."username" ~ '^[a-z0-9_]{3,20}$'),
	CONSTRAINT "trainers_badges_range" CHECK ("trainers"."badges" between 0 and 64)
);
--> statement-breakpoint
ALTER TABLE "dex"."encounters" ADD CONSTRAINT "encounters_location_area_id_location_areas_id_fk" FOREIGN KEY ("location_area_id") REFERENCES "dex"."location_areas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."encounters" ADD CONSTRAINT "encounters_pokemon_id_pokemon_id_fk" FOREIGN KEY ("pokemon_id") REFERENCES "dex"."pokemon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."encounters" ADD CONSTRAINT "encounters_method_id_encounter_methods_id_fk" FOREIGN KEY ("method_id") REFERENCES "dex"."encounter_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."evolution" ADD CONSTRAINT "evolution_evolved_species_id_species_id_fk" FOREIGN KEY ("evolved_species_id") REFERENCES "dex"."species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."experience" ADD CONSTRAINT "experience_growth_rate_id_growth_rates_id_fk" FOREIGN KEY ("growth_rate_id") REFERENCES "dex"."growth_rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."items" ADD CONSTRAINT "items_category_id_item_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "dex"."item_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."location_areas" ADD CONSTRAINT "location_areas_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "dex"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."location_meta" ADD CONSTRAINT "location_meta_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "dex"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."locations" ADD CONSTRAINT "locations_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "dex"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."moves" ADD CONSTRAINT "moves_type_id_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "dex"."types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."pokemon" ADD CONSTRAINT "pokemon_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "dex"."species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."pokemon_abilities" ADD CONSTRAINT "pokemon_abilities_pokemon_id_pokemon_id_fk" FOREIGN KEY ("pokemon_id") REFERENCES "dex"."pokemon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."pokemon_abilities" ADD CONSTRAINT "pokemon_abilities_ability_id_abilities_id_fk" FOREIGN KEY ("ability_id") REFERENCES "dex"."abilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."pokemon_moves" ADD CONSTRAINT "pokemon_moves_pokemon_id_pokemon_id_fk" FOREIGN KEY ("pokemon_id") REFERENCES "dex"."pokemon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."pokemon_moves" ADD CONSTRAINT "pokemon_moves_move_id_moves_id_fk" FOREIGN KEY ("move_id") REFERENCES "dex"."moves"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."pokemon_types" ADD CONSTRAINT "pokemon_types_pokemon_id_pokemon_id_fk" FOREIGN KEY ("pokemon_id") REFERENCES "dex"."pokemon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."pokemon_types" ADD CONSTRAINT "pokemon_types_type_id_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "dex"."types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."species" ADD CONSTRAINT "species_growth_rate_id_growth_rates_id_fk" FOREIGN KEY ("growth_rate_id") REFERENCES "dex"."growth_rates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."type_efficacy" ADD CONSTRAINT "type_efficacy_damage_type_id_types_id_fk" FOREIGN KEY ("damage_type_id") REFERENCES "dex"."types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dex"."type_efficacy" ADD CONSTRAINT "type_efficacy_target_type_id_types_id_fk" FOREIGN KEY ("target_type_id") REFERENCES "dex"."types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity" ADD CONSTRAINT "activity_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caught_pokemon" ADD CONSTRAINT "caught_pokemon_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caught_pokemon" ADD CONSTRAINT "caught_pokemon_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caught_pokemon" ADD CONSTRAINT "caught_pokemon_pokemon_id_pokemon_id_fk" FOREIGN KEY ("pokemon_id") REFERENCES "dex"."pokemon"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "caught_pokemon" ADD CONSTRAINT "caught_pokemon_caught_location_area_id_location_areas_id_fk" FOREIGN KEY ("caught_location_area_id") REFERENCES "dex"."location_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_pokemon_id_pokemon_id_fk" FOREIGN KEY ("pokemon_id") REFERENCES "dex"."pokemon"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_trainers_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_trainers_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_items" ADD CONSTRAINT "trainer_items_trainer_id_trainers_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_items" ADD CONSTRAINT "trainer_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "dex"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "dex"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainers" ADD CONSTRAINT "trainers_favorite_type_id_types_id_fk" FOREIGN KEY ("favorite_type_id") REFERENCES "dex"."types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "encounters_pokemon_idx" ON "dex"."encounters" USING btree ("pokemon_id");--> statement-breakpoint
CREATE INDEX "encounters_area_idx" ON "dex"."encounters" USING btree ("location_area_id");--> statement-breakpoint
CREATE INDEX "encounters_method_idx" ON "dex"."encounters" USING btree ("method_id");--> statement-breakpoint
CREATE INDEX "evolution_species_idx" ON "dex"."evolution" USING btree ("evolved_species_id");--> statement-breakpoint
CREATE INDEX "experience_lookup_idx" ON "dex"."experience" USING btree ("growth_rate_id","experience");--> statement-breakpoint
CREATE INDEX "items_category_idx" ON "dex"."items" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "location_areas_location_idx" ON "dex"."location_areas" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "locations_region_idx" ON "dex"."locations" USING btree ("region_id");--> statement-breakpoint
CREATE INDEX "moves_type_idx" ON "dex"."moves" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "moves_damage_class_idx" ON "dex"."moves" USING btree ("damage_class");--> statement-breakpoint
CREATE UNIQUE INDEX "pokemon_name_idx" ON "dex"."pokemon" USING btree ("name");--> statement-breakpoint
CREATE INDEX "pokemon_species_idx" ON "dex"."pokemon" USING btree ("species_id");--> statement-breakpoint
CREATE INDEX "pokemon_generation_idx" ON "dex"."pokemon" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "pokemon_total_idx" ON "dex"."pokemon" USING btree ("total");--> statement-breakpoint
CREATE INDEX "pokemon_default_idx" ON "dex"."pokemon" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "pokemon_abilities_ability_idx" ON "dex"."pokemon_abilities" USING btree ("ability_id");--> statement-breakpoint
CREATE INDEX "pokemon_moves_move_idx" ON "dex"."pokemon_moves" USING btree ("move_id");--> statement-breakpoint
CREATE INDEX "pokemon_types_type_idx" ON "dex"."pokemon_types" USING btree ("type_id");--> statement-breakpoint
CREATE INDEX "species_chain_idx" ON "dex"."species" USING btree ("evolution_chain_id");--> statement-breakpoint
CREATE INDEX "species_evolves_from_idx" ON "dex"."species" USING btree ("evolves_from_species_id");--> statement-breakpoint
CREATE INDEX "species_generation_idx" ON "dex"."species" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "activity_trainer_created_idx" ON "activity" USING btree ("trainer_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "caught_trainer_idx" ON "caught_pokemon" USING btree ("trainer_id");--> statement-breakpoint
CREATE INDEX "caught_team_idx" ON "caught_pokemon" USING btree ("team_id");--> statement-breakpoint
CREATE INDEX "caught_pokemon_idx" ON "caught_pokemon" USING btree ("pokemon_id");--> statement-breakpoint
CREATE INDEX "caught_trainer_species_idx" ON "caught_pokemon" USING btree ("trainer_id","pokemon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friendships_pair_idx" ON "friendships" USING btree (least("requester_id", "addressee_id"),greatest("requester_id", "addressee_id"));--> statement-breakpoint
CREATE INDEX "friendships_requester_idx" ON "friendships" USING btree ("requester_id","status");--> statement-breakpoint
CREATE INDEX "friendships_addressee_idx" ON "friendships" USING btree ("addressee_id","status");--> statement-breakpoint
CREATE INDEX "teams_trainer_idx" ON "teams" USING btree ("trainer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_trainer_name_idx" ON "teams" USING btree ("trainer_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "trainers_username_idx" ON "trainers" USING btree ("username");--> statement-breakpoint
CREATE INDEX "trainers_region_idx" ON "trainers" USING btree ("region_id");