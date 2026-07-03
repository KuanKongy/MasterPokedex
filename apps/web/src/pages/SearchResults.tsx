import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { SearchKind, SearchResult } from '@masterpokedex/shared';
import { useSearch } from '@/hooks/api/dex';
import LoadingSpinner from '../components/LoadingSpinner';
import ItemSprite from '../components/ItemSprite';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

/** The full-page landing for a search — everything the omnisearch matched. */
const SearchResults: React.FC = () => {
  const [params] = useSearchParams();
  const q = params.get('q') ?? '';
  const { data, isLoading } = useSearch(q, 20);
  const { spriteStyle } = useSpritePref();

  const grouped = useMemo(() => {
    const buckets = new Map<SearchKind, SearchResult[]>();
    for (const item of data?.items ?? []) {
      const bucket = buckets.get(item.kind) ?? [];
      bucket.push(item);
      buckets.set(item.kind, bucket);
    }
    return KIND_ORDER.filter((kind) => buckets.has(kind)).map((kind) => ({ kind, items: buckets.get(kind)! }));
  }, [data]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Search</h1>
      <p className="text-muted-foreground mb-8">
        {q ? (
          <>
            Results for <span className="font-semibold text-foreground">“{q}”</span>
          </>
        ) : (
          'Type something into the search bar above'
        )}
      </p>

      {isLoading ? (
        <LoadingSpinner />
      ) : grouped.length === 0 && q ? (
        <p className="py-12 text-center text-muted-foreground">
          Nothing in the dex matches “{q}”. Trainers have their own search on the{' '}
          <Link to="/trainer" className="text-pokebrand-red hover:underline">
            Trainer page
          </Link>
          .
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ kind, items }) => (
            <Card key={kind}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">
                  {KIND_LABELS[kind]} <span className="text-sm font-normal text-muted-foreground">({items.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => (
                    <Link
                      key={`${item.kind}-${item.id}-${item.name}`}
                      to={routeFor(item)}
                      className="flex items-center gap-3 rounded-md p-2 transition-colors hover:bg-muted/60"
                    >
                      {item.kind === 'pokemon' ? (
                        <img
                          src={pokemonImage(item.id, spriteStyle)}
                          alt=""
                          loading="lazy"
                          className={cn('h-10 w-10 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                        />
                      ) : item.kind === 'item' ? (
                        <ItemSprite src={item.image} itemName={item.name} alt="" className="h-10 w-10" />
                      ) : item.image ? (
                        <img src={item.image} alt="" loading="lazy" className="h-10 w-10 object-contain pixelated" />
                      ) : (
                        <span className="inline-block h-10 w-10" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{item.displayName}</span>
                        {item.detail && (
                          <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                        )}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchResults;
