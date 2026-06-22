import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  Activity,
  CatchPokemonInput,
  CaughtPokemon,
  ClaimUsernameInput,
  CreateTeamInput,
  Friendship,
  Page,
  PokemonSummary,
  RespondToFriendInput,
  Team,
  TrainerProfile,
  TrainerSummary,
  UpdateCaughtPokemonInput,
  UpdateProfileInput,
  UpdateTeamInput,
} from '@masterpokedex/shared';
import { apiFetch, isApiError } from '@/lib/api';
import { useAuth } from '@/auth/AuthProvider';

/**
 * "My profile". A 404 is not an error here: a fresh Supabase account has no
 * trainer row until the username is claimed, and `data === null` is what
 * drives the onboarding card.
 */
export function useMe() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['me', session?.user.id],
    queryFn: async (): Promise<TrainerProfile | null> => {
      try {
        return await apiFetch<TrainerProfile>('/v1/me', { auth: true });
      } catch (err) {
        if (isApiError(err, 'not_found')) return null;
        throw err;
      }
    },
    enabled: !!session,
  });
}

function useInvalidate() {
  const queryClient = useQueryClient();
  return (...keys: string[]) => {
    for (const key of keys) void queryClient.invalidateQueries({ queryKey: [key] });
  };
}

export function useClaimUsername() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: ClaimUsernameInput) =>
      apiFetch<TrainerProfile>('/v1/me', { method: 'POST', body: input, auth: true }),
    onSuccess: () => invalidate('me', 'trainers'),
  });
}

export function useUpdateProfile() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      apiFetch<TrainerProfile>('/v1/me', { method: 'PATCH', body: input, auth: true }),
    onSuccess: () => invalidate('me', 'trainers'),
  });
}

// ── Teams & caught Pokémon ────────────────────────────────────────────────────

export function useMyTeams() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['my-teams', session?.user.id],
    queryFn: () => apiFetch<{ items: Team[] }>('/v1/me/teams', { auth: true }),
    enabled: !!session,
    select: (data) => data.items,
  });
}

export function useCreateTeam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (input: CreateTeamInput) =>
      apiFetch<Team>('/v1/me/teams', { method: 'POST', body: input, auth: true }),
    onSuccess: () => invalidate('my-teams', 'me'),
  });
}

export function useUpdateTeam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ teamId, ...input }: UpdateTeamInput & { teamId: string }) =>
      apiFetch<Team>(`/v1/me/teams/${teamId}`, { method: 'PATCH', body: input, auth: true }),
    onSuccess: () => invalidate('my-teams'),
  });
}

export function useDeleteTeam() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (teamId: string) =>
      apiFetch<void>(`/v1/me/teams/${teamId}`, { method: 'DELETE', auth: true }),
    onSuccess: () => invalidate('my-teams', 'me'),
  });
}

export function useCatchPokemon() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ teamId, ...input }: CatchPokemonInput & { teamId: string }) =>
      apiFetch<CaughtPokemon>(`/v1/me/teams/${teamId}/pokemon`, {
        method: 'POST',
        body: input,
        auth: true,
      }),
    onSuccess: () => invalidate('my-teams', 'me', 'activity'),
  });
}

export function useUpdateCaught() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateCaughtPokemonInput & { id: string }) =>
      apiFetch<CaughtPokemon>(`/v1/me/pokemon/${id}`, { method: 'PATCH', body: input, auth: true }),
    onSuccess: () => invalidate('my-teams'),
  });
}

export function useReleaseCaught() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/v1/me/pokemon/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => invalidate('my-teams', 'me'),
  });
}

// ── Friends ───────────────────────────────────────────────────────────────────

export function useMyFriends() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['friends', session?.user.id],
    queryFn: () => apiFetch<{ items: Friendship[] }>('/v1/me/friends', { auth: true }),
    enabled: !!session,
    select: (data) => data.items,
  });
}

export function useRequestFriend() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (username: string) =>
      apiFetch<Friendship>('/v1/me/friends', { method: 'POST', body: { username }, auth: true }),
    onSuccess: () => invalidate('friends', 'trainer'),
  });
}

export function useRespondToFriend() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...input }: RespondToFriendInput & { id: string }) =>
      apiFetch<Friendship>(`/v1/me/friends/${id}`, { method: 'PATCH', body: input, auth: true }),
    onSuccess: () => invalidate('friends', 'trainer', 'activity'),
  });
}

export function useRemoveFriend() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/v1/me/friends/${id}`, { method: 'DELETE', auth: true }),
    onSuccess: () => invalidate('friends', 'trainer'),
  });
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export function useMyFavorites() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['favorites', session?.user.id],
    queryFn: () => apiFetch<Page<PokemonSummary>>('/v1/me/favorites', { auth: true }),
    enabled: !!session,
    select: (data) => data.items,
  });
}

export function useSetFavorite() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ pokemonId, favorite }: { pokemonId: number; favorite: boolean }) =>
      apiFetch<void>(`/v1/me/favorites/${pokemonId}`, {
        method: favorite ? 'PUT' : 'DELETE',
        auth: true,
      }),
    onSuccess: () => invalidate('favorites'),
  });
}

// ── Activity feed ─────────────────────────────────────────────────────────────

export function useActivityFeed() {
  const { session } = useAuth();
  return useInfiniteQuery({
    queryKey: ['activity', session?.user.id],
    queryFn: ({ pageParam }) =>
      apiFetch<Page<Activity>>(
        `/v1/me/activity?limit=20${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ''}`,
        { auth: true },
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: !!session,
  });
}

// ── Public trainer directory ──────────────────────────────────────────────────

export function useTrainers(q: string) {
  return useInfiniteQuery({
    queryKey: ['trainers', q],
    queryFn: ({ pageParam }) => {
      const search = new URLSearchParams({ limit: '30' });
      if (q) search.set('q', q);
      if (pageParam) search.set('cursor', pageParam);
      return apiFetch<Page<TrainerSummary>>(`/v1/trainers?${search}`, { auth: 'optional' });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function useTrainerProfile(username: string | undefined) {
  return useQuery({
    queryKey: ['trainer', username],
    queryFn: () => apiFetch<TrainerProfile>(`/v1/trainers/${username}`, { auth: 'optional' }),
    enabled: !!username,
  });
}

export function useTrainerTeams(username: string | undefined) {
  return useQuery({
    queryKey: ['trainer', username, 'teams'],
    queryFn: () => apiFetch<{ items: Team[] }>(`/v1/trainers/${username}/teams`, { auth: 'optional' }),
    enabled: !!username,
    select: (data) => data.items,
  });
}
