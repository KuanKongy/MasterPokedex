import React from 'react';
import { Link } from 'react-router-dom';
import type {
  AbilitySummary,
  EvolutionSearchRow,
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
    width: 'w-56',
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
  { key: 'specialAttack', label: 'Sp. Atk', defaultOn: true, sortField: 'specialAttack', width: 'w-20', alignRight: true, render: (p) => p.stats.specialAttack },
  { key: 'specialDefense', label: 'Sp. Def', defaultOn: true, sortField: 'specialDefense', width: 'w-20', alignRight: true, render: (p) => p.stats.specialDefense },
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
    width: 'w-56',
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
  { key: 'name', label: 'Name', defaultOn: true, sortField: 'name', width: 'w-56', render: (i) => <span className="font-medium">{i.displayName}</span> },
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
    width: 'w-56',
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
    width: 'w-56',
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

export const EVOLUTION_COLUMNS: ColumnDef<EvolutionSearchRow>[] = [
  {
    key: 'sprite',
    label: 'Image',
    defaultOn: true,
    width: 'w-14',
    render: (e) => (
      <Link to={`/pokemon/${e.toId}`}>
        {e.sprite && <img src={e.sprite} alt={e.toName} className="w-10 h-10 pixelated" />}
      </Link>
    ),
  },
  {
    key: 'from',
    label: 'From',
    defaultOn: true,
    width: 'w-40',
    render: (e) =>
      e.fromId ? (
        <Link to={`/pokemon/${e.fromId}`} className="font-medium hover:underline">
          {e.fromName}
        </Link>
      ) : (
        <span className="text-muted-foreground">{'—'}</span>
      ),
  },
  {
    key: 'pokemon',
    label: 'Evolves into',
    defaultOn: true,
    width: 'w-44',
    render: (e) => (
      <Link to={`/pokemon/${e.toId}`} className="font-medium hover:underline">
        {e.toName}
      </Link>
    ),
  },
  {
    key: 'trigger',
    label: 'Trigger',
    defaultOn: true,
    width: 'w-32',
    render: (e) => <span className="capitalize">{e.trigger?.replace(/-/g, ' ') ?? '—'}</span>,
  },
  {
    key: 'item',
    label: 'Item',
    defaultOn: true,
    width: 'w-36',
    render: (e) =>
      e.item ? (
        <span className="capitalize">{e.item.replace(/-/g, ' ')}</span>
      ) : (
        <span className="text-muted-foreground">{'—'}</span>
      ),
  },
  {
    key: 'minLevel',
    label: 'Level',
    defaultOn: true,
    width: 'w-20',
    alignRight: true,
    render: (e) => e.minLevel ?? '—',
  },
  {
    key: 'minHappiness',
    label: 'Friendship',
    help: 'Needs this much friendship before it evolves; friendship evolutions level up with no level requirement.',
    defaultOn: true,
    width: 'w-24',
    alignRight: true,
    render: (e) => e.minHappiness ?? '—',
  },
  {
    key: 'heldItem',
    label: 'Held item',
    width: 'w-36',
    render: (e) =>
      e.heldItem ? (
        <span className="capitalize">{e.heldItem.replace(/-/g, ' ')}</span>
      ) : (
        <span className="text-muted-foreground">{'—'}</span>
      ),
  },
  {
    key: 'timeOfDay',
    label: 'Time',
    width: 'w-24',
    render: (e) => <span className="capitalize">{e.timeOfDay ?? '—'}</span>,
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
  evolution: EVOLUTION_COLUMNS as ColumnDef<never>[],
};
