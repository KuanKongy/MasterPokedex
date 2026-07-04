import React from 'react';
import { Link } from 'react-router-dom';
import type { PokemonSortField, PokemonSummary, SortDir } from '@masterpokedex/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TypeBadge } from '../ui/type-badge';
import ColumnToggle from '../ColumnToggle';
import SortableHead from '../SortableHead';
import { useColumnPrefs } from '@/hooks/useColumnPrefs';
import { capitalize } from '../../utils/helpers';
import { cn } from '@/lib/utils';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';

const STAT_COLUMNS: Array<{ key: PokemonSortField; label: string; help: string }> = [
  { key: 'total', label: 'Total', help: 'The six base stats added up (BST): the quick read on overall strength.' },
  { key: 'hp', label: 'HP', help: 'Hit Points: how much damage it can take.' },
  { key: 'attack', label: 'Atk', help: 'Attack: powers physical moves.' },
  { key: 'defense', label: 'Def', help: 'Defense: withstands physical moves.' },
  { key: 'specialAttack', label: 'Sp.A', help: 'Special Attack: powers special moves.' },
  { key: 'specialDefense', label: 'Sp.D', help: 'Special Defense: withstands special moves.' },
  { key: 'speed', label: 'Spe', help: 'Speed: the faster Pokémon usually moves first.' },
];

type DexStatsTableProps = {
  pokemon: PokemonSummary[];
  sort: PokemonSortField;
  dir: SortDir;
  onSort: (field: PokemonSortField) => void;
  /** When set, rendered left of the column picker so both share one row. */
  heading?: React.ReactNode;
};

const STAT_KEYS = STAT_COLUMNS.map((c) => c.key);

/** The pokemondb-style full-stats view; header clicks re-sort server-side. */
const DexStatsTable: React.FC<DexStatsTableProps> = ({ pokemon, sort, dir, onSort, heading }) => {
  const { spriteStyle } = useSpritePref();
  const { visible, toggle } = useColumnPrefs('dex-stats', STAT_KEYS, STAT_KEYS);
  const shownStats = STAT_COLUMNS.filter((c) => visible.includes(c.key));

  const columnToggle = <ColumnToggle columns={STAT_COLUMNS} visible={visible} onToggle={toggle} />;

  return (
    <div>
      {heading ? (
        <div className="mb-3 flex min-h-[49px] items-center justify-between gap-3 border-b pb-2">
          <div className="flex min-w-0 items-baseline gap-3">{heading}</div>
          {columnToggle}
        </div>
      ) : (
        <div className="mb-3 flex min-h-[49px] items-center justify-end border-b pb-2">{columnToggle}</div>
      )}
      <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHead field="id" label="#" sort={sort} dir={dir} onSort={onSort} className="w-20" />
            <SortableHead field="name" label="Name" sort={sort} dir={dir} onSort={onSort} className="w-64" />
            <TableHead className="min-w-[9rem]">Types</TableHead>
            {shownStats.map((col) => (
              <SortableHead
                key={col.key}
                field={col.key}
                label={col.label}
                sort={sort}
                dir={dir}
                onSort={onSort}
                alignRight
                help={col.help}
                className="w-20"
              />
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pokemon.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="text-muted-foreground">{p.id.toString().padStart(4, '0')}</TableCell>
              <TableCell>
                <Link to={`/pokemon/${p.id}`} className="flex items-center gap-2 font-medium hover:underline">
                  <img
                    src={pokemonImage(p.id, spriteStyle)}
                    alt=""
                    loading="lazy"
                    onError={(e) => spriteFallback(e, p.id)}
                    className={cn('h-12 w-12 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                  />
                  {p.formLabel ?? capitalize(p.name)}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {p.types.map((type) => (
                    <TypeBadge key={type} type={type} size="sm" link />
                  ))}
                </div>
              </TableCell>
              {shownStats.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn('text-right', col.key === 'total' && 'font-semibold')}
                >
                  {p.stats[col.key as keyof typeof p.stats]}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
};

export default DexStatsTable;
