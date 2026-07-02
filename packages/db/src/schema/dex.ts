import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgSchema,
  primaryKey,
  real,
  smallint,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * `dex` — reference data imported from PokeAPI's source CSVs. Read-only at
 * runtime: the API has SELECT and nothing else, and every row is replaced
 * wholesale by the ETL in scripts/seed-dex.ts.
 *
 * This is NOT a 1:1 mirror of the CSVs. The ETL flattens the parts that would
 * otherwise be joined on every single request — stats are pivoted into columns,
 * English names/genus/flavour text are folded in, and encounter slots and
 * conditions are collapsed into one row per encounter. The source CSVs stay
 * normalised for a general-purpose API; we shape ours for the reads this app
 * actually performs.
 *
 * It is also emphatically not the reference project's schema. There is no
 * `Pokemon2` keyed on its six stat columns, no `Move1`/`Move2` split, no
 * `Ability1`/`Ability2` — those decompositions existed to satisfy a normal-form
 * exercise and made every query worse.
 */
export const dex = pgSchema('dex');

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';

// ─────────────────────────────────────────────────────────────── types ──

export const types = dex.table('types', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  generationId: smallint('generation_id'),
});

/**
 * The full 324-row damage chart. The reference schema modelled this as two
 * VARCHAR columns on `Type` — a single `weakness` and a single `resistance`
 * per type — which cannot express immunities, quarter-damage, or the fact that
 * most types have several of each.
 */
export const typeEfficacy = dex.table(
  'type_efficacy',
  {
    damageTypeId: integer('damage_type_id')
      .notNull()
      .references(() => types.id),
    targetTypeId: integer('target_type_id')
      .notNull()
      .references(() => types.id),
    damageFactor: smallint('damage_factor').notNull(),
  },
  (t) => [primaryKey({ columns: [t.damageTypeId, t.targetTypeId] })],
);

// ──────────────────────────────────────────────────────── growth rates ──

export const growthRates = dex.table('growth_rates', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
});

/**
 * The level↔experience table straight from the games. This is what replaces
 * the reference project's `enforce_level_calculation` trigger, which
 * reimplemented six growth curves in PL/SQL with `FLOOR(POWER(...))` and then
 * rejected any row whose level did not match its own arithmetic.
 */
export const experience = dex.table(
  'experience',
  {
    growthRateId: integer('growth_rate_id')
      .notNull()
      .references(() => growthRates.id),
    level: smallint('level').notNull(),
    experience: integer('experience').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.growthRateId, t.level] }),
    index('experience_lookup_idx').on(t.growthRateId, t.experience),
  ],
);

// ───────────────────────────────────────────────────────────── species ──

export const species = dex.table(
  'species',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull().unique(),
    displayName: text('display_name'),
    genus: text('genus'),
    description: text('description'),
    generationId: smallint('generation_id').notNull(),
    evolvesFromSpeciesId: integer('evolves_from_species_id'),
    evolutionChainId: integer('evolution_chain_id'),
    color: text('color'),
    habitat: text('habitat'),
    shape: text('shape'),
    genderRate: smallint('gender_rate'),
    captureRate: smallint('capture_rate'),
    baseHappiness: smallint('base_happiness'),
    hatchCounter: smallint('hatch_counter'),
    isBaby: boolean('is_baby').notNull().default(false),
    isLegendary: boolean('is_legendary').notNull().default(false),
    isMythical: boolean('is_mythical').notNull().default(false),
    growthRateId: integer('growth_rate_id').references(() => growthRates.id),
  },
  (t) => [
    index('species_chain_idx').on(t.evolutionChainId),
    index('species_evolves_from_idx').on(t.evolvesFromSpeciesId),
    index('species_generation_idx').on(t.generationId),
  ],
);

// ───────────────────────────────────────────────────────────── pokemon ──

/**
 * Base stats live here as columns rather than six rows in a join table, and
 * `total` is a stored generated column — the database-native version of the
 * reference project's `enforce_total_stats` trigger, which raised
 * ORA-20010 whenever the caller's arithmetic disagreed with its own.
 *
 * `generationId` is denormalised from `species` so the list endpoint can filter
 * and sort by generation without a join on the hottest query in the app.
 *
 * Sprite URLs are generated columns. That couples the schema to the PokeAPI
 * sprite repo layout, which is a deliberate trade: every list query returns
 * rows that are already serialisable, and swapping CDNs is a one-line
 * migration rather than a change to every read path.
 */
