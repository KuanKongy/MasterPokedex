import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  DAMAGE_CLASSES,
  MOVE_SORT_FIELDS,
  POKEMON_TYPES,
  type MoveSortField,
  type MoveSummary,
  type SortDir,
} from '@masterpokedex/shared';
import { useAllMoves } from '@/hooks/api/dex';
import LoadingSpinner from '../components/LoadingSpinner';
import HelpTip from '../components/HelpTip';
import SearchField from '../components/SearchField';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TypeBadge } from '../components/ui/type-badge';
import ColumnToggle from '../components/ColumnToggle';
import SortableHead from '../components/SortableHead';
import { useColumnPrefs } from '@/hooks/useColumnPrefs';
import { capitalize } from '../utils/helpers';
import { makeComparator } from '../utils/clientSort';

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

/** Stats read best highest-first, so their first click sorts descending. */
const DESC_FIRST = new Set<MoveSortField>(['power', 'accuracy', 'pp']);

/** name sorts on displayName because the SQL it replaces sorted m.display_name. */
const MOVE_SORT_GETTERS: Record<MoveSortField, (m: MoveSummary) => string | number | null> = {
  id: (m) => m.id,
  name: (m) => m.displayName,
  power: (m) => m.power,
  pp: (m) => m.pp,
  accuracy: (m) => m.accuracy,
  priority: (m) => m.priority,
  generation: (m) => m.generation,
};

const PAGE_SIZE = 100;

/** The full move dex: filterable, linked through to per-move pages. */
const Moves: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const type = params.get('type') ?? 'all';
  const damageClass = params.get('class') ?? 'all';
  const sortParam = params.get('sort');
  const sort: MoveSortField = (MOVE_SORT_FIELDS as readonly string[]).includes(sortParam ?? '')
    ? (sortParam as MoveSortField)
    : 'id';
  const dir: SortDir = params.get('dir') === 'desc' ? 'desc' : 'asc';

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

  const handleSort = (field: MoveSortField) => {
    const nextDir: SortDir =
      sort === field ? (dir === 'asc' ? 'desc' : 'asc') : DESC_FIRST.has(field) ? 'desc' : 'asc';
    patch({ sort: field, dir: nextDir });
  };

  // The whole move dex is loaded once and filtered/sorted right here, so
  // typing, the selects and header clicks all respond without a round trip.
  const { data: allMoves, isLoading } = useAllMoves();
  const moves = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const filtered = (allMoves ?? []).filter(
      (m) =>
        (!ql || m.displayName.toLowerCase().includes(ql) || m.name.toLowerCase().includes(ql)) &&
        (type === 'all' || m.type === type) &&
        (damageClass === 'all' || m.damageClass === damageClass),
    );
    return filtered.sort(makeComparator(MOVE_SORT_GETTERS[sort], dir));
  }, [allMoves, q, type, damageClass, sort, dir]);

  const [shown, setShown] = useState(PAGE_SIZE);
  useEffect(() => setShown(PAGE_SIZE), [q, type, damageClass, sort, dir]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Moves</h1>
      <p className="text-muted-foreground mb-8">Every move in the dex — power, accuracy, PP and effect</p>

      <div className="mb-6 flex flex-col gap-4 md:flex-row">
        {/* Filters as you type; the whole list is client-side. */}
        <SearchField
          value={q}
          onChange={(value) => patch({ q: value || null })}
          onSubmit={() => undefined}
          placeholder="Search moves…"
          className="flex-1"
        />
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
                  <SortableHead field="name" label="Move" sort={sort} dir={dir} onSort={handleSort} className="min-w-[11rem]" />
                  {visible.includes('type') && <TableHead className="w-28">Type</TableHead>}
                  {visible.includes('class') && (
                    <TableHead className="w-24">
                      Class
                      <HelpTip title="Damage class" className="ml-1">
                        Physical moves use Attack, special moves use Sp. Attack, and status
                        moves deal no direct damage.
                      </HelpTip>
                    </TableHead>
                  )}
                  {visible.includes('power') && (
                    <SortableHead
                      field="power"
                      label="Power"
                      sort={sort}
                      dir={dir}
                      onSort={handleSort}
                      alignRight
                      help={'Base damage; "—" means variable or no direct damage.'}
                      className="w-20"
                    />
                  )}
                  {visible.includes('accuracy') && (
                    <SortableHead
                      field="accuracy"
                      label="Acc."
                      helpTitle="Accuracy"
                      sort={sort}
                      dir={dir}
                      onSort={handleSort}
                      alignRight
                      help={'Chance to hit, in percent; "—" never misses.'}
                      className="w-20"
                    />
                  )}
                  {visible.includes('pp') && (
                    <SortableHead
                      field="pp"
                      label="PP"
                      sort={sort}
                      dir={dir}
                      onSort={handleSort}
                      alignRight
                      help="Power Points: how many uses before resting."
                      className="w-20"
                    />
                  )}
                  {visible.includes('gen') && (
                    <SortableHead
                      field="generation"
                      label="Gen"
                      helpTitle="Generation"
                      sort={sort}
                      dir={dir}
                      onSort={handleSort}
                      alignRight
                      help="The generation of games that introduced the move."
                      className="w-20"
                    />
                  )}
                  {visible.includes('effect') && <TableHead>Effect</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {moves.slice(0, shown).map((move) => (
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
          {moves.length > shown && (
            <div className="mt-6 flex justify-center">
              <Button variant="outline" onClick={() => setShown((n) => n + PAGE_SIZE)}>
                Show more ({moves.length - shown} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Moves;
