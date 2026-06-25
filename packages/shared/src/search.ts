import { z } from 'zod';

/**
 * Cross-entity search. One flat, kind-tagged list — the client groups by
 * `kind`. `image` is a sprite URL where the entity has one; `detail` is a
 * one-line qualifier (types, region, category, effect) for the dropdown row.
 */
export const SEARCH_KINDS = ['pokemon', 'move', 'ability', 'item', 'location', 'type'] as const;
export const SearchKindSchema = z.enum(SEARCH_KINDS);
export type SearchKind = z.infer<typeof SearchKindSchema>;

export const SearchResultSchema = z.object({
  kind: SearchKindSchema,
  id: z.number().int(),
  name: z.string(),
  displayName: z.string(),
  image: z.string().nullable(),
  detail: z.string().nullable(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SearchResponseSchema = z.object({
  query: z.string(),
  items: z.array(SearchResultSchema),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

export const SearchQuerySchema = z.object({
  q: z.string().min(1).max(50),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
