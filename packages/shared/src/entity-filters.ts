/**
 * The advanced-search page's entity registry. Each entry drives the condition
 * builder for one searchable entity; the server keeps a matching
 * `*_FILTER_COLUMNS` map per entity and throws when the two drift.
 *
 * Lives in its own module (rather than filters.ts) so the per-entity grammars
 * can import the shared op lists from filters.ts without a cycle.
 */
import { ABILITY_FILTER_FIELD_META } from './abilities';
import { EVOLUTION_FILTER_FIELD_META } from './evolutions';
import { FILTER_FIELD_META } from './filters';
import { ITEM_FILTER_FIELD_META } from './items';
import { LOCATION_FILTER_FIELD_META } from './location';
import { MOVE_FILTER_FIELD_META } from './moves';

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

export const ENTITY_LABELS: Record<FilterEntity, string> = {
  pokemon: 'Pokémon',
  move: 'Moves',
  ability: 'Abilities',
  item: 'Items',
  location: 'Locations',
  evolution: 'Evolutions',
};
