import { z } from 'zod';
import { SortDirSchema } from './common';
import { ENUM_OPS, NUMBER_OPS, STRING_OPS } from './filters';
import { DamageClassSchema, PokemonTypeSchema } from './pokemon';

/** A move as the index page lists it — one row of `dex.moves`. */
export const MoveSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  type: PokemonTypeSchema,
  damageClass: DamageClassSchema,
  power: z.number().int().nullable(),
  pp: z.number().int().nullable(),
  accuracy: z.number().int().nullable(),
  priority: z.number().int(),
  generation: z.number().int().nullable(),
  shortEffect: z.string().nullable(),
});
export type MoveSummary = z.infer<typeof MoveSummarySchema>;

/** One Pokémon that learns the move, with how it learns it. */
export const MoveLearnerSchema = z.object({
  pokemonId: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  formLabel: z.string().nullable(),
  isDefault: z.boolean(),
  sprite: z.string().nullable(),
  types: z.array(PokemonTypeSchema).min(1).max(2),
  learnMethod: z.string(),
  level: z.number().int().nullable(),
});
export type MoveLearner = z.infer<typeof MoveLearnerSchema>;

export const MoveDetailSchema = MoveSummarySchema.extend({
  learners: z.array(MoveLearnerSchema),
});
export type MoveDetail = z.infer<typeof MoveDetailSchema>;

export const MOVE_SORT_FIELDS = ['id', 'name', 'power', 'pp', 'accuracy', 'priority'] as const;
export const MoveSortFieldSchema = z.enum(MOVE_SORT_FIELDS);
export type MoveSortField = z.infer<typeof MoveSortFieldSchema>;

// ── Filter grammar (advanced search) — same whitelist discipline as pokemon's ──

const MOVE_STRING_FIELDS = ['name'] as const;
const MOVE_NUMBER_FIELDS = ['power', 'pp', 'accuracy', 'priority', 'generation'] as const;

const MoveStringConditionSchema = z.object({
  field: z.enum(MOVE_STRING_FIELDS),
  op: z.enum(STRING_OPS),
  value: z.string().min(1).max(50),
});
const MoveNumberConditionSchema = z.object({
  field: z.enum(MOVE_NUMBER_FIELDS),
  op: z.enum(NUMBER_OPS),
  value: z.number().finite(),
});
const MoveTypeConditionSchema = z.union([
  z.object({ field: z.literal('type'), op: z.enum(['eq', 'neq']), value: PokemonTypeSchema }),
  z.object({ field: z.literal('type'), op: z.literal('in'), value: z.array(PokemonTypeSchema).min(1).max(18) }),
]);
const MoveDamageClassConditionSchema = z.union([
  z.object({ field: z.literal('damageClass'), op: z.enum(['eq', 'neq']), value: DamageClassSchema }),
  z.object({ field: z.literal('damageClass'), op: z.literal('in'), value: z.array(DamageClassSchema).min(1).max(3) }),
]);

export const MoveFilterConditionSchema = z.union([
  MoveStringConditionSchema,
  MoveNumberConditionSchema,
  MoveTypeConditionSchema,
  MoveDamageClassConditionSchema,
]);
export type MoveFilterCondition = z.infer<typeof MoveFilterConditionSchema>;

export const MoveFilterSchema = z.object({
  match: z.enum(['all', 'any']).default('all'),
  conditions: z.array(MoveFilterConditionSchema).max(10).default([]),
});
export type MoveFilter = z.infer<typeof MoveFilterSchema>;

export const MOVE_FILTER_FIELD_META: ReadonlyArray<{
  field: string;
  label: string;
  kind: 'string' | 'number' | 'type' | 'damageClass';
  ops: readonly string[];
}> = [
  { field: 'name', label: 'Name', kind: 'string', ops: STRING_OPS },
  { field: 'type', label: 'Type', kind: 'type', ops: ENUM_OPS },
  { field: 'damageClass', label: 'Class', kind: 'damageClass', ops: ENUM_OPS },
  { field: 'power', label: 'Power', kind: 'number', ops: NUMBER_OPS },
  { field: 'pp', label: 'PP', kind: 'number', ops: NUMBER_OPS },
  { field: 'accuracy', label: 'Accuracy', kind: 'number', ops: NUMBER_OPS },
  { field: 'priority', label: 'Priority', kind: 'number', ops: NUMBER_OPS },
  { field: 'generation', label: 'Generation', kind: 'number', ops: NUMBER_OPS },
] as const;

export function decodeMoveFilter(raw: string | undefined | null): MoveFilter {
  if (!raw) return { match: 'all', conditions: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('filter must be valid JSON');
  }
  return MoveFilterSchema.parse(parsed);
}

export const MoveListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).max(512).optional(),
  q: z.string().min(1).max(50).optional(),
  type: PokemonTypeSchema.optional(),
  damageClass: DamageClassSchema.optional(),
  generation: z.coerce.number().int().min(1).max(9).optional(),
  sort: MoveSortFieldSchema.default('id'),
  dir: SortDirSchema,
  filter: z.string().max(4096).optional(),
});
export type MoveListQuery = z.infer<typeof MoveListQuerySchema>;
