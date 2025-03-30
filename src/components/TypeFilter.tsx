
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { capitalize } from '../utils/helpers';

const pokemonTypes = [
  'all', 'normal', 'fire', 'water', 'electric', 'grass', 'ice', 
  'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 
  'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
];

interface TypeFilterProps {
  selectedType: string;
  setSelectedType: (type: string) => void;
}

const TypeFilter: React.FC<TypeFilterProps> = ({ selectedType, setSelectedType }) => {
  return (
    <div className="space-y-2">
      <h3 className="font-medium">Filter by Type</h3>
      <div className="flex flex-wrap gap-2">
        {pokemonTypes.map((type) => (
          <Badge
            key={type}
            onClick={() => setSelectedType(type)}
            className={cn(
              'cursor-pointer px-3 py-1',
              type === 'all' 
                ? (selectedType === 'all' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground') 
                : selectedType === type 
                  ? `bg-poketype-${type} text-white`
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            {capitalize(type)}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default TypeFilter;
