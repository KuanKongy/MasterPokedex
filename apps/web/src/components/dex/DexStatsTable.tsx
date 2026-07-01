import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { PokemonSortField, PokemonSummary, SortDir } from '@masterpokedex/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TypeBadge } from '../ui/type-badge';
import ColumnToggle from '../ColumnToggle';
import HelpTip from '../HelpTip';
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
};

const STAT_KEYS = STAT_COLUMNS.map((c) => c.key);

/** The pokemondb-style full-stats view; header clicks re-sort server-side. */
const DexStatsTable: React.FC<DexStatsTableProps> = ({ pokemon, sort, dir, onSort }) => {
  const { spriteStyle } = useSpritePref();
  const { visible, toggle } = useColumnPrefs('dex-stats', STAT_KEYS, STAT_KEYS);
  const shownStats = STAT_COLUMNS.filter((c) => visible.includes(c.key));

  const header = (key: PokemonSortField, label: string, alignRight = false, help?: string) => (
    <TableHead
      key={key}
      onClick={() => onSort(key)}
      aria-sort={sort === key ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn('cursor-pointer select-none whitespace-nowrap hover:text-foreground', alignRight && 'text-right')}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {help && <HelpTip title={label}>{help}</HelpTip>}
        {sort === key &&
          (dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </span>
    </TableHead>
  );

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <ColumnToggle columns={STAT_COLUMNS} visible={visible} onToggle={toggle} />
      </div>
      <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {header('id', '#')}
            {header('name', 'Name')}
            <TableHead>Types</TableHead>
            {shownStats.map((col) => header(col.key, col.label, true, col.help))}
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
                    className={cn('h-8 w-8 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                  />
                  {capitalize(p.name)}
                </Link>
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  {p.types.map((type) => (
                    <TypeBadge key={type} type={type} size="sm" />
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
