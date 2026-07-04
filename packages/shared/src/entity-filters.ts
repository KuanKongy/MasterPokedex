/**
 * The advanced-search page's entity registry. Each entry drives the condition
 * builder for one searchable entity; the server keeps a matching
 * `*_FILTER_COLUMNS` map per entity and throws when the two drift.
 *
 * Lives in its own module (rather than filters.ts) so the per-entity grammars
 * can import the shared op lists from filters.ts without a cycle.
 */
import { ABILITY_FILTER_FIELD_META, decodeAbilityFilter } from './abilities';
import { EVOLUTION_FILTER_FIELD_META, decodeEvolutionFilter } from './evolutions';
import { FILTER_FIELD_META, decodeFilter } from './filters';
import { ITEM_FILTER_FIELD_META, decodeItemFilter } from './items';
import { LOCATION_FILTER_FIELD_META, decodeLocationFilter } from './location';
import { MOVE_FILTER_FIELD_META, decodeMoveFilter } from './moves';

export const FILTER_ENTITIES = ['pokemon', 'move', 'ability', 'item', 'location', 'evolution'] as const;
export type FilterEntity = (typeof FILTER_ENTITIES)[number];

export const ENTITY_FILTER_META = {
  pokemon: FILTER_FIELD_META,
  move: MOVE_FILTER_FIELD_META,
  ability: ABILITY_FILTER_FIELD_META,
  item: ITEM_FILTER_FIELD_META,
  location: LOCATION_FILTER_FIELD_META,
  evolution: EVOLUTION_FILTER_FIELD_META,
} as const;

/**
 * One generic shape covers every entity's decoded filter: the conditions are
 * flat {field, op, value} rows, which is all the condition builder needs to
 * rebuild its drafts from a URL.
 */
export type DecodedEntityFilter = {
  match: 'all' | 'any';
  conditions: Array<{ field: string; op: string; value: unknown }>;
};

/**
 * The strict per-entity decoders behind one loosely-typed door, so a page can
 * round-trip ?filter= for whichever entity is active. Each one throws on
 * malformed input; callers treat that as "no filter".
 */
export const ENTITY_FILTER_DECODERS: Record<
  FilterEntity,
  (raw: string | undefined | null) => DecodedEntityFilter
> = {
  pokemon: decodeFilter as (raw: string | undefined | null) => DecodedEntityFilter,
  move: decodeMoveFilter as (raw: string | undefined | null) => DecodedEntityFilter,
  ability: decodeAbilityFilter as (raw: string | undefined | null) => DecodedEntityFilter,
  item: decodeItemFilter as (raw: string | undefined | null) => DecodedEntityFilter,
  location: decodeLocationFilter as (raw: string | undefined | null) => DecodedEntityFilter,
  evolution: decodeEvolutionFilter as (raw: string | undefined | null) => DecodedEntityFilter,
};

export const ENTITY_LABELS: Record<FilterEntity, string> = {
  pokemon: 'Pokémon',
  move: 'Moves',
  ability: 'Abilities',
  item: 'Items',
  location: 'Locations',
  evolution: 'Evolutions',
};
