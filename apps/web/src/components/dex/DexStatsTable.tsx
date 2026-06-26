import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { PokemonSortField, PokemonSummary, SortDir } from '@masterpokedex/shared';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TypeBadge } from '../ui/type-badge';
import { capitalize } from '../../utils/helpers';
import { cn } from '@/lib/utils';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';

const STAT_COLUMNS: Array<{ key: PokemonSortField; label: string }> = [
  { key: 'total', label: 'Total' },
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'Atk' },
  { key: 'defense', label: 'Def' },
  { key: 'specialAttack', label: 'Sp.A' },
  { key: 'specialDefense', label: 'Sp.D' },
  { key: 'speed', label: 'Spe' },
];

type DexStatsTableProps = {
  pokemon: PokemonSummary[];
  sort: PokemonSortField;
  dir: SortDir;
  onSort: (field: PokemonSortField) => void;
};

/** The pokemondb-style full-stats view; header clicks re-sort server-side. */
const DexStatsTable: React.FC<DexStatsTableProps> = ({ pokemon, sort, dir, onSort }) => {
  const { spriteStyle } = useSpritePref();

  const header = (key: PokemonSortField, label: string, alignRight = false) => (
    <TableHead
      key={key}
      onClick={() => onSort(key)}
      aria-sort={sort === key ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn('cursor-pointer select-none whitespace-nowrap hover:text-foreground', alignRight && 'text-right')}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sort === key &&
          (dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
      </span>
    </TableHead>
  );

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {header('id', '#')}
            {header('name', 'Name')}
            <TableHead>Types</TableHead>
            {STAT_COLUMNS.map((col) => header(col.key, col.label, true))}
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
              <TableCell className="text-right font-semibold">{p.stats.total}</TableCell>
              <TableCell className="text-right">{p.stats.hp}</TableCell>
              <TableCell className="text-right">{p.stats.attack}</TableCell>
              <TableCell className="text-right">{p.stats.defense}</TableCell>
              <TableCell className="text-right">{p.stats.specialAttack}</TableCell>
              <TableCell className="text-right">{p.stats.specialDefense}</TableCell>
              <TableCell className="text-right">{p.stats.speed}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DexStatsTable;
