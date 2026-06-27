import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAbilities } from '@/hooks/api/dex';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ColumnToggle from '../components/ColumnToggle';
import { useColumnPrefs } from '@/hooks/useColumnPrefs';
import { Search } from 'lucide-react';

const ABILITY_TABLE_COLUMNS = [
  { key: 'effect', label: 'Effect' },
  { key: 'gen', label: 'Gen' },
  { key: 'count', label: 'Pokémon' },
] as const;
const ABILITY_COLUMN_KEYS = ABILITY_TABLE_COLUMNS.map((c) => c.key);

/** The ability index — every main-series ability with its holder count. */
const Abilities: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(q);

  const { visible, toggle } = useColumnPrefs('abilities', ABILITY_COLUMN_KEYS, ABILITY_COLUMN_KEYS);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAbilities({
    q: q || undefined,
    limit: 100,
  });
  const abilities = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Abilities</h1>
      <p className="text-muted-foreground mb-8">Every ability, what it does, and who can have it</p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setParams(searchInput.trim() ? { q: searchInput.trim() } : {}, { replace: true });
          }}
          className="flex w-full max-w-md"
        >
          <Input
            placeholder="Search abilities…"
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
        <ColumnToggle columns={ABILITY_TABLE_COLUMNS} visible={visible} onToggle={toggle} />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ability</TableHead>
                  {visible.includes('effect') && <TableHead>Effect</TableHead>}
                  {visible.includes('gen') && <TableHead className="text-right">Gen</TableHead>}
                  {visible.includes('count') && <TableHead className="text-right">Pokémon</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {abilities.map((ability) => (
                  <TableRow key={ability.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      <Link to={`/abilities/${ability.name}`} className="hover:underline">
                        {ability.displayName}
                      </Link>
                    </TableCell>
                    {visible.includes('effect') && (
                      <TableCell className="max-w-xl text-sm text-muted-foreground">
                        <span className="line-clamp-2">{ability.shortEffect ?? ''}</span>
                      </TableCell>
                    )}
                    {visible.includes('gen') && (
                      <TableCell className="text-right">{ability.generation ?? '—'}</TableCell>
                    )}
                    {visible.includes('count') && <TableCell className="text-right">{ability.pokemonCount}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {abilities.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">No abilities match that search.</p>
          )}
          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Abilities;
