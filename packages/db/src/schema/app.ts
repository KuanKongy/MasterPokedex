import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { items, locationAreas, pokemon, regions, types } from './dex';

/**
 * `public` — everything the app owns and mutates. RLS is enabled on every table
 * here (see migrations/*_rls.sql). The API is the authorization boundary and
 * connects with a role that bypasses RLS, so the policies are defence in depth
 * for anything that ever reaches Postgres by another path.
 */

export const trainerRank = pgEnum('trainer_rank', [
  'rookie',
  'trainer',
  'ace',
  'veteran',
  'elite',
  'champion',
]);

export const teamCategory = pgEnum('team_category', ['party', 'box', 'showcase']);

export const friendshipStatus = pgEnum('friendship_status', ['pending', 'accepted', 'blocked']);

export const pokemonGender = pgEnum('pokemon_gender', ['male', 'female', 'genderless']);

export const activityKind = pgEnum('activity_kind', [
  'caught',
  'team_created',
  'friend_added',
  'badge_earned',
  'shiny_caught',
]);

/**
 * `id` mirrors `auth.users.id`. The foreign key to `auth.users` is added in a
 * hand-written migration because drizzle-kit does not manage the `auth` schema
 * (see `schemaFilter` in drizzle.config.ts).
 *
 * `username` is plain text rather than `citext`: the shared Zod schema already
 * constrains it to `^[a-z0-9_]+$`, so it is lowercase by construction, and the
 * CHECK below makes that a database guarantee rather than a convention. Avoids
 * an extension and keeps the unique index a straight b-tree.
 */
export const trainers = pgTable(
  'trainers',
  {
    id: uuid('id').primaryKey(),
    username: text('username').notNull(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    regionId: integer('region_id').references(() => regions.id),
    favoriteTypeId: integer('favorite_type_id').references(() => types.id),
    rank: trainerRank('rank').notNull().default('rookie'),
    badges: smallint('badges').notNull().default(0),
    isPublic: boolean('is_public').notNull().default(true),
    isGuest: boolean('is_guest').notNull().default(false),
    // Per-section visibility on the public profile; is_public still gates the
    // whole profile, these only trim what a permitted viewer gets to see.
    showBag: boolean('show_bag').notNull().default(true),
    showFavorites: boolean('show_favorites').notNull().default(true),
    showActivity: boolean('show_activity').notNull().default(true),
    showFriends: boolean('show_friends').notNull().default(true),
    showTeams: boolean('show_teams').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('trainers_username_idx').on(t.username),
    index('trainers_region_idx').on(t.regionId),
    check('trainers_username_lowercase', sql`${t.username} = lower(${t.username})`),
    check('trainers_username_format', sql`${t.username} ~ '^[a-z0-9_]{3,20}$'`),
    check('trainers_badges_range', sql`${t.badges} between 0 and 64`),
  ],
);

/**
 * Carries the capacity that the reference schema kept in
 * `Collection2.collection_size` and enforced with its `check_team_size` trigger.
 * Kept as a table rather than a hardcoded constant so capacities are data.
 */
export const teamCategories = pgTable('team_categories', {
  slug: teamCategory('slug').primaryKey(),
  label: text('label').notNull(),
  capacity: smallint('capacity').notNull(),
});

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    category: teamCategory('category').notNull().default('box'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('teams_trainer_idx').on(t.trainerId),
    uniqueIndex('teams_trainer_name_idx').on(t.trainerId, t.name),
  ],
);

/**
 * An owned Pokémon. Replaces `TrainerPokemon1`/`TrainerPokemon2`, whose primary
 * key was `pokedex_id` — meaning the entire database could hold exactly one
 * Bulbasaur, across all trainers. A surrogate id fixes that, and it is also why
 * the reference's `unique_pokemon_per_collection` trigger is deliberately not
 * reproduced: owning two Pikachu is normal, and nicknames make them distinct.
 *
 * `level` is maintained by a trigger from `experience` + the species growth
 * rate (see migrations/*_triggers.sql); clients send experience, never level.
 */
export const caughtPokemon = pgTable(
  'caught_pokemon',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    pokemonId: integer('pokemon_id')
      .notNull()
      .references(() => pokemon.id),
    nickname: text('nickname'),
    level: smallint('level').notNull().default(1),
    experience: integer('experience').notNull().default(0),
    isShiny: boolean('is_shiny').notNull().default(false),
    gender: pokemonGender('gender'),
    heightCm: real('height_cm'),
    weightKg: real('weight_kg'),
    caughtAt: timestamp('caught_at', { withTimezone: true }).notNull().defaultNow(),
    caughtLocationAreaId: integer('caught_location_area_id').references(() => locationAreas.id),
    notes: text('notes'),
  },
  (t) => [
    index('caught_trainer_idx').on(t.trainerId),
    index('caught_team_idx').on(t.teamId),
    index('caught_pokemon_idx').on(t.pokemonId),
    index('caught_trainer_species_idx').on(t.trainerId, t.pokemonId),
    check('caught_level_range', sql`${t.level} between 1 and 100`),
    check('caught_experience_nonneg', sql`${t.experience} >= 0`),
  ],
);

/**
 * The reference's `hasItem` was a bare (trainer, item) pair with no quantity,
 * even though its own frontend rendered counts. Quantity belongs here.
 */
export const trainerItems = pgTable(
  'trainer_items',
  {
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id),
    quantity: integer('quantity').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.trainerId, t.itemId] }),
    check('trainer_items_quantity_nonneg', sql`${t.quantity} >= 0`),
  ],
);

/**
 * One row per relationship, always stored requester → addressee. A partial
 * unique index on the unordered pair prevents A→B and B→A both existing, which
 * is the bug every naive friendship table ships with.
 */
export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'cascade' }),
    status: friendshipStatus('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (t) => [
    uniqueIndex('friendships_pair_idx').on(
      sql`least(${t.requesterId}, ${t.addresseeId})`,
      sql`greatest(${t.requesterId}, ${t.addresseeId})`,
    ),
    index('friendships_requester_idx').on(t.requesterId, t.status),
    index('friendships_addressee_idx').on(t.addresseeId, t.status),
    check('friendships_no_self', sql`${t.requesterId} <> ${t.addresseeId}`),
  ],
);

export const favorites = pgTable(
  'favorites',
  {
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'cascade' }),
    pokemonId: integer('pokemon_id')
      .notNull()
      .references(() => pokemon.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.trainerId, t.pokemonId] })],
);

export const activity = pgTable(
  'activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trainerId: uuid('trainer_id')
      .notNull()
      .references(() => trainers.id, { onDelete: 'cascade' }),
    kind: activityKind('kind').notNull(),
    payload: jsonb('payload').notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('activity_trainer_created_idx').on(t.trainerId, t.createdAt.desc())],
);
