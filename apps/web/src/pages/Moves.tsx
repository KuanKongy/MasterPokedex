import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { DAMAGE_CLASSES, POKEMON_TYPES, type DamageClass, type PokemonTypeName } from '@masterpokedex/shared';
import { useMoves } from '@/hooks/api/dex';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TypeBadge } from '../components/ui/type-badge';
import ColumnToggle from '../components/ColumnToggle';
import { useColumnPrefs } from '@/hooks/useColumnPrefs';
import { Search } from 'lucide-react';
import { capitalize } from '../utils/helpers';

const MOVE_TABLE_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'class', label: 'Class' },
  { key: 'power', label: 'Power' },
  { key: 'accuracy', label: 'Acc.' },
  { key: 'pp', label: 'PP' },
  { key: 'gen', label: 'Gen' },
  { key: 'effect', label: 'Effect' },
] as const;
const MOVE_COLUMN_KEYS = MOVE_TABLE_COLUMNS.map((c) => c.key);

/** The full move dex: filterable, linked through to per-move pages. */
const Moves: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const type = params.get('type') ?? 'all';
  const damageClass = params.get('class') ?? 'all';
  const [searchInput, setSearchInput] = useState(q);

  const patch = (patchObj: Record<string, string | null>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patchObj)) {
          if (value === null || value === '' || value === 'all') next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const { visible, toggle } = useColumnPrefs('moves', MOVE_COLUMN_KEYS, MOVE_COLUMN_KEYS);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useMoves({
    q: q || undefined,
    type: type === 'all' ? undefined : (type as PokemonTypeName),
    damageClass: damageClass === 'all' ? undefined : (damageClass as DamageClass),
    limit: 100,
  });
  const moves = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Moves</h1>
      <p className="text-muted-foreground mb-8">Every move in the dex — power, accuracy, PP and effect</p>

      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            patch({ q: searchInput.trim() || null });
          }}
          className="flex flex-1"
        >
          <Input
            placeholder="Search moves…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (e.target.value === '') patch({ q: null });
            }}
            className="rounded-r-none"
          />
          <Button type="submit" className="rounded-l-none">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <Select value={type} onValueChange={(value) => patch({ type: value })}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {POKEMON_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">
                {capitalize(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={damageClass} onValueChange={(value) => patch({ class: value })}>
          <SelectTrigger className="w-full md:w-44">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {DAMAGE_CLASSES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {capitalize(c)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ColumnToggle columns={MOVE_TABLE_COLUMNS} visible={visible} onToggle={toggle} />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Move</TableHead>
                  {visible.includes('type') && <TableHead>Type</TableHead>}
                  {visible.includes('class') && <TableHead>Class</TableHead>}
                  {visible.includes('power') && <TableHead className="text-right">Power</TableHead>}
                  {visible.includes('accuracy') && <TableHead className="text-right">Acc.</TableHead>}
                  {visible.includes('pp') && <TableHead className="text-right">PP</TableHead>}
                  {visible.includes('gen') && <TableHead className="text-right">Gen</TableHead>}
                  {visible.includes('effect') && <TableHead>Effect</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {moves.map((move) => (
                  <TableRow key={move.id}>
                    <TableCell className="whitespace-nowrap font-medium">
                      <Link to={`/moves/${move.name}`} className="hover:underline">
                        {move.displayName}
                      </Link>
                    </TableCell>
                    {visible.includes('type') && (
                      <TableCell>
                        <TypeBadge type={move.type} size="sm" icon />
                      </TableCell>
                    )}
                    {visible.includes('class') && <TableCell className="capitalize">{move.damageClass}</TableCell>}
                    {visible.includes('power') && <TableCell className="text-right">{move.power ?? '—'}</TableCell>}
                    {visible.includes('accuracy') && (
                      <TableCell className="text-right">{move.accuracy ?? '—'}</TableCell>
                    )}
                    {visible.includes('pp') && <TableCell className="text-right">{move.pp ?? '—'}</TableCell>}
                    {visible.includes('gen') && (
                      <TableCell className="text-right">{move.generation ?? '—'}</TableCell>
                    )}
                    {visible.includes('effect') && (
                      <TableCell className="max-w-md text-sm text-muted-foreground">
                        <span className="line-clamp-1">{move.shortEffect ?? ''}</span>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {moves.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">No moves match those filters.</p>
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

export default Moves;
