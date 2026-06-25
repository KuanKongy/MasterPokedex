/**
 * The advanced-search page's entity registry. Each entry drives the condition
 * builder for one searchable entity; the server keeps a matching
 * `*_FILTER_COLUMNS` map per entity and throws when the two drift.
 *
 * Lives in its own module (rather than filters.ts) so the per-entity grammars
 * can import the shared op lists from filters.ts without a cycle.
 */
import { FILTER_FIELD_META } from './filters';
import { ITEM_FILTER_FIELD_META } from './items';
import { MOVE_FILTER_FIELD_META } from './moves';

export const FILTER_ENTITIES = ['pokemon', 'move', 'item'] as const;
export type FilterEntity = (typeof FILTER_ENTITIES)[number];

export const ENTITY_FILTER_META = {
  pokemon: FILTER_FIELD_META,
  move: MOVE_FILTER_FIELD_META,
  item: ITEM_FILTER_FIELD_META,
} as const;

export const ENTITY_LABELS: Record<FilterEntity, string> = {
  pokemon: 'Pokémon',
  move: 'Moves',
  item: 'Items',
};
