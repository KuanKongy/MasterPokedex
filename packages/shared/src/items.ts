import { z } from 'zod';
import { SortDirSchema } from './common';
import { NUMBER_OPS, STRING_OPS } from './filters';

/** Mirrors what GET /v1/items has always returned, now as a named contract. */
export const ItemSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  displayName: z.string(),
  category: z.string().nullable(),
  effect: z.string().nullable(),
  sprite: z.string().nullable(),
  cost: z.number().int().nullable(),
});
export type ItemSummary = z.infer<typeof ItemSummarySchema>;

/** One place an item can be picked up, for the item page's Found in list. */
export const ItemLocationSchema = z.object({
  locationId: z.number().int().positive(),
  locationName: z.string(),
  regionName: z.string().nullable(),
  note: z.string().nullable(),
  hidden: z.boolean(),
  spots: z.number().int().positive(),
});
export type ItemLocation = z.infer<typeof ItemLocationSchema>;

/** GET /v1/items/:idOrName — the catalogue row plus everything for a page. */
export const ItemDetailSchema = ItemSummarySchema.extend({
  categoryName: z.string().nullable(),
  pocket: z.string().nullable(),
  flingPower: z.number().int().nullable(),
  locations: z.array(ItemLocationSchema),
});
export type ItemDetail = z.infer<typeof ItemDetailSchema>;

/** A field pickup on a location page: dex-linked when the label resolved. */
export const LocationItemSchema = z.object({
  label: z.string(),
  note: z.string().nullable(),
  hidden: z.boolean(),
  spots: z.number().int().positive(),
  itemName: z.string().nullable(),
  itemDisplayName: z.string().nullable(),
  sprite: z.string().nullable(),
});
export type LocationItem = z.infer<typeof LocationItemSchema>;

// ── Filter grammar (advanced search) ──

const ITEM_STRING_FIELDS = ['name', 'category'] as const;
const ITEM_NUMBER_FIELDS = ['cost', 'flingPower'] as const;

const ItemStringConditionSchema = z.object({
  field: z.enum(ITEM_STRING_FIELDS),
  op: z.enum(STRING_OPS),
  value: z.string().min(1).max(50),
});
const ItemNumberConditionSchema = z.object({
  field: z.enum(ITEM_NUMBER_FIELDS),
  op: z.enum(NUMBER_OPS),
  value: z.number().finite(),
});

export const ItemFilterConditionSchema = z.union([ItemStringConditionSchema, ItemNumberConditionSchema]);
export type ItemFilterCondition = z.infer<typeof ItemFilterConditionSchema>;

export const ItemFilterSchema = z.object({
  match: z.enum(['all', 'any']).default('all'),
  conditions: z.array(ItemFilterConditionSchema).max(10).default([]),
});
export type ItemFilter = z.infer<typeof ItemFilterSchema>;

export const ITEM_FILTER_FIELD_META: ReadonlyArray<{
  field: string;
  label: string;
  kind: 'string' | 'number';
  ops: readonly string[];
}> = [
  { field: 'name', label: 'Name', kind: 'string', ops: STRING_OPS },
  { field: 'category', label: 'Category', kind: 'string', ops: STRING_OPS },
  { field: 'cost', label: 'Cost', kind: 'number', ops: NUMBER_OPS },
  { field: 'flingPower', label: 'Fling power', kind: 'number', ops: NUMBER_OPS },
] as const;

export function decodeItemFilter(raw: string | undefined | null): ItemFilter {
  if (!raw) return { match: 'all', conditions: [] };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('filter must be valid JSON');
  }
  return ItemFilterSchema.parse(parsed);
}

export const ITEM_SORT_FIELDS = ['id', 'name', 'cost', 'category'] as const;
export const ItemSortFieldSchema = z.enum(ITEM_SORT_FIELDS);
export type ItemSortField = z.infer<typeof ItemSortFieldSchema>;

export const ItemListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(200),
  cursor: z.string().min(1).max(512).optional(),
  q: z.string().min(1).max(50).optional(),
  category: z.string().min(1).max(50).optional(),
  sort: ItemSortFieldSchema.default('name'),
  dir: SortDirSchema,
  filter: z.string().max(4096).optional(),
});
export type ItemListQuery = z.infer<typeof ItemListQuerySchema>;
