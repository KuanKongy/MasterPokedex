import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdjustItemInput, Item, TrainerItem } from '@masterpokedex/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/auth/AuthProvider';

export function useItemCatalogue(params: { category?: string; q?: string } = {}) {
  return useQuery({
    queryKey: ['items', 'catalogue', params],
    queryFn: () => {
      const search = new URLSearchParams();
      if (params.category) search.set('category', params.category);
      if (params.q) search.set('q', params.q);
      return apiFetch<{ items: Item[] }>(`/v1/items?${search}`);
    },
    select: (data) => data.items,
  });
}

export type ItemCategory = { id: number; name: string; displayName: string; pocket: string | null; itemCount: number };

export function useItemCategories() {
  return useQuery({
    queryKey: ['items', 'categories'],
    queryFn: () => apiFetch<{ items: ItemCategory[] }>('/v1/item-categories'),
    select: (data) => data.items,
    staleTime: Infinity,
  });
}

export function useMyBag() {
  const { session } = useAuth();
  return useQuery({
    queryKey: ['bag', session?.user.id],
    queryFn: () => apiFetch<{ items: TrainerItem[] }>('/v1/me/items', { auth: true }),
    enabled: !!session,
    select: (data) => data.items,
  });
}

/**
 * Optimistic quantity adjustment: the steppers feel instant, and a rejected
 * write (e.g. below zero) rolls back to the server's truth.
 */
export function useAdjustItem() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const bagKey = ['bag', session?.user.id];

  return useMutation({
    mutationFn: ({ itemId, ...input }: AdjustItemInput & { itemId: number }) =>
      apiFetch<{ itemId: number; quantity: number }>(`/v1/me/items/${itemId}`, {
        method: 'PUT',
        body: input,
        auth: true,
      }),
    onMutate: async ({ itemId, quantity, delta }) => {
      await queryClient.cancelQueries({ queryKey: bagKey });
      const previous = queryClient.getQueryData<{ items: TrainerItem[] }>(bagKey);
      if (previous) {
        queryClient.setQueryData<{ items: TrainerItem[] }>(bagKey, {
          items: previous.items
            .map((item) =>
              item.id === itemId
                ? { ...item, quantity: quantity ?? Math.max(0, item.quantity + (delta ?? 0)) }
                : item,
            )
            .filter((item) => item.quantity > 0),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(bagKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['bag'] });
    },
  });
}
