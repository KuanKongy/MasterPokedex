import React from 'react';
import { Link } from 'react-router-dom';
import type {
  AbilitySummary,
  ItemSummary,
  LocationSearchRow,
  MoveSummary,
  PokemonSummary,
} from '@masterpokedex/shared';
import type { FilterEntity } from '@masterpokedex/shared';
import { Badge } from '@/components/ui/badge';
import { TypeBadge } from '@/components/ui/type-badge';
import ItemSprite from '@/components/ItemSprite';
import { capitalize } from '../../utils/helpers';

/**
 * The results half of the advanced search, as data: one column registry per
 * entity, so adding an entity means a meta array (shared), a server column
 * map (API) and one entry here — not another hand-written table.
 */
export type ColumnDef<Row> = {
  key: string;
  label: string;
  /** Short explainer shown as a HelpTip in the results header. */
  help?: string;
  defaultOn?: boolean;
  render: (row: Row) => React.ReactNode;
};

export const POKEMON_COLUMNS: ColumnDef<PokemonSummary>[] = [
  {
    key: 'image',
    label: 'Image',
    defaultOn: true,
    render: (p) => (
      <Link to={`/pokemon/${p.id}`}>
        {p.sprite && <img src={p.sprite} alt={p.name} className="w-10 h-10 pixelated" />}
      </Link>
    ),
  },
  { key: 'id', label: 'ID', defaultOn: true, render: (p) => `#${p.id}` },
  {
    key: 'name',
    label: 'Name',
    defaultOn: true,
    render: (p) => (
      <Link to={`/pokemon/${p.id}`} className="font-medium hover:underline">
        {capitalize(p.name)}
      </Link>
    ),
  },
  {
    key: 'types',
    label: 'Types',
    defaultOn: true,
    render: (p) => (
      <div className="flex gap-1">
        {p.types.map((type) => (
          <TypeBadge key={type} type={type} size="sm" />
        ))}
      </div>
    ),
  },
  {
    key: 'total',
    label: 'Total',
    defaultOn: true,
    render: (p) => <Badge variant="secondary">{p.stats.total}</Badge>,
  },
  { key: 'hp', label: 'HP', defaultOn: true, render: (p) => p.stats.hp },
  { key: 'attack', label: 'Attack', defaultOn: true, render: (p) => p.stats.attack },
  { key: 'defense', label: 'Defense', defaultOn: true, render: (p) => p.stats.defense },
  { key: 'specialAttack', label: 'Sp. Atk', render: (p) => p.stats.specialAttack },
  { key: 'specialDefense', label: 'Sp. Def', render: (p) => p.stats.specialDefense },
  { key: 'speed', label: 'Speed', defaultOn: true, render: (p) => p.stats.speed },
  { key: 'height', label: 'Height', help: 'In the games\u2019 raw unit: decimetres (10 = 1 m).', render: (p) => p.height },
  { key: 'weight', label: 'Weight', help: 'In the games\u2019 raw unit: hectograms (10 = 1 kg).', render: (p) => p.weight },
  {
    key: 'baseExperience',
    label: 'Base Exp.',
    help: 'The experience defeating one is worth, before level multipliers.',
    render: (p) => p.baseExperience ?? '\u2014',
  },
];

export const MOVE_COLUMNS: ColumnDef<MoveSummary>[] = [
  {
    key: 'name',
    label: 'Move',
    defaultOn: true,
    render: (m) => (
      <Link to={`/moves/${m.name}`} className="font-medium hover:underline">
        {m.displayName}
      </Link>
    ),
  },
  {
    key: 'type',
    label: 'Type',
    defaultOn: true,
    render: (m) => <TypeBadge type={m.type} size="sm" icon />,
  },
  { key: 'damageClass', label: 'Class', defaultOn: true, render: (m) => capitalize(m.damageClass) },
  { key: 'power', label: 'Power', defaultOn: true, render: (m) => m.power ?? '—' },
  { key: 'accuracy', label: 'Acc.', defaultOn: true, render: (m) => m.accuracy ?? '—' },
  { key: 'pp', label: 'PP', defaultOn: true, render: (m) => m.pp ?? '—' },
  { key: 'priority', label: 'Priority', render: (m) => m.priority },
  { key: 'generation', label: 'Gen', render: (m) => m.generation ?? '—' },
  {
    key: 'effect',
    label: 'Effect',
    defaultOn: true,
    render: (m) => (
      <span className="line-clamp-1 max-w-md text-sm text-muted-foreground">{m.shortEffect ?? ''}</span>
    ),
  },
];