export const pokemon = dex.table(
  'pokemon',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull(),
    speciesId: integer('species_id')
      .notNull()
      .references(() => species.id),
    generationId: smallint('generation_id').notNull(),
    height: integer('height').notNull().default(0),
    weight: integer('weight').notNull().default(0),
    baseExperience: integer('base_experience'),
    isDefault: boolean('is_default').notNull().default(true),
    sortOrder: integer('sort_order'),

    // Form metadata from pokemon_forms.csv. `formLabel` is the full English
    // name ("Mega Charizard X", "Alolan Vulpix") and is null for the species'
    // default form, so `formLabel != null` reliably means "this is a form".
    formLabel: text('form_label'),
    isMega: boolean('is_mega').notNull().default(false),
    isGmax: boolean('is_gmax').notNull().default(false),
    isRegional: boolean('is_regional').notNull().default(false),

    hp: smallint('hp').notNull(),
    attack: smallint('attack').notNull(),
    defense: smallint('defense').notNull(),
    specialAttack: smallint('special_attack').notNull(),
    specialDefense: smallint('special_defense').notNull(),
    speed: smallint('speed').notNull(),
    total: integer('total').generatedAlwaysAs(
      sql`hp + attack + defense + special_attack + special_defense + speed`,
    ),

    sprite: text('sprite').generatedAlwaysAs(sql`'${sql.raw(SPRITE_BASE)}/pokemon/' || id || '.png'`),
    artwork: text('artwork').generatedAlwaysAs(
      sql`'${sql.raw(SPRITE_BASE)}/pokemon/other/official-artwork/' || id || '.png'`,
    ),
  },
  (t) => [
    uniqueIndex('pokemon_name_idx').on(t.name),
    index('pokemon_species_idx').on(t.speciesId),
    index('pokemon_generation_idx').on(t.generationId),
    index('pokemon_total_idx').on(t.total),
    index('pokemon_default_idx').on(t.isDefault),
  ],
);

export const pokemonTypes = dex.table(
  'pokemon_types',
  {
    pokemonId: integer('pokemon_id')
      .notNull()
      .references(() => pokemon.id, { onDelete: 'cascade' }),
    typeId: integer('type_id')
      .notNull()
      .references(() => types.id),
    slot: smallint('slot').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.pokemonId, t.typeId] }),
    index('pokemon_types_type_idx').on(t.typeId),
  ],
);

// ─────────────────────────────────────────────────────────── abilities ──

export const abilities = dex.table('abilities', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name'),
  shortEffect: text('short_effect'),
  generationId: smallint('generation_id'),
});

export const pokemonAbilities = dex.table(
  'pokemon_abilities',
  {
    pokemonId: integer('pokemon_id')
      .notNull()
      .references(() => pokemon.id, { onDelete: 'cascade' }),
    abilityId: integer('ability_id')
      .notNull()
      .references(() => abilities.id),
    isHidden: boolean('is_hidden').notNull().default(false),
    slot: smallint('slot').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.pokemonId, t.abilityId] }),
    index('pokemon_abilities_ability_idx').on(t.abilityId),
  ],
);

// ─────────────────────────────────────────────────────────────── moves ──

/**
 * `damageClass` is physical | special | status — the same three values the
 * reference schema stored as `Move2.move_category` and then used for its
 * "Pokémon that can learn every move category" division query.
 */
export const moves = dex.table(
  'moves',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull().unique(),
    displayName: text('display_name'),
    typeId: integer('type_id')
      .notNull()
      .references(() => types.id),
    damageClass: text('damage_class').notNull(),
    power: smallint('power'),
    pp: smallint('pp'),
    accuracy: smallint('accuracy'),
    priority: smallint('priority').notNull().default(0),
    generationId: smallint('generation_id'),
    shortEffect: text('short_effect'),
  },
  (t) => [index('moves_type_idx').on(t.typeId), index('moves_damage_class_idx').on(t.damageClass)],
);

