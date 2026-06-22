import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * The analytics endpoints ported from the reference project. All public, all
 * cheap on the server, so a long staleTime keeps the stats pages snappy.
 */
function useStat<T>(path: string) {
  return useQuery({
    queryKey: ['stats', path],
    queryFn: () => apiFetch<{ items: T[] }>(`/v1/stats/${path}`),
    select: (data) => data.items,
    staleTime: 1000 * 60 * 30,
  });
}

export type TypeStatRow = {
  type: string;
  pokemonCount: number;
  avgHp: number;
  avgAttack: number;
  avgDefense: number;
  avgSpecialAttack: number;
  avgSpecialDefense: number;
  avgSpeed: number;
  avgTotal: number;
};

export type WeakTypeRow = { type: string; avgTotal: number; pokemonCount: number };

export type RegionStatRow = {
  id: number;
  region: string;
  uniquePokemon: number;
  encounterCount: number;
  locationCount: number;
};

export type MultiLocationRow = { id: number; name: string; sprite: string | null; locationCount: number };

export type AllDamageClassRow = { id: number; name: string; sprite: string | null; total: number };

export type TrainersByRegionRow = { id: number; region: string; trainerCount: number };

export type TrainerHallRow = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  caughtCount?: number;
  teamCount?: number;
  itemCount?: number;
};

export const useTypeStats = () => useStat<TypeStatRow>('types');
export const useWeakTypes = () => useStat<WeakTypeRow>('weak-types');
export const useRegionStats = () => useStat<RegionStatRow>('regions');
export const useMultiLocation = () => useStat<MultiLocationRow>('multi-location');
export const useAllDamageClasses = () => useStat<AllDamageClassRow>('all-damage-classes');
export const useTrainersByRegion = () => useStat<TrainersByRegionRow>('trainers-by-region');
export const useAllGrowthRates = () => useStat<TrainerHallRow>('all-growth-rates');
export const useAllTeamCategories = () => useStat<TrainerHallRow>('all-team-categories');
export const useAllItemPockets = () => useStat<TrainerHallRow>('all-item-pockets');
