import { z } from 'zod';
import { BOOLEAN_OPS, NUMBER_OPS, STRING_OPS } from './filters';
import { PokemonTypeSchema } from './pokemon';

/**
 * Rarity buckets. PokeAPI stores encounter rarity as a raw percentage; the
 * existing web UI speaks in these five words, so the API derives the bucket
 * server-side and returns both.
 */
export const ENCOUNTER_RARITIES = ['common', 'uncommon', 'rare', 'very-rare', 'legendary', 'unknown'] as const;
export const EncounterRaritySchema = z.enum(ENCOUNTER_RARITIES);
export type EncounterRarity = z.infer<typeof EncounterRaritySchema>;

export function rarityFromChance(chance: number): EncounterRarity {
  if (chance >= 25) return 'common';
  if (chance >= 10) return 'uncommon';
  if (chance >= 5) return 'rare';
  if (chance >= 1) return 'very-rare';
  // PokeAPI rarities are always ≥ 1; a 0 is a Bulbapedia-parsed row whose
  // game publishes no rates (all of Legends: Arceus).
  if (chance === 0) return 'unknown';
  return 'legendary';
}

export const RegionSummarySchema = z.object({
  id: z.number().int().nonnegative(),
  name: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  /** Absolute URL, or a path relative to the web app's public/ (self-hosted art). */
  mapImage: z.string().nullable(),
  locationCount: z.number().int().nonnegative(),
  areaCount: z.number().int().nonnegative().default(0),
  /** Distinct Pokémon with a recorded encounter anywhere in the region. */
  speciesCount: z.number().int().nonnegative().default(0),
});
export type RegionSummary = z.infer<typeof RegionSummarySchema>;

/**
 * `mapX` / `mapY` are percentage offsets (0-100) into the region map image.
 * PokeAPI has no coordinate data at all — these come from `dex.location_meta`,
 * seeded from the hand-placed values that used to live in the web app's
 * `MOCK_LOCATIONS` and expanded from there. Null means "not yet placed".
 */
export const LocationSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  regionId: z.number().int().nonnegative(),
  regionName: z.string(),
  mapX: z.number().min(0).max(100).nullable(),
  mapY: z.number().min(0).max(100).nullable(),
  /** Absolute URL, or a path relative to the web app's public/ (self-hosted art). */
  image: z.string().nullable(),
  description: z.string().nullable(),
  /** Curated flavour: "city", "route", "cave", "forest"… Null when unplaced. */
  kind: z.string().nullable(),
  areaCount: z.number().int().nonnegative(),
  notableTrainers: z.array(z.string()).optional(),
  /** Worth surfacing beside the region map rather than buried in the list. */
  notable: z.boolean().optional(),
});
export type LocationSummary = z.infer<typeof LocationSummarySchema>;

/** One region's slice of the global locations catalog. */
export const LocationCatalogRegionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  locations: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      displayName: z.string(),
      kind: z.string().nullable(),
      areaCount: z.number().int().nonnegative(),
      hasEncounters: z.boolean(),
    }),
  ),
});
export type LocationCatalogRegion = z.infer<typeof LocationCatalogRegionSchema>;

export const AreaEncounterSchema = z.object({
  pokemonId: z.number().int().positive(),
  pokemonName: z.string(),
  sprite: z.string().url().nullable(),
  types: z.array(PokemonTypeSchema),
  method: z.string(),
  chance: z.number(),
  rarity: EncounterRaritySchema,
  minLevel: z.number().int(),
  maxLevel: z.number().int(),
  conditions: z.array(z.string()),
  versions: z.array(z.string()),
});
export type AreaEncounter = z.infer<typeof AreaEncounterSchema>;

export const LocationAreaSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  encounters: z.array(AreaEncounterSchema),
});
export type LocationArea = z.infer<typeof LocationAreaSchema>;

export const LocationDetailSchema = LocationSummarySchema.extend({
  areas: z.array(LocationAreaSchema),
  neighbors: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string(),
      displayName: z.string(),
    }),
  ),
});
export type LocationDetail = z.infer<typeof LocationDetailSchema>;

// ── Location search (advanced search entity) ──

const LOCATION_STRING_FIELDS = ['name', 'region', 'kind'] as const;
const LOCATION_NUMBER_FIELDS = ['areaCount'] as const;
const LOCATION_BOOLEAN_FIELDS = ['hasEncounters'] as const;

const LocationStringConditionSchema = z.object({
  field: z.enum(LOCATION_STRING_FIELDS),
  op: z.enum(STRING_OPS),
  value: z.string().min(1).max(50),
});
const LocationNumberConditionSchema = z.object({
  field: z.enum(LOCATION_NUMBER_FIELDS),
  op: z.enum(NUMBER_OPS),
  value: z.number().finite(),
});
const LocationBooleanConditionSchema = z.object({
  field: z.enum(LOCATION_BOOLEAN_FIELDS),
  op: z.enum(BOOLEAN_OPS),
  value: z.boolean(),
});

export const LocationFilterConditionSchema = z.union([
  LocationStringConditionSchema,
  LocationNumberConditionSchema,
  LocationBooleanConditionSchema,
]);
export type LocationFilterCondition = z.infer<typeof LocationFilterConditionSchema>;

export const LocationFilterSchema = z.object({
  match: z.enum(['all', 'any']).default('all'),
  conditions: z.array(LocationFilterConditionSchema).max(10).default([]),
});
export type LocationFilter = z.infer<typeof LocationFilterSchema>;

export const LOCATION_FILTER_FIELD_META: ReadonlyArray<{
  field: string;
  label: string;
  kind: 'string' | 'number' | 'boolean';
  ops: readonly string[];
}> = [
  { field: 'name', label: 'Name', kind: 'string', ops: STRING_OPS },
  { field: 'region', label: 'Region', kind: 'string', ops: STRING_OPS },
  { field: 'kind', label: 'Kind', kind: 'string', ops: STRING_OPS },
  { field: 'areaCount', label: 'Areas', kind: 'number', ops: NUMBER_OPS },
  { field: 'hasEncounters', label: 'Has encounters', kind: 'boolean', ops: BOOLEAN_OPS },
] as const;

export function decodeLocationFilter(raw: string | undefined | null): LocationFilter {
  if (!raw) return { match: 'all', conditions: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('filter must be valid JSON');
  }
  return LocationFilterSchema.parse(parsed);
}

/** One flat row of GET /v1/locations/search. */
export const LocationSearchRowSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  regionName: z.string().nullable(),
  kind: z.string().nullable(),
  areaCount: z.number().int().nonnegative(),
  hasEncounters: z.boolean(),
});
export type LocationSearchRow = z.infer<typeof LocationSearchRowSchema>;

/** The inverse view: given a Pokémon, everywhere in the world it can be found. */
export const PokemonEncounterSchema = z.object({
  regionId: z.number().int().positive(),
  regionName: z.string(),
  locationId: z.number().int().positive(),
  locationName: z.string(),
  locationDisplayName: z.string(),
  areaId: z.number().int().positive(),
  areaDisplayName: z.string(),
  method: z.string(),
  chance: z.number(),
  rarity: EncounterRaritySchema,
  minLevel: z.number().int(),
  maxLevel: z.number().int(),
  conditions: z.array(z.string()),
  versions: z.array(z.string()),
});
export type PokemonEncounter = z.infer<typeof PokemonEncounterSchema>;
