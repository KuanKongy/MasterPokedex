import { z } from 'zod';
import { SortDirSchema } from './common';
import { NUMBER_OPS, STRING_OPS } from './filters';
import { PokemonTypeSchema } from './pokemon';

export const AbilitySummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  shortEffect: z.string().nullable(),
  generation: z.number().int().nullable(),
  pokemonCount: z.number().int().nonnegative(),
});
export type AbilitySummary = z.infer<typeof AbilitySummarySchema>;

/** One Pokémon that can have the ability. */
export const AbilityPokemonSchema = z.object({
  pokemonId: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  formLabel: z.string().nullable(),
  isDefault: z.boolean(),
  sprite: z.string().nullable(),
  types: z.array(PokemonTypeSchema).min(1).max(2),
  isHidden: z.boolean(),
  slot: z.number().int(),
});
export type AbilityPokemon = z.infer<typeof AbilityPokemonSchema>;

export const AbilityDetailSchema = AbilitySummarySchema.extend({
  pokemon: z.array(AbilityPokemonSchema),
});
export type AbilityDetail = z.infer<typeof AbilityDetailSchema>;

// ── Filter grammar (advanced search) ──

const ABILITY_STRING_FIELDS = ['name'] as const;
const ABILITY_NUMBER_FIELDS = ['generation', 'pokemonCount'] as const;

const AbilityStringConditionSchema = z.object({
  field: z.enum(ABILITY_STRING_FIELDS),
  op: z.enum(STRING_OPS),
  value: z.string().min(1).max(50),
});
const AbilityNumberConditionSchema = z.object({
  field: z.enum(ABILITY_NUMBER_FIELDS),
  op: z.enum(NUMBER_OPS),
  value: z.number().finite(),
});

export const AbilityFilterConditionSchema = z.union([AbilityStringConditionSchema, AbilityNumberConditionSchema]);
export type AbilityFilterCondition = z.infer<typeof AbilityFilterConditionSchema>;

export const AbilityFilterSchema = z.object({
  match: z.enum(['all', 'any']).default('all'),
  conditions: z.array(AbilityFilterConditionSchema).max(10).default([]),
});
export type AbilityFilter = z.infer<typeof AbilityFilterSchema>;

export const ABILITY_FILTER_FIELD_META: ReadonlyArray<{
  field: string;
  label: string;
  kind: 'string' | 'number';
  ops: readonly string[];
}> = [
  { field: 'name', label: 'Name', kind: 'string', ops: STRING_OPS },
  { field: 'generation', label: 'Generation', kind: 'number', ops: NUMBER_OPS },
  { field: 'pokemonCount', label: 'Pokémon with it', kind: 'number', ops: NUMBER_OPS },
] as const;

export function decodeAbilityFilter(raw: string | undefined | null): AbilityFilter {
  if (!raw) return { match: 'all', conditions: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('filter must be valid JSON');
  }
  return AbilityFilterSchema.parse(parsed);
}

export const AbilityListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).max(512).optional(),
  q: z.string().min(1).max(50).optional(),
  sort: z.enum(['id', 'name']).default('id'),
  dir: SortDirSchema,
  filter: z.string().max(4096).optional(),
});
export type AbilityListQuery = z.infer<typeof AbilityListQuerySchema>;
