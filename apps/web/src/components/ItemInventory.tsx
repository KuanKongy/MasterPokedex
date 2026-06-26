import React, { useMemo } from 'react';
import type { TrainerItem } from '@masterpokedex/shared';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdjustItem, useMyBag } from '@/hooks/api/items';
import { useToast } from '@/hooks/use-toast';
import { isApiError } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';
import ItemSprite from './ItemSprite';

/**
 * The bag, grouped by pocket like the games. Quantities are real (the old
 * `hasItem` table had none) — steppers adjust by ±1 optimistically and a row
 * disappears when it hits zero.
 */
const ItemInventory: React.FC = () => {
  const { toast } = useToast();
  const { data: items, isLoading } = useMyBag();
  const adjust = useAdjustItem();

  const pockets = useMemo(() => {
    const grouped = new Map<string, TrainerItem[]>();
    for (const item of items ?? []) {
      const pocket = (item as TrainerItem & { pocket?: string | null }).pocket ?? item.category;
      const bucket = grouped.get(pocket) ?? [];
      bucket.push(item);
      grouped.set(pocket, bucket);
    }
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items]);

  const change = (item: TrainerItem, delta: number) => {
    adjust.mutate(
      { itemId: item.id, delta },
      {
        onError: (err) => {
          toast({
            title: isApiError(err, 'insufficient_quantity') ? 'None left to use' : 'Could not update',
            description: isApiError(err) ? err.message : 'Please try again.',
            variant: 'destructive',
          });
        },
      },
    );
  };

  const discard = (item: TrainerItem) => {
    adjust.mutate({ itemId: item.id, quantity: 0 }, { onSuccess: () => toast({ title: `${item.displayName} discarded` }) });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p className="mb-2 font-medium text-foreground">Your bag is empty</p>
          <p className="text-sm">Add items from the catalogue tab.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {pockets.map(([pocket, pocketItems]) => (
        <div key={pocket}>
          <h3 className="font-semibold mb-3 capitalize flex items-center gap-2">
            {pocket.replace(/-/g, ' ')}
            <Badge variant="secondary" className="text-xs">
              {pocketItems.length}
            </Badge>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pocketItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 border rounded-md p-3 bg-card">
                <ItemSprite src={item.sprite} alt={item.displayName} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.displayName}</div>
                  {item.effect && (
                    <div className="text-xs text-muted-foreground line-clamp-2">{item.effect}</div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    aria-label="Use one"
                    disabled={adjust.isPending}
                    onClick={() => change(item, -1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-8 text-center font-semibold tabular-nums">{item.quantity}</span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-7 w-7"
                    aria-label="Add one"
                    disabled={adjust.isPending}
                    onClick={() => change(item, 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    aria-label="Discard all"
                    disabled={adjust.isPending}
                    onClick={() => discard(item)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Looking for something new? Browse the <Link to="/items" className="underline">catalogue</Link>.
      </p>
    </div>
  );
};

export default ItemInventory;
