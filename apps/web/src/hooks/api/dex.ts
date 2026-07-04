import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  type AbilityDetail,
  type AbilityFilter,
  type AbilitySortField,
  type AbilitySummary,
  type DamageClass,
  type EvolutionChain,
  type EvolutionFilter,
  type EvolutionSearchRow,
  type EvolutionSortField,
  type ItemFilter,
  type ItemSortField,
  type ItemSummary,
  type LocationFilter,
  type LocationSearchRow,
  type LocationSortField,
  type MegaSummary,
  type MoveDetail,
  type MoveFilter,
  type MoveSortField,
  type MoveSummary,
  type Page,
  type PokemonForm,
  type PokemonTypeName,
  type SearchResponse,
  type SortDir,
  type TypeChartCell,
} from '@masterpokedex/shared';
import { apiFetch } from '@/lib/api';
import { useEffect, useState } from 'react';

// ── Moves ──────────────────────────────────────────────────────────────────

export type MoveListParams = {
  q?: string;
  type?: PokemonTypeName;
  damageClass?: DamageClass;
  generation?: number;
  sort?: MoveSortField;
  dir?: SortDir;
  filter?: MoveFilter;
  limit?: number;
};

function moveQuery(params: MoveListParams, cursor?: string): string {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.type) search.set('type', params.type);
  if (params.damageClass) search.set('damageClass', params.damageClass);
  if (params.generation) search.set('generation', String(params.generation));
  if (params.sort) search.set('sort', params.sort);
  if (params.dir) search.set('dir', params.dir);
  if (params.filter && params.filter.conditions.length > 0) {
    search.set('filter', JSON.stringify(params.filter));
  }
  search.set('limit', String(params.limit ?? 60));
  if (cursor) search.set('cursor', cursor);
  return search.toString();
}

