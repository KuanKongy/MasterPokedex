import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Search } from 'lucide-react';
import type { SearchKind, SearchResult } from '@masterpokedex/shared';
import { useSearch } from '@/hooks/api/dex';
import ItemSprite from '@/components/ItemSprite';
import { pokemonImage, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

const KIND_LABELS: Record<SearchKind, string> = {
  pokemon: 'Pokémon',
  move: 'Moves',
  ability: 'Abilities',
  item: 'Items',
  location: 'Locations',
  type: 'Types',
};

const KIND_ORDER: SearchKind[] = ['pokemon', 'move', 'ability', 'item', 'location', 'type'];

function routeFor(result: SearchResult): string {
  switch (result.kind) {
    case 'pokemon':
      return `/pokemon/${result.id}`;
    case 'move':
      return `/moves/${result.name}`;
    case 'ability':
      return `/abilities/${result.name}`;
    case 'item':
      return `/items/${result.name}`;
    case 'location':
      return `/locations/${result.id}`;
    case 'type':
      return `/types/${result.name}`;
  }
}

type OmniSearchProps = {
  /** Compact header styling (white-on-red) vs plain page styling. */
  variant?: 'header' | 'page';
  autoFocus?: boolean;
  onNavigated?: () => void;
  className?: string;
};

/**
 * The one search box: grouped typeahead over Pokémon, moves, abilities,
 * items, locations and types, with cmdk supplying the keyboard model.
 * Enter on the input (nothing highlighted) opens the full results page.
 */
const OmniSearch: React.FC<OmniSearchProps> = ({ variant = 'header', autoFocus, onNavigated, className }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { spriteStyle } = useSpritePref();
  const { data, isFetching } = useSearch(open ? query : '');
  const blurTimer = useRef<number>();

  const grouped = useMemo(() => {
    const buckets = new Map<SearchKind, SearchResult[]>();
    for (const item of data?.items ?? []) {
      const bucket = buckets.get(item.kind) ?? [];
      if (bucket.length < 5) bucket.push(item);
      buckets.set(item.kind, bucket);
    }
    return KIND_ORDER.filter((kind) => buckets.has(kind)).map((kind) => ({
      kind,
      items: buckets.get(kind)!,
    }));
  }, [data]);

  const go = (path: string) => {
    navigate(path);
    setQuery('');
    setOpen(false);
    onNavigated?.();
  };

  const showList = open && query.trim().length >= 1;

  return (
    <Command
      shouldFilter={false}
      className={cn('relative overflow-visible bg-transparent', className)}
      onBlur={() => {
        // Let a click on a result land before the list unmounts.
        blurTimer.current = window.setTimeout(() => setOpen(false), 150);
      }}
      onFocus={() => window.clearTimeout(blurTimer.current)}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-md border px-3',
          variant === 'header'
            ? 'border-pokebrand-foreground/20 bg-pokebrand-foreground/10 text-pokebrand-foreground focus-within:ring-2 focus-within:ring-pokebrand-foreground/40'
            : 'border-input bg-background focus-within:ring-2 focus-within:ring-ring',
        )}
      >
        <Search className={cn('h-4 w-4 shrink-0', variant === 'header' ? 'text-pokebrand-foreground/70' : 'text-muted-foreground')} />
        {/* cmdk's own input, unstyled, so arrow keys drive the list. */}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && query.trim() && grouped.length === 0 && !isFetching) {
              go(`/search?q=${encodeURIComponent(query.trim())}`);
            }
          }}
          autoFocus={autoFocus}
          placeholder="Search anything…"
          aria-label="Search the Pokédex"
          className={cn(
            'h-9 w-full bg-transparent text-sm outline-none',
            variant === 'header' ? 'placeholder:text-pokebrand-foreground/70' : 'placeholder:text-muted-foreground',
          )}
          // cmdk listens on its own input; mirror value through the Command root instead.
          data-omnisearch-input
        />
      </div>

      {showList && (
        <CommandList className="absolute top-full z-50 mt-1 max-h-96 w-full min-w-72 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-lg">
          {grouped.map(({ kind, items }) => (
            <CommandGroup key={kind} heading={KIND_LABELS[kind]}>
              {items.map((item) => (
                <CommandItem
                  key={`${item.kind}-${item.id}-${item.name}`}
                  value={`${item.kind}-${item.id}-${item.name}`}
                  onSelect={() => go(routeFor(item))}
                  className="flex items-center gap-2"
                >
                  {item.kind === 'pokemon' ? (
                    <img
                      src={pokemonImage(item.id, spriteStyle)}
                      alt=""
                      loading="lazy"
                      className={cn('h-8 w-8 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                    />
                  ) : item.kind === 'item' ? (
                    <ItemSprite src={item.image} itemName={item.name} alt="" className="h-8 w-8" />
                  ) : item.image ? (
                    <img src={item.image} alt="" loading="lazy" className="h-8 w-8 object-contain pixelated" />
                  ) : (
                    <span className="inline-block h-8 w-8" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{item.displayName}</span>
                  {item.detail && (
                    <span className="max-w-40 truncate text-xs text-muted-foreground">{item.detail}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <CommandGroup>
            <CommandItem
              value="__all-results"
              onSelect={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
              className="justify-center text-sm text-muted-foreground"
            >
              {isFetching && grouped.length === 0
                ? 'Searching…'
                : `All results for “${query.trim()}”`}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      )}
    </Command>
  );
};

export default OmniSearch;