/** Filtered by the ETL to a single (latest) version group to keep this small. */
export const pokemonMoves = dex.table(
  'pokemon_moves',
  {
    pokemonId: integer('pokemon_id')
      .notNull()
      .references(() => pokemon.id, { onDelete: 'cascade' }),
    moveId: integer('move_id')
      .notNull()
      .references(() => moves.id),
    learnMethod: text('learn_method').notNull(),
    level: smallint('level'),
  },
  (t) => [
    primaryKey({ columns: [t.pokemonId, t.moveId, t.learnMethod] }),
    index('pokemon_moves_move_idx').on(t.moveId),
  ],
);

// ─────────────────────────────────────────────────────────── evolution ──

/**
 * A strict superset of the reference project's `EvolutionReq(method, threshold)`:
 * the real games gate evolution on level, item, held item, happiness, time of
 * day, a known move, a location, gender, and more. The chain itself is walked
 * with a recursive CTE, replacing Oracle's `CONNECT BY NOCYCLE PRIOR`.
 *
 * A species has one row per *method*, not one row in total — Leafeon has six,
 * because "level up beside a Mossy Rock" and "use a Leaf Stone" are different
 * games' answers to the same question. Rendering only the first is how the
 * chain used to caption Sylveon as a bare "Level Up"; the read path aggregates
 * them all and the caption builder joins the distinct ones.
 */
export const evolution = dex.table(
  'evolution',
  {
    id: integer('id').primaryKey(),
    evolvedSpeciesId: integer('evolved_species_id')
      .notNull()
      .references(() => species.id, { onDelete: 'cascade' }),
    trigger: text('trigger'),
    minimumLevel: smallint('minimum_level'),
    triggerItem: text('trigger_item'),
    heldItem: text('held_item'),
    knownMove: text('known_move'),
    /** e.g. `fairy` — Sylveon needs a Fairy-type move, not one named move. */
    knownMoveType: text('known_move_type'),
    minimumHappiness: smallint('minimum_happiness'),
    minimumAffection: smallint('minimum_affection'),
    minimumBeauty: smallint('minimum_beauty'),
    timeOfDay: text('time_of_day'),
    gender: text('gender'),
    locationId: integer('location_id'),
    /** The Mossy/Icy Rock rule: a location *feature*, not the place itself. */
    nearSpecialRock: boolean('near_special_rock').notNull().default(false),
    /** Tyrogue: `attack`, `defense` or `equal`. */
    relativePhysicalStats: text('relative_physical_stats'),
    /** Mantyke needs a Remoraid in the party; Karrablast trades for a Shelmet. */
    partySpecies: text('party_species'),
    partyType: text('party_type'),
    tradeSpecies: text('trade_species'),
    needsMultiplayer: boolean('needs_multiplayer').notNull().default(false),
    /** Gen 9's "do a thing N times" evolutions: Annihilape, Kingambit, Pawmot. */
    usedMove: text('used_move'),
    minimumMoveCount: smallint('minimum_move_count'),
    minimumSteps: integer('minimum_steps'),
    minimumDamageTaken: integer('minimum_damage_taken'),
    /** Regional evolutions (Meowth → Perrserker only in Galar). */
    regionId: integer('region_id'),
    needsOverworldRain: boolean('needs_overworld_rain').notNull().default(false),
    turnUpsideDown: boolean('turn_upside_down').notNull().default(false),
  },
  (t) => [index('evolution_species_idx').on(t.evolvedSpeciesId)],
);

// ─────────────────────────────────────────────────────── world / places ──

export const regions = dex.table('regions', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  mapImage: text('map_image'),
});

export const locations = dex.table(
  'locations',
  {
    id: integer('id').primaryKey(),
    regionId: integer('region_id').references(() => regions.id),
    name: text('name').notNull(),
    displayName: text('display_name').notNull(),
  },
  (t) => [index('locations_region_idx').on(t.regionId)],
);

/**
 * Ours, not PokeAPI's. PokeAPI has no coordinates, artwork, or adjacency for
 * locations — the map page cannot exist without this table. Seeded from the
 * hand-placed `{x, y}` values that used to live in the web app's
 * `MOCK_LOCATIONS`, which were the only copy of that data anywhere.
 *
 * `mapX`/`mapY` are percentages (0-100) into the region's map image, so the
 * markers stay correct at any render size.
 */
