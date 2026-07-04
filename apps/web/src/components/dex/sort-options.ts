import type { PokemonSortField } from '@masterpokedex/shared';
import type { SortPickerOption } from '../SortPicker';

/**
 * The Pokédex's sort menu, names and explanations alike, shared so the Mega
 * and Gigantamax galleries say exactly the same things. SortPicker shows the
 * help lines in the open list only.
 */
export const POKEMON_SORT_OPTIONS: ReadonlyArray<SortPickerOption<PokemonSortField>> = [
  { value: 'id', label: 'Number' },
  { value: 'name', label: 'Name' },
  { value: 'total', label: 'Total Stats', help: 'All six base stats added up' },
  { value: 'hp', label: 'HP' },
  { value: 'attack', label: 'Attack' },
  { value: 'defense', label: 'Defense' },
  { value: 'specialAttack', label: 'Sp. Attack', help: 'Powers special (non-physical) moves' },
  { value: 'specialDefense', label: 'Sp. Defense', help: 'Withstands special moves' },
  { value: 'speed', label: 'Speed' },
];
