import React, { useMemo, useState } from 'react';
import type { TrainerItem } from '@masterpokedex/shared';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Minus, Plus, Search, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAdjustItem, useMyBag } from '@/hooks/api/items';
import { useToast } from '@/hooks/use-toast';
import { isApiError } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';
import ItemSprite from './ItemSprite';
import HelpTip from './HelpTip';

type BagSortMode = 'name' | 'quantity' | 'cost';

const BAG_SORTERS: Record<BagSortMode, (a: TrainerItem, b: TrainerItem) => number> = {
  name: (a, b) => a.displayName.localeCompare(b.displayName),
  quantity: (a, b) => b.quantity - a.quantity || a.displayName.localeCompare(b.displayName),
  cost: (a, b) => (b.cost ?? -1) - (a.cost ?? -1) || a.displayName.localeCompare(b.displayName),
};

/**
 * The bag, grouped by pocket like the games. Quantities are real (the old
 * `hasItem` table had none) — steppers adjust by ±1 optimistically and a row
 * disappears when it hits zero. The filter and sorter are client-side: a bag
 * holds at most one row per distinct item, so it always fits in memory.
 */
const ItemInventory: React.FC = () => {
  const { toast } = useToast();
  const { data: items, isLoading } = useMyBag();
  const adjust = useAdjustItem();
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState<BagSortMode>('name');

  const pockets = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Filtering before grouping makes emptied pockets vanish on their own.
    const shown = q
      ? (items ?? []).filter((item) => item.displayName.toLowerCase().includes(q))
      : (items ?? []);
    const grouped = new Map<string, TrainerItem[]>();
    for (const item of shown) {
      const pocket = item.pocket ?? item.category;
      const bucket = grouped.get(pocket) ?? [];
      bucket.push(item);
      grouped.set(pocket, bucket);
    }
    for (const bucket of grouped.values()) bucket.sort(BAG_SORTERS[sortMode]);
    return [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [items, query, sortMode]);

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
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${items.length} item${items.length === 1 ? '' : 's'}…`}
            className="pl-8"
            aria-label="Filter bag items"
          />
        </div>
        <Select value={sortMode} onValueChange={(value) => setSortMode(value as BagSortMode)}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Sort bag items">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name A to Z</SelectItem>
            <SelectItem value="quantity">Quantity, high first</SelectItem>
            <SelectItem value="cost">Price, high first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pockets.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">No items match “{query}”.</p>
      )}

      {pockets.map(([pocket, pocketItems]) => (
        <div key={pocket}>
          <h3 className="font-semibold mb-3 capitalize flex items-center gap-2">
            {pocket.replace(/-/g, ' ')}
            <Badge variant="secondary" className="text-xs">
              {pocketItems.length}
            </Badge>
            <HelpTip title="Pockets" faq="bag">
              Your bag sorts itself into the games' pockets; each item knows which one it
              belongs to.
            </HelpTip>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pocketItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3 border rounded-md p-3 bg-card">
                <Link to={`/items/${item.name}`} className="group flex flex-1 min-w-0 items-center gap-3">
                  <ItemSprite src={item.sprite} itemName={item.name} alt={item.displayName} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate group-hover:underline">{item.displayName}</div>
                    {item.effect && (
                      <div className="text-xs text-muted-foreground line-clamp-2">{item.effect}</div>
                    )}
                  </div>
                </Link>
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