export const ITEM_COLUMNS: ColumnDef<ItemSummary>[] = [
  {
    key: 'image',
    label: 'Image',
    defaultOn: true,
    render: (i) => <ItemSprite src={i.sprite} itemName={i.name} alt={i.displayName} className="w-8 h-8" />,
  },
  { key: 'name', label: 'Name', defaultOn: true, render: (i) => <span className="font-medium">{i.displayName}</span> },
  { key: 'category', label: 'Category', defaultOn: true, render: (i) => i.category ?? '—' },
  { key: 'cost', label: 'Cost', defaultOn: true, render: (i) => (i.cost ? `₽${i.cost}` : '—') },
  {
    key: 'effect',
    label: 'Effect',
    defaultOn: true,
    render: (i) => (
      <span className="line-clamp-1 max-w-md text-sm text-muted-foreground">{i.effect ?? ''}</span>
    ),
  },
];

export const ABILITY_COLUMNS: ColumnDef<AbilitySummary>[] = [
  {
    key: 'name',
    label: 'Ability',
    defaultOn: true,
    render: (a) => (
      <Link to={`/abilities/${a.name}`} className="font-medium hover:underline">
        {a.displayName}
      </Link>
    ),
  },
  {
    key: 'effect',
    label: 'Effect',
    defaultOn: true,
    render: (a) => (
      <span className="line-clamp-2 max-w-xl text-sm text-muted-foreground">{a.shortEffect ?? ''}</span>
    ),
  },
  { key: 'generation', label: 'Gen', defaultOn: true, render: (a) => a.generation ?? '—' },
  { key: 'pokemonCount', label: 'Pokémon', defaultOn: true, render: (a) => a.pokemonCount },
];

export const LOCATION_COLUMNS: ColumnDef<LocationSearchRow>[] = [
  {
    key: 'name',
    label: 'Location',
    defaultOn: true,
    render: (l) => (
      <Link to={`/locations/${l.id}`} className="font-medium hover:underline">
        {l.displayName}
      </Link>
    ),
  },
  { key: 'region', label: 'Region', defaultOn: true, render: (l) => l.regionName ?? '—' },
  {
    key: 'kind',
    label: 'Kind',
    defaultOn: true,
    render: (l) => <span className="capitalize">{l.kind ?? '—'}</span>,
  },
  { key: 'areaCount', label: 'Areas', defaultOn: true, render: (l) => l.areaCount },
  {
    key: 'hasEncounters',
    label: 'Encounters',
    defaultOn: true,
    render: (l) => (l.hasEncounters ? <Badge variant="secondary">Yes</Badge> : <span className="text-muted-foreground">No</span>),
  },
];

// A registry keyed like ENTITY_FILTER_META; rows are typed per entity at the
// use site, so the registry itself stays loosely typed.
export const ENTITY_COLUMNS: Record<FilterEntity, ColumnDef<never>[]> = {
  pokemon: POKEMON_COLUMNS as ColumnDef<never>[],
  move: MOVE_COLUMNS as ColumnDef<never>[],
  ability: ABILITY_COLUMNS as ColumnDef<never>[],
  item: ITEM_COLUMNS as ColumnDef<never>[],
  location: LOCATION_COLUMNS as ColumnDef<never>[],
};
