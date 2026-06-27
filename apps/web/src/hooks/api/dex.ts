import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  type AbilityDetail,
  type AbilityFilter,
  type AbilitySummary,
  type DamageClass,
  type EvolutionChain,
  type ItemFilter,
  type ItemSummary,
  type LocationFilter,
  type LocationSearchRow,
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
  params: { q?: string; sort?: 'id' | 'name'; dir?: SortDir; filter?: AbilityFilter; limit?: number } = {},
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
  });
}

export function useLocationSearch(
  params: { filter?: LocationFilter; limit?: number },
  options: { enabled?: boolean } = {},
) {
  return useInfiniteQuery({
    queryKey: ['locations', 'search', params],
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams();
      if (params.filter && params.filter.conditions.length > 0) {
        search.set('filter', JSON.stringify(params.filter));
      }
      search.set('limit', String(params.limit ?? 50));
      if (pageParam) search.set('cursor', pageParam);
      return apiFetch<{ items: LocationSearchRow[]; nextCursor: string | null }>(
        `/v1/locations/search?${search.toString()}`,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
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

export function useMegas() {
  return useQuery({
    queryKey: ['megas'],
    queryFn: () => apiFetch<{ items: MegaSummary[] }>('/v1/pokemon/megas'),
    staleTime: Infinity,
  });
}

export function usePokemonForms(id: number | undefined, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ['pokemon', 'forms', id],
    queryFn: () => apiFetch<{ items: PokemonForm[] }>(`/v1/pokemon/${id}/forms`),
    enabled: (options.enabled ?? true) && id !== undefined,
  });
}

// ── Items (advanced search) ────────────────────────────────────────────────

export function useItemSearch(
  params: { filter?: ItemFilter; sort?: 'id' | 'name' | 'cost'; dir?: SortDir; limit?: number },
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
