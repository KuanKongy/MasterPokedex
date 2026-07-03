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
  /** The API sort field this column maps to; absent means not sortable. */
  sortField?: string;
  /** Tailwind width class applied to the header and body cells for stability. */
  width?: string;
  /** Right-align header and cells (numeric columns). */
  alignRight?: boolean;
  render: (row: Row) => React.ReactNode;
};

export const POKEMON_COLUMNS: ColumnDef<PokemonSummary>[] = [
  {
    key: 'image',
    width: 'w-14',
    label: 'Image',
    defaultOn: true,
    render: (p) => (
      <Link to={`/pokemon/${p.id}`}>
        {p.sprite && <img src={p.sprite} alt={p.name} className="w-10 h-10 pixelated" />}
      </Link>
    ),
  },
  { key: 'id', label: 'ID', defaultOn: true, sortField: 'id', width: 'w-16', render: (p) => `#${p.id}` },
  {
    key: 'name',
    width: 'min-w-[10rem]',
    label: 'Name',
    defaultOn: true,
    sortField: 'name',
    render: (p) => (
      <Link to={`/pokemon/${p.id}`} className="font-medium hover:underline">
        {p.formLabel ?? capitalize(p.name)}
      </Link>
    ),
  },
  {
    key: 'form',
    label: 'Form',
    help: 'Battle and regional forms (Mega, Gigantamax, Alolan and so on) when the results include them.',
    render: (p) =>
      p.isDefault === false && p.formLabel ? <Badge variant="outline">{p.formLabel}</Badge> : null,
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
    width: 'w-20', alignRight: true,
    label: 'Total',
    defaultOn: true,
    sortField: 'total',
    render: (p) => <Badge variant="secondary">{p.stats.total}</Badge>,
  },
  { key: 'hp', label: 'HP', defaultOn: true, sortField: 'hp', width: 'w-20', alignRight: true, render: (p) => p.stats.hp },
  { key: 'attack', label: 'Attack', defaultOn: true, sortField: 'attack', width: 'w-20', alignRight: true, render: (p) => p.stats.attack },
  { key: 'defense', label: 'Defense', defaultOn: true, sortField: 'defense', width: 'w-20', alignRight: true, render: (p) => p.stats.defense },
  { key: 'specialAttack', label: 'Sp. Atk', sortField: 'specialAttack', width: 'w-20', alignRight: true, render: (p) => p.stats.specialAttack },
  { key: 'specialDefense', label: 'Sp. Def', sortField: 'specialDefense', width: 'w-20', alignRight: true, render: (p) => p.stats.specialDefense },
  { key: 'speed', label: 'Speed', defaultOn: true, sortField: 'speed', width: 'w-20', alignRight: true, render: (p) => p.stats.speed },
  { key: 'height', label: 'Height', help: 'In the games\u2019 raw unit: decimetres (10 = 1 m).', sortField: 'height', width: 'w-24', alignRight: true, render: (p) => p.height },
  { key: 'weight', label: 'Weight', help: 'In the games\u2019 raw unit: hectograms (10 = 1 kg).', sortField: 'weight', width: 'w-24', alignRight: true, render: (p) => p.weight },
  {
    key: 'baseExperience',
    width: 'w-24', alignRight: true,
    label: 'Base Exp.',
    help: 'The experience defeating one is worth, before level multipliers.',
    sortField: 'baseExperience',
    render: (p) => p.baseExperience ?? '\u2014',
  },
  {
    key: 'generation',
    width: 'w-16', alignRight: true,
    label: 'Gen',
    help: 'The generation of games that introduced this Pok\u00e9mon.',
    sortField: 'generation',
    render: (p) => p.generation,
  },
];

export const MOVE_COLUMNS: ColumnDef<MoveSummary>[] = [
  {
    key: 'name',
    width: 'min-w-[10rem]',
    label: 'Move',
    defaultOn: true,
    sortField: 'name',
    render: (m) => (
      <Link to={`/moves/${m.name}`} className="font-medium hover:underline">
        {m.displayName}
      </Link>
    ),
  },
  {
    key: 'type',
    width: 'w-28',
    label: 'Type',
    defaultOn: true,
    render: (m) => <TypeBadge type={m.type} size="sm" icon />,
  },
  { key: 'damageClass', label: 'Class', defaultOn: true, width: 'w-24', render: (m) => capitalize(m.damageClass) },
  { key: 'power', label: 'Power', defaultOn: true, sortField: 'power', width: 'w-20', alignRight: true, render: (m) => m.power ?? '—' },
  { key: 'accuracy', label: 'Acc.', defaultOn: true, sortField: 'accuracy', width: 'w-20', alignRight: true, render: (m) => m.accuracy ?? '—' },
  { key: 'pp', label: 'PP', defaultOn: true, sortField: 'pp', width: 'w-20', alignRight: true, render: (m) => m.pp ?? '—' },
  { key: 'priority', label: 'Priority', sortField: 'priority', width: 'w-20', alignRight: true, render: (m) => m.priority },
  { key: 'generation', label: 'Gen', sortField: 'generation', width: 'w-16', alignRight: true, render: (m) => m.generation ?? '—' },
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
  { key: 'name', label: 'Name', defaultOn: true, sortField: 'name', width: 'min-w-[10rem]', render: (i) => <span className="font-medium">{i.displayName}</span> },
  { key: 'category', label: 'Category', defaultOn: true, sortField: 'category', width: 'w-32', render: (i) => i.category ?? '—' },
  { key: 'cost', label: 'Cost', defaultOn: true, sortField: 'cost', width: 'w-24', alignRight: true, render: (i) => (i.cost ? `₽${i.cost}` : '—') },
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
    width: 'min-w-[11rem]',
    label: 'Ability',
    defaultOn: true,
    sortField: 'name',
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
  { key: 'generation', label: 'Gen', defaultOn: true, sortField: 'generation', width: 'w-16', alignRight: true, render: (a) => a.generation ?? '—' },
  { key: 'pokemonCount', label: 'Pokémon', defaultOn: true, sortField: 'pokemonCount', width: 'w-24', alignRight: true, render: (a) => a.pokemonCount },
];

export const LOCATION_COLUMNS: ColumnDef<LocationSearchRow>[] = [
  {
    key: 'name',
    width: 'min-w-[11rem]',
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
  { key: 'areaCount', label: 'Areas', defaultOn: true, width: 'w-20', alignRight: true, render: (l) => l.areaCount },
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
