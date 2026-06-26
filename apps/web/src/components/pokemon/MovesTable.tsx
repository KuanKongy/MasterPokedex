import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { PokemonMove } from '@masterpokedex/shared';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TypeBadge } from '../ui/type-badge';
import { capitalize } from '../../utils/helpers';
import { cn } from '@/lib/utils';

const METHOD_SECTIONS: Array<{ method: string; title: string; note: string }> = [
  { method: 'level-up', title: 'Moves learnt by level up', note: 'in the latest games it appears in' },
  { method: 'machine', title: 'Moves learnt by TM', note: 'taught with a Technical Machine' },
  { method: 'egg', title: 'Egg moves', note: 'inherited through breeding' },
  { method: 'tutor', title: 'Move Tutor moves', note: 'taught by an in-game tutor' },
];

type SortKey = 'level' | 'name' | 'power' | 'accuracy' | 'pp';

const COLLAPSED_ROWS = 10;

function compareNullable(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1; // nulls last, either direction
  if (b === null) return -1;
  return (a - b) * dir;
}

/** One method's sortable table, collapsed to its first rows until expanded. */
const MethodSection: React.FC<{ title: string; note: string; moves: PokemonMove[]; showLevel: boolean }> = ({
  title,
  note,
  moves,
  showLevel,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(showLevel ? 'level' : 'name');
  const [dir, setDir] = useState<1 | -1>(1);

  const sorted = useMemo(() => {
    const rows = [...moves];
    rows.sort((a, b) => {
      switch (sortKey) {
        case 'level':
          return compareNullable(a.levelLearnedAt, b.levelLearnedAt, dir) || a.name.localeCompare(b.name);
        case 'power':
          return compareNullable(a.power, b.power, dir) || a.name.localeCompare(b.name);
        case 'accuracy':
          return compareNullable(a.accuracy, b.accuracy, dir) || a.name.localeCompare(b.name);
        case 'pp':
          return compareNullable(a.pp, b.pp, dir) || a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name) * dir;
      }
    });
    return rows;
  }, [moves, sortKey, dir]);

  const shown = expanded ? sorted : sorted.slice(0, COLLAPSED_ROWS);

  const header = (key: SortKey, label: string, alignRight = false) => (
    <TableHead
      onClick={() => {
        if (sortKey === key) setDir((d) => (d === 1 ? -1 : 1));
        else {
          setSortKey(key);
          setDir(1);
        }
      }}
      aria-sort={sortKey === key ? (dir === 1 ? 'ascending' : 'descending') : undefined}
      className={cn('cursor-pointer select-none whitespace-nowrap hover:text-foreground', alignRight && 'text-right')}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === key && (dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </span>
    </TableHead>
  );

  return (
    <section className="mb-6 last:mb-0">
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {moves.length} move{moves.length === 1 ? '' : 's'} · {note}
        </span>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showLevel && header('level', 'Lv.')}
              {header('name', 'Move')}
              <TableHead>Type</TableHead>
              <TableHead>Class</TableHead>
              {header('power', 'Power', true)}
              {header('accuracy', 'Acc.', true)}
              {header('pp', 'PP', true)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((move) => (
              <TableRow key={`${move.name}-${move.levelLearnedAt ?? ''}`}>
                {showLevel && (
                  <TableCell className="w-12 text-muted-foreground">{move.levelLearnedAt ?? '—'}</TableCell>
                )}
                <TableCell className="font-medium">
                  {move.slug ? (
                    <Link to={`/moves/${move.slug}`} className="hover:underline">
                      {capitalize(move.name.replace(/-/g, ' '))}
                    </Link>
                  ) : (
                    capitalize(move.name.replace(/-/g, ' '))
                  )}
                </TableCell>
                <TableCell>
                  <TypeBadge type={move.type} size="sm" icon />
                </TableCell>
                <TableCell className="capitalize">{move.damageClass}</TableCell>
                <TableCell className="text-right">{move.power ?? '—'}</TableCell>
                <TableCell className="text-right">{move.accuracy ?? '—'}</TableCell>
                <TableCell className="text-right">{move.pp ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {sorted.length > COLLAPSED_ROWS && (
        <div className="mt-2 flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show fewer' : `Show all ${sorted.length}`}
          </Button>
        </div>
      )}
    </section>
  );
};

/** The whole learnset, grouped the way players think about it: by method. */
const MovesTable: React.FC<{ moves: PokemonMove[] }> = ({ moves }) => {
  const byMethod = useMemo(() => {
    const buckets = new Map<string, PokemonMove[]>();
    for (const move of moves) {
      const bucket = buckets.get(move.learnMethod) ?? [];
      bucket.push(move);
      buckets.set(move.learnMethod, bucket);
    }
    return buckets;
  }, [moves]);

  const known = new Set(METHOD_SECTIONS.map((s) => s.method));
  const other = moves.filter((m) => !known.has(m.learnMethod));

  if (moves.length === 0) return <p className="text-sm text-muted-foreground">No move data.</p>;

  return (
    <div>
      {METHOD_SECTIONS.map(({ method, title, note }) => {
        const sectionMoves = byMethod.get(method);
        if (!sectionMoves || sectionMoves.length === 0) return null;
        return (
          <MethodSection
            key={method}
            title={title}
            note={note}
            moves={sectionMoves}
            showLevel={method === 'level-up'}
          />
        );
      })}
      {other.length > 0 && (
        <MethodSection title="Other moves" note="special acquisition methods" moves={other} showLevel={false} />
      )}
    </div>
  );
};

export default MovesTable;
