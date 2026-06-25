import { z } from 'zod';

/** The 18 canonical battle types. PokeAPI's `unknown` and `shadow` are excluded. */
export const POKEMON_TYPES = [
  'normal',
  'fighting',
  'flying',
  'poison',
  'ground',
  'rock',
  'bug',
  'ghost',
  'steel',
  'fire',
  'water',
  'grass',
  'electric',
  'psychic',
  'ice',
  'dragon',
  'dark',
  'fairy',
] as const;

export const PokemonTypeSchema = z.enum(POKEMON_TYPES);
export type PokemonTypeName = z.infer<typeof PokemonTypeSchema>;

/**
 * Base stats as columns rather than PokeAPI's array-of-objects. `total` is a
 * generated column in Postgres (`GENERATED ALWAYS AS (...) STORED`), which is
 * what the reference schema's `enforce_total_stats` trigger was reaching for.
 */
export const StatBlockSchema = z.object({
  hp: z.number().int(),
  attack: z.number().int(),
  defense: z.number().int(),
  specialAttack: z.number().int(),
  specialDefense: z.number().int(),
  speed: z.number().int(),
  total: z.number().int(),
});
export type StatBlock = z.infer<typeof StatBlockSchema>;

export const GROWTH_RATES = [
  'slow',
  'medium',
  'fast',
  'medium-slow',
  'slow-then-very-fast',
  'fast-then-very-slow',
] as const;
export const GrowthRateSchema = z.enum(GROWTH_RATES);
export type GrowthRate = z.infer<typeof GrowthRateSchema>;

/**
 * Height is in decimetres and weight in hectograms — the same units PokeAPI
 * uses, so `formatHeight`/`formatWeight` in the web app keep working untouched.
 */
export const PokemonSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  types: z.array(PokemonTypeSchema).min(1).max(2),
  sprite: z.string().url().nullable(),
  artwork: z.string().url().nullable(),
  height: z.number().int().nonnegative(),
  weight: z.number().int().nonnegative(),
  baseExperience: z.number().int().nullable(),
  generation: z.number().int().positive(),
  stats: StatBlockSchema,
  /** Full form name ("Mega Charizard X") — null for a species' default form. */
  formLabel: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
});
export type PokemonSummary = z.infer<typeof PokemonSummarySchema>;

export const PokemonFormSchema = PokemonSummarySchema.extend({
  formLabel: z.string().nullable(),
  isDefault: z.boolean(),
  isMega: z.boolean(),
  isGmax: z.boolean(),
  isRegional: z.boolean(),
});
export type PokemonForm = z.infer<typeof PokemonFormSchema>;

export const MegaSummarySchema = PokemonFormSchema.extend({
  speciesId: z.number().int().positive(),
  baseName: z.string(),
  basePokemonId: z.number().int().positive(),
});
export type MegaSummary = z.infer<typeof MegaSummarySchema>;

export const PokemonAbilitySchema = z.object({
  name: z.string(),
  slot: z.number().int(),
  isHidden: z.boolean(),
  shortEffect: z.string().nullable(),
});
export type PokemonAbility = z.infer<typeof PokemonAbilitySchema>;

export const DAMAGE_CLASSES = ['physical', 'special', 'status'] as const;
export const DamageClassSchema = z.enum(DAMAGE_CLASSES);
export type DamageClass = z.infer<typeof DamageClassSchema>;

export const PokemonMoveSchema = z.object({
  name: z.string(),
  /** The move's identifier, for linking to its page. */
  slug: z.string().optional(),
  type: PokemonTypeSchema,
  damageClass: DamageClassSchema,
  power: z.number().int().nullable(),
  pp: z.number().int().nullable(),
  accuracy: z.number().int().nullable(),
  priority: z.number().int(),
  learnMethod: z.string(),
  levelLearnedAt: z.number().int().nullable(),
});
export type PokemonMove = z.infer<typeof PokemonMoveSchema>;

export const SpeciesInfoSchema = z.object({
  genus: z.string().nullable(),
  description: z.string().nullable(),
  color: z.string().nullable(),
  habitat: z.string().nullable(),
  captureRate: z.number().int().nullable(),
  growthRate: GrowthRateSchema.nullable(),
  isLegendary: z.boolean(),
  isMythical: z.boolean(),
});
export type SpeciesInfo = z.infer<typeof SpeciesInfoSchema>;

/**
 * A flattened evolution chain. The reference implementation used Oracle's
 * `CONNECT BY NOCYCLE PRIOR`; Postgres does this with a recursive CTE.
 * `from` is null for the base form. Branching chains (Eevee) simply produce
 * several nodes sharing the same `from`.
 */
export const EvolutionNodeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  sprite: z.string().url().nullable(),
  artwork: z.string().url().nullable(),
  from: z.number().int().positive().nullable(),
  trigger: z.string().nullable(),
  minLevel: z.number().int().nullable(),
  item: z.string().nullable(),
  heldItem: z.string().nullable(),
  minHappiness: z.number().int().nullable(),
  timeOfDay: z.string().nullable(),
  knownMove: z.string().nullable(),
  depth: z.number().int().nonnegative(),
});
export type EvolutionNode = z.infer<typeof EvolutionNodeSchema>;

/**
 * Derived from the full `type_efficacy` chart (324 rows), not the reference
 * schema's single `weakness`/`resistance` VARCHAR pair. Factors are multipliers
 * after stacking both of a dual-type Pokémon's types: 0, 0.25, 0.5, 2, or 4.
 */
export const MatchupEntrySchema = z.object({
  type: PokemonTypeSchema,
  factor: z.number(),
});

export const MatchupsSchema = z.object({
  weakTo: z.array(MatchupEntrySchema),
  resists: z.array(MatchupEntrySchema),
  immuneTo: z.array(PokemonTypeSchema),
});
export type Matchups = z.infer<typeof MatchupsSchema>;

export const PokemonDetailSchema = PokemonSummarySchema.extend({
  speciesId: z.number().int().positive(),
  species: SpeciesInfoSchema,
  abilities: z.array(PokemonAbilitySchema),
  matchups: MatchupsSchema,
});
export type PokemonDetail = z.infer<typeof PokemonDetailSchema>;

/** One cell of the 18×18 efficacy chart. `factor` is a percentage: 0/50/100/200. */
export const TypeChartCellSchema = z.object({
  attack: PokemonTypeSchema,
  defend: PokemonTypeSchema,
  factor: z.number(),
});
export type TypeChartCell = z.infer<typeof TypeChartCellSchema>;

/**
 * One whole evolution family for the chains index. Nodes carry
 * `evolvesFromSpeciesId` (`from`) so the client lays out the tree the same way
 * the detail page does.
 */
export const EvolutionChainSchema = z.object({
  chainId: z.number().int().positive(),
  nodes: z.array(
    EvolutionNodeSchema.extend({
      types: z.array(PokemonTypeSchema).min(1).max(2),
    }),
  ),
});
export type EvolutionChain = z.infer<typeof EvolutionChainSchema>;

export const TypeInfoSchema = z.object({
  name: PokemonTypeSchema,
  pokemonCount: z.number().int().nonnegative(),
  doubleDamageTo: z.array(PokemonTypeSchema),
  halfDamageTo: z.array(PokemonTypeSchema),
  noDamageTo: z.array(PokemonTypeSchema),
  doubleDamageFrom: z.array(PokemonTypeSchema),
  halfDamageFrom: z.array(PokemonTypeSchema),
  noDamageFrom: z.array(PokemonTypeSchema),
});
export type TypeInfo = z.infer<typeof TypeInfoSchema>;
