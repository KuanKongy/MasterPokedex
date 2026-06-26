import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { useEvolutionChains } from '@/hooks/api/dex';
import LoadingSpinner from '../components/LoadingSpinner';
import { evolutionCondition } from '../components/pokemon/evolution-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TypeBadge } from '../components/ui/type-badge';
import { capitalize } from '../utils/helpers';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

/**
 * Every evolution family, one card per chain — the browsable index behind
 * the per-Pokémon chain on the detail page. Branching families (Eevee) show
 * each branch at its depth.
 */
const Evolutions: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(q);
  const { spriteStyle } = useSpritePref();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useEvolutionChains({
    q: q || undefined,
    limit: 20,
  });
  const chains = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Evolution chains</h1>
      <p className="text-muted-foreground mb-8">Every family, base form to final evolution</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParams(searchInput.trim() ? { q: searchInput.trim() } : {}, { replace: true });
        }}
        className="mb-6 flex max-w-md"
      >
        <Input
          placeholder="Find a family (e.g. eevee)…"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
            if (e.target.value === '') setParams({}, { replace: true });
          }}
          className="rounded-r-none"
        />
        <Button type="submit" className="rounded-l-none">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="space-y-4">
            {chains.map((chain) => (
              <Card key={chain.chainId}>
                <CardContent className="flex flex-wrap items-center justify-center gap-3 p-4">
                  {chain.nodes.map((node, index) => (
                    <React.Fragment key={node.id}>
                      {index > 0 && (
                        <div className="px-1 text-center">
                          <ChevronRight className="mx-auto h-5 w-5 text-muted-foreground" />
                          {node.depth > 0 && (
                            <div className="mt-0.5 max-w-24 text-xs text-muted-foreground">
                              {evolutionCondition(node)}
                            </div>
                          )}
                        </div>
                      )}
                      <Link
                        to={`/pokemon/${node.id}`}
                        className="flex w-24 flex-col items-center rounded-lg border p-2 transition-colors hover:border-pokebrand-red/60"
                      >
                        <img
                          src={pokemonImage(node.id, spriteStyle)}
                          alt={node.name}
                          loading="lazy"
                          onError={(e) => spriteFallback(e, node.id)}
                          className={cn('h-16 w-16 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                        />
                        <span className="mt-1 w-full truncate text-center text-xs font-medium">
                          {capitalize(node.name)}
                        </span>
                        <span className="flex gap-0.5">
                          {node.types.map((type) => (
                            <TypeBadge key={type} type={type} size="sm" />
                          ))}
                        </span>
                      </Link>
                    </React.Fragment>
                  ))}
                  {chain.nodes.length === 1 && (
                    <span className="text-sm text-muted-foreground">does not evolve</span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {chains.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">No families match that search.</p>
          )}
          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Loading…' : 'Load more families'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Evolutions;