export function useMoves(params: MoveListParams = {}, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: ['moves', 'list', params],
    queryFn: ({ pageParam }) => apiFetch<Page<MoveSummary>>(`/v1/moves?${moveQuery(params, pageParam)}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

/** Follows nextCursor until the list is exhausted; for bounded reference sets. */
async function fetchAll<T>(path: string, limit: number): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  do {
    const search = new URLSearchParams({ limit: String(limit) });
    if (cursor) search.set('cursor', cursor);
    const page = await apiFetch<Page<T>>(`${path}?${search.toString()}`);
    all.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return all;
}

/**
 * The whole move dex in one cached query (~919 rows, five requests): the
 * Moves page filters and sorts client-side, pokemondb-style, so header
 * clicks and typing cost no round trip.
 */
export function useAllMoves() {
  return useQuery({
    queryKey: ['moves', 'all'],
    queryFn: () => fetchAll<MoveSummary>('/v1/moves', 200),
    staleTime: Infinity,
  });
}

/**
 * All 541 evolution families in three requests, cached for the session; the
 * Evolutions page filters and sorts them client-side like Moves does.
 */
export function useAllEvolutionChains() {
  return useQuery({
    queryKey: ['evolution-chains', 'all'],
    queryFn: () => fetchAll<EvolutionChain>('/v1/evolution-chains', 200),
    staleTime: Infinity,
  });
}

/** The advanced search's Evolutions entity: one row per evolution edge. */
export function useEvolutionSearch(
  params: { filter?: EvolutionFilter; sort?: EvolutionSortField; dir?: SortDir; limit?: number },
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: ['evolutions', 'search', params],
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams();
      if (params.filter && params.filter.conditions.length > 0) {
        search.set('filter', JSON.stringify(params.filter));
      }
      if (params.sort) search.set('sort', params.sort);
      if (params.dir) search.set('dir', params.dir);
      search.set('limit', String(params.limit ?? 50));
      if (pageParam) search.set('cursor', pageParam);
      return apiFetch<{ items: EvolutionSearchRow[]; nextCursor: string | null }>(
        `/v1/evolutions/search?${search.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

/** Same for abilities (~313 rows, two requests). */
export function useAllAbilities() {
  return useQuery({
    queryKey: ['abilities', 'all'],
    queryFn: () => fetchAll<AbilitySummary>('/v1/abilities', 200),
    staleTime: Infinity,
  });
}

export function useMove(idOrName: string | undefined) {
  return useQuery({
    queryKey: ['moves', 'detail', idOrName],
    queryFn: () => apiFetch<MoveDetail>(`/v1/moves/${idOrName}`),
    enabled: Boolean(idOrName),
  });
}

// ── Abilities ──────────────────────────────────────────────────────────────

export function useAbilities(
  params: { q?: string; sort?: AbilitySortField; dir?: SortDir; filter?: AbilityFilter; limit?: number } = {},
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: ['abilities', 'list', params],
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams();
      if (params.q) search.set('q', params.q);
      if (params.sort) search.set('sort', params.sort);
      if (params.dir) search.set('dir', params.dir);
      if (params.filter && params.filter.conditions.length > 0) {
        search.set('filter', JSON.stringify(params.filter));
      }
      search.set('limit', String(params.limit ?? 60));
      if (pageParam) search.set('cursor', pageParam);
      return apiFetch<Page<AbilitySummary>>(`/v1/abilities?${search.toString()}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useLocationSearch(
  params: { filter?: LocationFilter; sort?: LocationSortField; dir?: SortDir; limit?: number },
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: ['locations', 'search', params],
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams();
      if (params.filter && params.filter.conditions.length > 0) {
        search.set('filter', JSON.stringify(params.filter));
      }
      if (params.sort) search.set('sort', params.sort);
      if (params.dir) search.set('dir', params.dir);
      search.set('limit', String(params.limit ?? 50));
      if (pageParam) search.set('cursor', pageParam);
      return apiFetch<{ items: LocationSearchRow[]; nextCursor: string | null }>(
        `/v1/locations/search?${search.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

export function useAbility(idOrName: string | undefined) {
  return useQuery({
    queryKey: ['abilities', 'detail', idOrName],
    queryFn: () => apiFetch<AbilityDetail>(`/v1/abilities/${idOrName}`),
    enabled: Boolean(idOrName),
  });
}

// ── Type chart / chains / forms / megas ────────────────────────────────────

export function useTypeChart() {
  return useQuery({
    queryKey: ['typechart'],
    queryFn: () => apiFetch<{ items: TypeChartCell[] }>('/v1/typechart'),
    staleTime: Infinity,
  });
}

export function useEvolutionChains(params: { q?: string; limit?: number } = {}) {
  return useInfiniteQuery({
    queryKey: ['evolution-chains', params],
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams();
      if (params.q) search.set('q', params.q);
      search.set('limit', String(params.limit ?? 20));
      if (pageParam) search.set('cursor', pageParam);
      return apiFetch<{ items: EvolutionChain[]; nextCursor: string | null }>(
        `/v1/evolution-chains?${search.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useMegas(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['megas'],
    queryFn: () => apiFetch<{ items: MegaSummary[] }>('/v1/pokemon/megas'),
    staleTime: Infinity,
    enabled: options.enabled ?? true,
  });
}

export function useGmax(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['gmax'],
    queryFn: () => apiFetch<{ items: MegaSummary[] }>('/v1/pokemon/gmax'),
    staleTime: Infinity,
    enabled: options.enabled ?? true,
  });
}

/**
 * `family` widens the request to every species in the evolution chain, which
 * is the only way a Mega or Gigantamax shows up on the stage people actually
 * open — nobody looks for Gigantamax Venusaur on Venusaur's page.
 */
export function usePokemonForms(
  id: number | undefined,
  options: { enabled?: boolean; family?: boolean } = {},
) {
  const family = options.family ?? false;
  return useQuery({
    queryKey: ['pokemon', 'forms', id, family ? 'family' : 'species'],
    queryFn: () =>
      apiFetch<{ items: PokemonForm[] }>(`/v1/pokemon/${id}/forms${family ? '?scope=family' : ''}`),
    enabled: (options.enabled ?? true) && id !== undefined,
  });
}

// ── Items (advanced search) ────────────────────────────────────────────────

export function useItemSearch(
  params: { filter?: ItemFilter; sort?: ItemSortField; dir?: SortDir; limit?: number },
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: ['items', 'search', params],
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams();
      if (params.filter && params.filter.conditions.length > 0) {
        search.set('filter', JSON.stringify(params.filter));
      }
      if (params.sort) search.set('sort', params.sort);
      if (params.dir) search.set('dir', params.dir);
      search.set('limit', String(params.limit ?? 50));
      if (pageParam) search.set('cursor', pageParam);
      return apiFetch<Page<ItemSummary>>(`/v1/items?${search.toString()}`);
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
    placeholderData: keepPreviousData,
  });
}

// ── Omnisearch ─────────────────────────────────────────────────────────────

function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);
  return debounced;
}

/** Debounced cross-entity search behind the header bar and /search page. */
export function useSearch(q: string, limit = 8) {
  const debounced = useDebounced(q.trim(), 200);
  return useQuery({
    queryKey: ['search', debounced, limit],
    queryFn: () =>
      apiFetch<SearchResponse>(`/v1/search?q=${encodeURIComponent(debounced)}&limit=${limit}`),
    enabled: debounced.length >= 1,
    placeholderData: (previous) => previous,
  });
}
