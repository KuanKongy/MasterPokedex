import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import HelpTip from '../HelpTip';

/** The nine generations and their regions; shared by every page that filters on them. */
export const GENERATIONS: Array<{ gen: number; region: string }> = [
  { gen: 1, region: 'Kanto' },
  { gen: 2, region: 'Johto' },
  { gen: 3, region: 'Hoenn' },
  { gen: 4, region: 'Sinnoh' },
  { gen: 5, region: 'Unova' },
  { gen: 6, region: 'Kalos' },
  { gen: 7, region: 'Alola' },
  { gen: 8, region: 'Galar' },
  { gen: 9, region: 'Paldea' },
];

/** The "Generation N · Region · count" corner writing the dex pages share. */
export const GenHeading: React.FC<{ gen: number; region: string; count: number }> = ({ gen, region, count }) => (
  <>
    <h2 className="text-xl font-bold">Generation {gen}</h2>
    <span className="text-sm text-muted-foreground">
      {region}
      {count > 0 && ` · ${count} Pokémon`}
    </span>
    <HelpTip title="Generations">
      A generation is the set of games that introduced these Pokémon, and the region is
      the world those games take place in.
    </HelpTip>
  </>
);

/**
 * One generation dropdown for the list pages, sitting to the right of the
 * search bar. 'all' means no filter; pages carry the value as ?gen=.
 */
const GenerationFilter: React.FC<{
  value: string;
  onChange: (next: string) => void;
  className?: string;
}> = ({ value, onChange, className }) => (
  <Select value={value} onValueChange={onChange}>
    <SelectTrigger className={className ?? 'w-full sm:w-44'} aria-label="Filter by generation">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All generations</SelectItem>
      {GENERATIONS.map(({ gen, region }) => (
        <SelectItem key={gen} value={String(gen)}>
          Gen {gen} · {region}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

export default GenerationFilter;
