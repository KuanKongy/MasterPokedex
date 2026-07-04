import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PokemonMove, SortDir } from '@masterpokedex/shared';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHeader, TableRow } from '@/components/ui/table';
import { TypeBadge } from '../ui/type-badge';
import HelpTip from '../HelpTip';
import SortableHead from '../SortableHead';
import { capitalize } from '../../utils/helpers';

/** Exported so MoveDetail's learner sections can reuse the same explainers. */
export const METHOD_SECTIONS: Array<{ method: string; title: string; note: string; help: string }> = [
  {
    method: 'level-up',
    title: 'Moves learnt by level up',
    note: 'in the latest games it appears in',
    help: 'Learned automatically on reaching each level. Learn levels differ between games; the newest game that has this Pokémon is shown.',
  },
  {
    method: 'machine',
    title: 'Moves learnt by TM',
    note: 'taught with a Technical Machine',
    help: 'Technical Machines are items that teach a move directly: find or buy the TM, use it, done.',
  },
  {
    method: 'egg',
    title: 'Egg moves',
    note: 'inherited through breeding',
    help: 'Moves a hatchling can only inherit from its parents at the day care; bred, not taught.',
  },
  {
    method: 'tutor',
    title: 'Move Tutor moves',
    note: 'taught by an in-game tutor',
    help: 'Taught by specific characters in the games, often for a fee of Battle Points or items.',
  },
];

type SortKey = 'level' | 'name' | 'type' | 'class' | 'power' | 'accuracy' | 'pp';

/** Numeric columns read best highest-first, like the list pages. */
const DESC_FIRST: ReadonlySet<SortKey> = new Set(['power', 'accuracy', 'pp']);

const COLLAPSED_ROWS = 10;

function compareNullable(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1; // nulls last, either direction
  if (b === null) return -1;
  return (a - b) * dir;
}

/** One method's sortable table, collapsed to its first rows until expanded. */
const MethodSection: React.FC<{ title: string; note: string; help?: string; moves: PokemonMove[]; showLevel: boolean }> = ({
  title,
  note,
  moves,
  help,
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
        case 'type':
          return a.type.localeCompare(b.type) * dir || a.name.localeCompare(b.name);
        case 'class':
          return a.damageClass.localeCompare(b.damageClass) * dir || a.name.localeCompare(b.name);
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

  const dirName: SortDir = dir === 1 ? 'asc' : 'desc';
  const handleSort = (key: SortKey) => {
    if (sortKey === key) setDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setDir(DESC_FIRST.has(key) ? -1 : 1);
    }
  };

  return (
    <section className="mb-6 last:mb-0">
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">
          {moves.length} move{moves.length === 1 ? '' : 's'} · {note}
        </span>
        {help && <HelpTip title={title}>{help}</HelpTip>}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {showLevel && (
                <SortableHead field="level" label="Lv." sort={sortKey} dir={dirName} onSort={handleSort} className="w-14" />
              )}
              <SortableHead field="name" label="Move" sort={sortKey} dir={dirName} onSort={handleSort} className="w-48" />
              <SortableHead field="type" label="Type" sort={sortKey} dir={dirName} onSort={handleSort} className="w-28" />
              <SortableHead
                field="class"
                label="Class"
                helpTitle="Damage class"
                help="Physical moves use Attack, special moves use Sp. Attack, and status moves deal no direct damage."
                sort={sortKey}
                dir={dirName}
                onSort={handleSort}
                className="w-24"
              />
              <SortableHead
                field="power"
                label="Power"
                help="The move’s base damage; “—” means variable or no direct damage."
                sort={sortKey}
                dir={dirName}
                onSort={handleSort}
                alignRight
                className="w-20"
              />
              <SortableHead
                field="accuracy"
                label="Acc."
                helpTitle="Accuracy"
                help="Chance to hit, in percent; “—” never misses."
                sort={sortKey}
                dir={dirName}
                onSort={handleSort}
                alignRight
                className="w-20"
              />
              <SortableHead
                field="pp"
                label="PP"
                help="Power Points: how many times the move can be used before resting."
                sort={sortKey}
                dir={dirName}
                onSort={handleSort}
                alignRight
                className="w-20"
              />
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
                  <TypeBadge type={move.type} size="sm" icon link />
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
      {METHOD_SECTIONS.map(({ method, title, note, help }) => {
        const sectionMoves = byMethod.get(method);
        if (!sectionMoves || sectionMoves.length === 0) return null;
        return (
          <MethodSection
            key={method}
            title={title}
            note={note}
            help={help}
            moves={sectionMoves}
            showLevel={method === 'level-up'}
          />
        );
      })}
      {other.length > 0 && (
        <MethodSection
          title="Other moves"
          note="special acquisition methods"
          help="Moves picked up outside the usual four routes: event distributions, form changes, or one-off teachings."
          moves={other}
          showLevel={false}
        />
      )}
    </div>
  );
};

export default MovesTable;
