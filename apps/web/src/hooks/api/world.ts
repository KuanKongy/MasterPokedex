import { useQuery } from '@tanstack/react-query';
import type { LocationDetail, LocationSummary, RegionSummary } from '@masterpokedex/shared';
import { apiFetch } from '@/lib/api';

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: () => apiFetch<{ items: RegionSummary[] }>('/v1/regions'),
    select: (data) => data.items,
    staleTime: Infinity,
  });
}

export function useRegionLocations(regionId: number | undefined) {
  return useQuery({
    queryKey: ['regions', regionId, 'locations'],
    queryFn: () => apiFetch<{ items: LocationSummary[] }>(`/v1/regions/${regionId}/locations`),
    enabled: regionId !== undefined,
    select: (data) => data.items,
  });
}

export function useLocationDetail(locationId: number | undefined) {
  return useQuery({
    queryKey: ['locations', locationId],
    queryFn: () => apiFetch<LocationDetail>(`/v1/locations/${locationId}`),
    enabled: locationId !== undefined,
  });
}
