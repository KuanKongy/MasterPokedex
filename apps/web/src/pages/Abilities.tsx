import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ABILITY_SORT_FIELDS,
  type AbilitySortField,
  type AbilitySummary,
  type SortDir,
} from '@masterpokedex/shared';
import { useAllAbilities } from '@/hooks/api/dex';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchField from '../components/SearchField';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ColumnToggle from '../components/ColumnToggle';
import SortableHead from '../components/SortableHead';
import { useColumnPrefs } from '@/hooks/useColumnPrefs';
import { makeComparator } from '../utils/clientSort';

const ABILITY_TABLE_COLUMNS = [
  { key: 'effect', label: 'Effect' },
  { key: 'gen', label: 'Gen' },
  { key: 'count', label: 'Pokémon' },
] as const;
const ABILITY_COLUMN_KEYS = ABILITY_TABLE_COLUMNS.map((c) => c.key);

/** The holder count reads best highest-first, so its first click sorts descending. */
const DESC_FIRST = new Set<AbilitySortField>(['pokemonCount']);

/** name sorts on displayName because the SQL it replaces sorted a.display_name. */
const ABILITY_SORT_GETTERS: Record<AbilitySortField, (a: AbilitySummary) => string | number | null> = {
  id: (a) => a.id,
  name: (a) => a.displayName,
  generation: (a) => a.generation,
  pokemonCount: (a) => a.pokemonCount,
};

const PAGE_SIZE = 100;

/** The ability index — every main-series ability with its holder count. */
const Abilities: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const sortParam = params.get('sort');
  const sort: AbilitySortField = (ABILITY_SORT_FIELDS as readonly string[]).includes(sortParam ?? '')
    ? (sortParam as AbilitySortField)
    : 'id';
  const dir: SortDir = params.get('dir') === 'desc' ? 'desc' : 'asc';

  const patch = (patchObj: Record<string, string | null>) => {
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

  const handleSort = (field: AbilitySortField) => {
    const nextDir: SortDir =
      sort === field ? (dir === 'asc' ? 'desc' : 'asc') : DESC_FIRST.has(field) ? 'desc' : 'asc';
    patch({ sort: field, dir: nextDir });
  };

  const { visible, toggle } = useColumnPrefs('abilities', ABILITY_COLUMN_KEYS, ABILITY_COLUMN_KEYS);

  // The whole ability index is loaded once; search and sorts are client-side.
  const { data: allAbilities, isLoading } = useAllAbilities();
  const abilities = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const filtered = (allAbilities ?? []).filter(
      (a) => !ql || a.displayName.toLowerCase().includes(ql) || a.name.toLowerCase().includes(ql),
    );
    return filtered.sort(makeComparator(ABILITY_SORT_GETTERS[sort], dir));
  }, [allAbilities, q, sort, dir]);

  const [shown, setShown] = useState(PAGE_SIZE);
  useEffect(() => setShown(PAGE_SIZE), [q, sort, dir]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Abilities</h1>
      <p className="text-muted-foreground mb-8">Every ability, what it does, and who can have it</p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {/* Filters as you type; the whole list is client-side. */}
        <SearchField
          value={q}
          onChange={(value) => patch({ q: value || null })}
          onSubmit={() => undefined}
          placeholder="Search abilities…"
          className="w-full max-w-md"
        />
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
                  <SortableHead field="name" label="Ability" sort={sort} dir={dir} onSort={handleSort} className="min-w-[11rem]" />
                  {visible.includes('effect') && <TableHead>Effect</TableHead>}
                  {visible.includes('gen') && (
                    <SortableHead
                      field="generation"
                      label="Gen"
                      helpTitle="Generation"
                      sort={sort}
                      dir={dir}
                      onSort={handleSort}
                      alignRight
                      help="The generation of games that introduced the ability."
                      className="w-20"
                    />
                  )}
                  {visible.includes('count') && (
                    <SortableHead
                      field="pokemonCount"
                      label="Pokémon"
                      sort={sort}
                      dir={dir}
                      onSort={handleSort}
                      alignRight
                      help="How many Pokémon can have this ability."
                      className="w-24"
                    />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {abilities.slice(0, shown).map((ability) => (
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
          {abilities.length > shown && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                Show more ({abilities.length - shown} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Abilities;
