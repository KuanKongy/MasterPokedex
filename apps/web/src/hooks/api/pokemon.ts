import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import {
  encodeFilter,
  type EvolutionNode,
  type Page,
  type PokemonDetail,
  type PokemonFilter,
  type PokemonMove,
  type PokemonSortField,
  type PokemonSummary,
  type PokemonTypeName,
  type SortDir,
  type TypeInfo,
} from '@masterpokedex/shared';
import { apiFetch } from '@/lib/api';

export type PokemonListParams = {
  q?: string;
  type?: PokemonTypeName;
  generation?: number;
  sort?: PokemonSortField;
  dir?: SortDir;
  filter?: PokemonFilter;
  limit?: number;
};

function listQuery(params: PokemonListParams, cursor?: string): string {
  const search = new URLSearchParams();
  if (params.q) search.set('q', params.q);
  if (params.type) search.set('type', params.type);
  if (params.generation) search.set('generation', String(params.generation));
  if (params.sort) search.set('sort', params.sort);
  if (params.dir) search.set('dir', params.dir);
  if (params.filter && params.filter.conditions.length > 0) {
    search.set('filter', encodeFilter(params.filter));
  }
  search.set('limit', String(params.limit ?? 60));
  if (cursor) search.set('cursor', cursor);
  return search.toString();
}

/** Server-side paged list; replaces the old 152-requests-to-PokeAPI fetch. */
export function usePokemonList(params: PokemonListParams = {}, options: { enabled?: boolean } = {}) {
  return useInfiniteQuery({
    queryKey: ['pokemon', 'list', params],
    queryFn: ({ pageParam }) =>
      apiFetch<Page<PokemonSummary>>(`/v1/pokemon?${listQuery(params, pageParam)}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: options.enabled ?? true,
  });
}

export function usePokemon(idOrName: string | number | undefined) {
  return useQuery({
    queryKey: ['pokemon', 'detail', String(idOrName)],
    queryFn: () => apiFetch<PokemonDetail>(`/v1/pokemon/${idOrName}`),
    enabled: idOrName !== undefined && idOrName !== '',
  });
}

export function useEvolutionChain(id: number | undefined) {
  return useQuery({
    queryKey: ['pokemon', 'evolution', id],
    queryFn: () => apiFetch<{ items: EvolutionNode[] }>(`/v1/pokemon/${id}/evolution`),
    enabled: id !== undefined,
    select: (data) => data.items,
  });
}

export type PokemonEncounterRow = {
  regionId: number | null;
  regionName: string | null;
  locationId: number;
  locationName: string;
  locationDisplayName: string;
  areaId: number;
  areaDisplayName: string;
  method: string;
  chance: number;
  minLevel: number | null;
  maxLevel: number | null;
  conditions: string[];
  versions: string[];
};

export function usePokemonEncounters(id: number | undefined) {
  return useQuery({
    queryKey: ['pokemon', 'encounters', id],
    queryFn: () => apiFetch<{ items: PokemonEncounterRow[] }>(`/v1/pokemon/${id}/encounters`),
    enabled: id !== undefined,
    select: (data) => data.items,
  });
}

export function usePokemonMoves(id: number | undefined) {
  return useQuery({
    queryKey: ['pokemon', 'moves', id],
    queryFn: () => apiFetch<{ items: PokemonMove[] }>(`/v1/pokemon/${id}/moves`),
    enabled: id !== undefined,
    select: (data) => data.items,
  });
}

export type TypeSummary = { id: number; name: PokemonTypeName; pokemonCount: number };

export function useTypes() {
  return useQuery({
    queryKey: ['types'],
    queryFn: () => apiFetch<{ items: TypeSummary[] }>('/v1/types'),
    select: (data) => data.items,
    staleTime: Infinity,
  });
}

export function useTypeInfo(name: string | undefined) {
  return useQuery({
    queryKey: ['types', name],
    queryFn: () => apiFetch<TypeInfo>(`/v1/types/${name}`),
    enabled: !!name,
  });
}
