import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ITEM_SORT_FIELDS, type ItemSortField, type SortDir } from '@masterpokedex/shared';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import ItemSprite from './ItemSprite';
import SearchField from './SearchField';
import SegmentedToggle from './SegmentedToggle';
import SortableHead from './SortableHead';
import { HoverTip } from './HelpTip';
import { LayoutGrid, List, PackagePlus } from 'lucide-react';
import { useItemCatalogue, useItemCategories, useAdjustItem } from '@/hooks/api/items';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { capitalize } from '../utils/helpers';
import { cn } from '@/lib/utils';
import LoadingSpinner from './LoadingSpinner';

const ALL = 'all';

/** Price reads best highest-first, so its first click sorts descending. */
const DESC_FIRST = new Set<ItemSortField>(['cost']);

const ITEM_VIEWS = [
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'table', label: 'Table', icon: List },
] as const;

/**
 * The full item catalogue from the dex (~2200 items) — public browsing, with
 * an add-to-bag shortcut that prompts sign-in when needed. Replaces the old
 * free-text "add item" form: items are reference data, not user input.
 */
const ItemCatalogue: React.FC = () => {
  // The omnisearch deep-links here as /items?q=<name>.
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get('q') ?? '';
  const view = params.get('view') === 'table' ? 'table' : 'cards';
  const sortParam = params.get('sort');
  const sort: ItemSortField = (ITEM_SORT_FIELDS as readonly string[]).includes(sortParam ?? '')
    ? (sortParam as ItemSortField)
    : 'name';
  const dir: SortDir = params.get('dir') === 'desc' ? 'desc' : 'asc';
  const [searchInput, setSearchInput] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [category, setCategory] = useState(ALL);
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const patchParams = (patchObj: Record<string, string | null>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patchObj)) {
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const handleSort = (field: ItemSortField) => {
    const nextDir: SortDir =
      sort === field ? (dir === 'asc' ? 'desc' : 'asc') : DESC_FIRST.has(field) ? 'desc' : 'asc';
    patchParams({ sort: field, dir: nextDir });
  };

  const { data: categories } = useItemCategories();
  const {
    data: items,
    isLoading,
    isFetching,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useItemCatalogue({
    category: category === ALL ? undefined : category,
    q: search || undefined,
    // The card grid keeps the server's name order; only the table sorts.
    sort: view === 'table' ? sort : undefined,
    dir: view === 'table' ? dir : undefined,
  });
  const adjust = useAdjustItem();

  const addToBag = (itemId: number, name: string) => {
    if (!session) {
      toast({ title: 'Sign in to keep a bag', description: 'Your items live on your trainer account.' });
      navigate('/login');
      return;
    }
    adjust.mutate(
      { itemId, delta: 1 },
      { onSuccess: () => toast({ title: `${name} added to your bag` }) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <SearchField
          value={searchInput}
          onChange={(value) => {
            setSearchInput(value);
            if (value === '') setSearch('');
          }}
          onSubmit={() => setSearch(searchInput.trim())}
          placeholder="Search items…"
          className="flex-1"
        />

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.displayName} ({cat.itemCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="self-start">
          <SegmentedToggle
            options={ITEM_VIEWS}
            value={view}
            onChange={(next) => patchParams({ view: next === 'cards' ? null : next })}
            ariaLabel="Item list style"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <LoadingSpinner />
        </div>
      ) : !items || items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No items match.</p>
      ) : view === 'table' ? (
        // Dimmed while a re-sort or filter refetches, instead of blanking.
        <div className={cn('overflow-x-auto rounded-md border', isFetching && !isFetchingNextPage && 'opacity-60 transition-opacity')}>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHead field="name" label="Item" sort={sort} dir={dir} onSort={handleSort} className="min-w-[12rem]" />
                <SortableHead field="category" label="Category" sort={sort} dir={dir} onSort={handleSort} className="w-40" />
                <SortableHead
                  field="cost"
                  label="Price"
                  sort={sort}
                  dir={dir}
                  onSort={handleSort}
                  alignRight
                  className="w-24"
                  help="What a shop charges for it in the games, in Poké Dollars. Here it's just trivia; the bag is free."
                />
                <TableHead>Effect</TableHead>
                <TableHead aria-label="Add to bag" className="w-14" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap font-medium">
                    <Link to={`/items/${item.name}`} className="flex items-center gap-2 hover:underline">
                      <ItemSprite src={item.sprite} itemName={item.name} alt="" className="h-8 w-8" />
                      {item.displayName}
                    </Link>
                  </TableCell>
                  <TableCell className="whitespace-nowrap capitalize">
                    {item.category.replace(/-/g, ' ')}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    {item.cost !== null && item.cost > 0 ? `₽${item.cost}` : '—'}
                  </TableCell>
                  <TableCell className="max-w-md text-sm text-muted-foreground">
                    <span className="line-clamp-1">{item.effect ?? ''}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      aria-label={`Add ${item.displayName} to bag`}
                      disabled={adjust.isPending}
                      onClick={() => addToBag(item.id, item.displayName)}
                    >
                      <PackagePlus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3', isFetching && !isFetchingNextPage && 'opacity-60 transition-opacity')}>
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <Link to={`/items/${item.name}`} className="group flex flex-1 min-w-0 items-center gap-3">
                  <ItemSprite src={item.sprite} itemName={item.name} alt={item.displayName} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-2">
                      <span className="group-hover:underline">{item.displayName}</span>
                      {item.cost !== null && item.cost > 0 && (
                        <HoverTip
                          title="Price"
                          trigger={
                            <Badge variant="outline" className="text-xs shrink-0">
                              ₽{item.cost}
                            </Badge>
                          }
                        >
                          What a shop charges for it in the games, in Poké Dollars. Here it's
                          just trivia; the bag is free.
                        </HoverTip>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {item.effect ?? capitalize(item.category.replace(/-/g, ' '))}
                    </div>
                  </div>
                </Link>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  aria-label={`Add ${item.displayName} to bag`}
                  disabled={adjust.isPending}
                  onClick={() => addToBag(item.id, item.displayName)}
                >
                  <PackagePlus className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage || isPlaceholderData}
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ItemCatalogue;
