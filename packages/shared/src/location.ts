import { z } from 'zod';
import { PokemonTypeSchema } from './pokemon';

/**
 * Rarity buckets. PokeAPI stores encounter rarity as a raw percentage; the
 * existing web UI speaks in these five words, so the API derives the bucket
 * server-side and returns both.
 */
export const ENCOUNTER_RARITIES = ['common', 'uncommon', 'rare', 'very-rare', 'legendary'] as const;
export const EncounterRaritySchema = z.enum(ENCOUNTER_RARITIES);
export type EncounterRarity = z.infer<typeof EncounterRaritySchema>;

export function rarityFromChance(chance: number): EncounterRarity {
  if (chance >= 25) return 'common';
  if (chance >= 10) return 'uncommon';
  if (chance >= 5) return 'rare';
  if (chance >= 1) return 'very-rare';
  return 'legendary';
}

export const RegionSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  /** Absolute URL, or a path relative to the web app's public/ (self-hosted art). */
  mapImage: z.string().nullable(),
  locationCount: z.number().int().nonnegative(),
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
  regionId: z.number().int().positive(),
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
