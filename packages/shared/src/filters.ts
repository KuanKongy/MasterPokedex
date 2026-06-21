import { z } from 'zod';
import { PokemonTypeSchema, GrowthRateSchema } from './pokemon';

/**
 * A whitelisted filter grammar for `GET /v1/pokemon`.
 *
 * The reference backend built its WHERE clause by interpolating the caller's
 * `attribute` and `operator` strings straight into SQL:
 *
 *     whereClauses.push(`${attribute} ${operator} :${paramName}`)
 *
 * — so `attribute` was a wide-open SQL injection point (only the *value* was
 * ever bound). Here `field` and `op` are Zod enums, so nothing outside this
 * file can ever reach an identifier or operator position. The API maps a
 * validated `field` to a real column through a server-side lookup table; no
 * request string is ever concatenated into SQL.
 */

const STRING_FIELDS = ['name', 'color', 'habitat'] as const;
const NUMBER_FIELDS = [
  'generation',
  'hp',
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
  'total',
  'height',
  'weight',
  'baseExperience',
  'captureRate',
] as const;
const BOOLEAN_FIELDS = ['isLegendary', 'isMythical'] as const;

export const STRING_OPS = ['eq', 'neq', 'contains', 'startsWith', 'endsWith'] as const;
export const NUMBER_OPS = ['eq', 'neq', 'gt', 'gte', 'lt', 'lte'] as const;
export const BOOLEAN_OPS = ['eq'] as const;
export const ENUM_OPS = ['eq', 'neq', 'in'] as const;

const StringConditionSchema = z.object({
  field: z.enum(STRING_FIELDS),
  op: z.enum(STRING_OPS),
  value: z.string().min(1).max(50),
});

const NumberConditionSchema = z.object({
  field: z.enum(NUMBER_FIELDS),
  op: z.enum(NUMBER_OPS),
  value: z.number().finite(),
});

const BooleanConditionSchema = z.object({
  field: z.enum(BOOLEAN_FIELDS),
  op: z.enum(BOOLEAN_OPS),
  value: z.boolean(),
});

const TypeConditionSchema = z.union([
  z.object({ field: z.literal('type'), op: z.enum(['eq', 'neq']), value: PokemonTypeSchema }),
  z.object({ field: z.literal('type'), op: z.literal('in'), value: z.array(PokemonTypeSchema).min(1).max(18) }),
]);

const GrowthRateConditionSchema = z.union([
  z.object({ field: z.literal('growthRate'), op: z.enum(['eq', 'neq']), value: GrowthRateSchema }),
  z.object({ field: z.literal('growthRate'), op: z.literal('in'), value: z.array(GrowthRateSchema).min(1).max(6) }),
]);

export const PokemonFilterConditionSchema = z.union([
  StringConditionSchema,
  NumberConditionSchema,
  BooleanConditionSchema,
  TypeConditionSchema,
  GrowthRateConditionSchema,
]);
export type PokemonFilterCondition = z.infer<typeof PokemonFilterConditionSchema>;

/**
 * `match` replaces the reference UI's per-condition AND/OR connectors. Mixing
 * connectors without parentheses is ambiguous — `a AND b OR c` depends on
 * precedence the user never specified — so the API takes an unambiguous
 * all-of / any-of instead.
 */
export const PokemonFilterSchema = z.object({
  match: z.enum(['all', 'any']).default('all'),
  conditions: z.array(PokemonFilterConditionSchema).max(10).default([]),
});
export type PokemonFilter = z.infer<typeof PokemonFilterSchema>;

export const POKEMON_SORT_FIELDS = [
  'id',
  'name',
  'total',
  'hp',
  'attack',
  'defense',
  'specialAttack',
  'specialDefense',
  'speed',
  'height',
  'weight',
  'baseExperience',
] as const;
export const PokemonSortFieldSchema = z.enum(POKEMON_SORT_FIELDS);
export type PokemonSortField = z.infer<typeof PokemonSortFieldSchema>;

/** Field metadata for building the filter UI without duplicating the whitelist. */
export type FilterFieldKind = 'string' | 'number' | 'boolean' | 'type' | 'growthRate';

export const FILTER_FIELD_META: ReadonlyArray<{
  field: string;
  label: string;
  kind: FilterFieldKind;
  ops: readonly string[];
}> = [
  { field: 'name', label: 'Name', kind: 'string', ops: STRING_OPS },
  { field: 'type', label: 'Type', kind: 'type', ops: ENUM_OPS },
  { field: 'generation', label: 'Generation', kind: 'number', ops: NUMBER_OPS },
  { field: 'total', label: 'Base stat total', kind: 'number', ops: NUMBER_OPS },
  { field: 'hp', label: 'HP', kind: 'number', ops: NUMBER_OPS },
  { field: 'attack', label: 'Attack', kind: 'number', ops: NUMBER_OPS },
  { field: 'defense', label: 'Defense', kind: 'number', ops: NUMBER_OPS },
  { field: 'specialAttack', label: 'Sp. Attack', kind: 'number', ops: NUMBER_OPS },
  { field: 'specialDefense', label: 'Sp. Defense', kind: 'number', ops: NUMBER_OPS },
  { field: 'speed', label: 'Speed', kind: 'number', ops: NUMBER_OPS },
  { field: 'height', label: 'Height', kind: 'number', ops: NUMBER_OPS },
  { field: 'weight', label: 'Weight', kind: 'number', ops: NUMBER_OPS },
  { field: 'baseExperience', label: 'Base experience', kind: 'number', ops: NUMBER_OPS },
  { field: 'captureRate', label: 'Capture rate', kind: 'number', ops: NUMBER_OPS },
  { field: 'growthRate', label: 'Growth rate', kind: 'growthRate', ops: ENUM_OPS },
  { field: 'color', label: 'Colour', kind: 'string', ops: STRING_OPS },
  { field: 'habitat', label: 'Habitat', kind: 'string', ops: STRING_OPS },
  { field: 'isLegendary', label: 'Legendary', kind: 'boolean', ops: BOOLEAN_OPS },
  { field: 'isMythical', label: 'Mythical', kind: 'boolean', ops: BOOLEAN_OPS },
] as const;

/**
 * The filter travels as a JSON string in a query parameter so `GET /v1/pokemon`
 * stays cacheable and bookmarkable. Both sides share these helpers so the
 * encoding can never drift.
 */
export function encodeFilter(filter: PokemonFilter): string {
  return JSON.stringify(filter);
}

export function decodeFilter(raw: string | undefined | null): PokemonFilter {
  if (!raw) return { match: 'all', conditions: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('filter must be valid JSON');
  }
  return PokemonFilterSchema.parse(parsed);
}

export const PokemonListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).max(512).optional(),
  q: z.string().min(1).max(50).optional(),
  type: PokemonTypeSchema.optional(),
  generation: z.coerce.number().int().min(1).max(9).optional(),
  sort: PokemonSortFieldSchema.default('id'),
  dir: z.enum(['asc', 'desc']).default('asc'),
  filter: z.string().max(4096).optional(),
});
export type PokemonListQuery = z.infer<typeof PokemonListQuerySchema>;