export const locationMeta = dex.table('location_meta', {
  locationId: integer('location_id')
    .primaryKey()
    .references(() => locations.id, { onDelete: 'cascade' }),
  mapX: real('map_x'),
  mapY: real('map_y'),
  image: text('image'),
  description: text('description'),
  kind: text('kind'),
  neighborIds: integer('neighbor_ids').array().notNull().default(sql`'{}'::integer[]`),
  notableTrainers: text('notable_trainers').array().notNull().default(sql`'{}'::text[]`),
  /**
   * Worth listing beside the region map — somewhere with a Gym, a named
   * resident, or a hand-placed pin. Without it the map's side panel would
   * have to show all 128 of Sinnoh's locations or an arbitrary first ten.
   */
  notable: boolean('notable').notNull().default(false),
});

export const locationAreas = dex.table(
  'location_areas',
  {
    id: integer('id').primaryKey(),
    locationId: integer('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    displayName: text('display_name').notNull(),
  },
  (t) => [index('location_areas_location_idx').on(t.locationId)],
);

export const encounterMethods = dex.table('encounter_methods', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  sortOrder: integer('sort_order'),
});

/**
 * One row per (area, pokémon, method, slot). The ETL pre-joins
 * `encounters` × `encounter_slots` × `encounter_condition_value_map` and
 * aggregates the game versions, so answering "where do I find this Pokémon"
 * is a single indexed scan instead of a four-way join at request time.
 *
 * This is the table the whole "find pokemons / where to find them" feature
 * rests on, and it is the part the reference project only had 12 rows of.
 */
export const encounters = dex.table(
  'encounters',
  {
    id: integer('id').primaryKey(),
    locationAreaId: integer('location_area_id')
      .notNull()
      .references(() => locationAreas.id, { onDelete: 'cascade' }),
    pokemonId: integer('pokemon_id')
      .notNull()
      .references(() => pokemon.id, { onDelete: 'cascade' }),
    methodId: integer('method_id')
      .notNull()
      .references(() => encounterMethods.id),
    slot: smallint('slot'),
    rarity: doublePrecision('rarity').notNull().default(0),
    minLevel: smallint('min_level').notNull(),
    maxLevel: smallint('max_level').notNull(),
    conditions: text('conditions').array().notNull().default(sql`'{}'::text[]`),
    versions: text('versions').array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [
    index('encounters_pokemon_idx').on(t.pokemonId),
    index('encounters_area_idx').on(t.locationAreaId),
    index('encounters_method_idx').on(t.methodId),
  ],
);

// ─────────────────────────────────────────────────────────────── items ──

export const itemCategories = dex.table('item_categories', {
  id: integer('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  pocket: text('pocket'),
});

export const items = dex.table(
  'items',
  {
    id: integer('id').primaryKey(),
    name: text('name').notNull().unique(),
    displayName: text('display_name').notNull(),
    categoryId: integer('category_id')
      .notNull()
      .references(() => itemCategories.id),
    cost: integer('cost'),
    flingPower: smallint('fling_power'),
    shortEffect: text('short_effect'),
    sprite: text('sprite').generatedAlwaysAs(sql`'${sql.raw(SPRITE_BASE)}/items/' || name || '.png'`),
  },
  (t) => [index('items_category_idx').on(t.categoryId)],
);

/**
 * Ours, parsed from Bulbapedia's {{Itemlist}} rows (see
 * scripts/parse-bulbapedia-location-items.mjs): the field items a location
 * holds, with a where-note and a hidden flag. `itemId` is null when the
 * label doesn't resolve to a dex item (event exclusives, odd spellings);
 * the label still renders.
 */
export const locationItems = dex.table(
  'location_items',
  {
    id: integer('id').primaryKey(),
    locationId: integer('location_id')
      .notNull()
      .references(() => locations.id, { onDelete: 'cascade' }),
    itemId: integer('item_id').references(() => items.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    note: text('note'),
    hidden: boolean('hidden').notNull().default(false),
    spots: smallint('spots').notNull().default(1),
  },
  (t) => [
    index('location_items_location_idx').on(t.locationId),
    index('location_items_item_idx').on(t.itemId),
  ],
);
