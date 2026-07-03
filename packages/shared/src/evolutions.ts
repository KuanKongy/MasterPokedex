import { z } from 'zod';
import { BOOLEAN_OPS, NUMBER_OPS, STRING_OPS } from './filters';

/**
 * The advanced search's Evolutions entity: one row per evolution edge (a
 * `dex.evolution` row), because trigger, item, level and friendship are
 * per-edge facts — a family can mix all of them, so per-chain rows would
 * answer the wrong question.
 */

export const EVOLUTION_TRIGGERS = [
  'level-up',
  'trade',
  'use-item',
  'shed',
  'spin',
  'tower-of-darkness',
  'tower-of-waters',
  'three-critical-hits',
  'take-damage',
  'other',
  'agile-style-move',
  'strong-style-move',
  'recoil-damage',
  'use-move',
  'three-defeated-bisharp',
  'gimmighoul-coins',
] as const;
export const EvolutionTriggerSchema = z.enum(EVOLUTION_TRIGGERS);
export type EvolutionTrigger = z.infer<typeof EvolutionTriggerSchema>;

const EVOLUTION_STRING_FIELDS = ['pokemon', 'from', 'item', 'heldItem', 'timeOfDay'] as const;
const EVOLUTION_NUMBER_FIELDS = ['minLevel', 'minHappiness'] as const;
const EVOLUTION_BOOLEAN_FIELDS = ['needsFriendship'] as const;

const EvolutionStringConditionSchema = z.object({
  field: z.enum(EVOLUTION_STRING_FIELDS),
  op: z.enum(STRING_OPS),
  value: z.string().min(1).max(50),
});
const EvolutionNumberConditionSchema = z.object({
  field: z.enum(EVOLUTION_NUMBER_FIELDS),
  op: z.enum(NUMBER_OPS),
  value: z.number().finite(),
});
const EvolutionBooleanConditionSchema = z.object({
  field: z.enum(EVOLUTION_BOOLEAN_FIELDS),
  op: z.enum(BOOLEAN_OPS),
  value: z.boolean(),
});
const EvolutionTriggerConditionSchema = z.object({
  field: z.literal('trigger'),
  op: z.enum(['eq', 'neq'] as const),
  value: EvolutionTriggerSchema,
});

export const EvolutionFilterConditionSchema = z.union([
  EvolutionStringConditionSchema,
  EvolutionNumberConditionSchema,
  EvolutionBooleanConditionSchema,
  EvolutionTriggerConditionSchema,
]);
export type EvolutionFilterCondition = z.infer<typeof EvolutionFilterConditionSchema>;

export const EvolutionFilterSchema = z.object({
  match: z.enum(['all', 'any']).default('all'),
  conditions: z.array(EvolutionFilterConditionSchema).max(10).default([]),
});
export type EvolutionFilter = z.infer<typeof EvolutionFilterSchema>;

export const EVOLUTION_FILTER_FIELD_META: ReadonlyArray<{
  field: string;
  label: string;
  kind: string;
  ops: readonly string[];
}> = [
  { field: 'pokemon', label: 'Evolves into', kind: 'string', ops: STRING_OPS },
  { field: 'from', label: 'Evolves from', kind: 'string', ops: STRING_OPS },
  { field: 'trigger', label: 'Trigger', kind: 'evolutionTrigger', ops: ['eq', 'neq'] as const },
  { field: 'item', label: 'Evolution item', kind: 'string', ops: STRING_OPS },
  { field: 'heldItem', label: 'Held item', kind: 'string', ops: STRING_OPS },
  { field: 'timeOfDay', label: 'Time of day', kind: 'string', ops: STRING_OPS },
  { field: 'minLevel', label: 'Minimum level', kind: 'number', ops: NUMBER_OPS },
  { field: 'minHappiness', label: 'Minimum friendship', kind: 'number', ops: NUMBER_OPS },
  { field: 'needsFriendship', label: 'Needs friendship', kind: 'boolean', ops: BOOLEAN_OPS },
] as const;

export function decodeEvolutionFilter(raw: string | undefined | null): EvolutionFilter {
  if (!raw) return { match: 'all', conditions: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('filter must be valid JSON');
  }
  return EvolutionFilterSchema.parse(parsed);
}

export const EvolutionSearchRowSchema = z.object({
  id: z.number().int().positive(),
  chainId: z.number().int().positive().nullable(),
  fromId: z.number().int().positive().nullable(),
  fromName: z.string().nullable(),
  toId: z.number().int().positive(),
  toName: z.string(),
  sprite: z.string().nullable(),
  trigger: z.string().nullable(),
  item: z.string().nullable(),
  heldItem: z.string().nullable(),
  minLevel: z.number().int().nullable(),
  minHappiness: z.number().int().nullable(),
  timeOfDay: z.string().nullable(),
});
export type EvolutionSearchRow = z.infer<typeof EvolutionSearchRowSchema>;
