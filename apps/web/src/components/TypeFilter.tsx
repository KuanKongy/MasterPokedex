
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { capitalize } from '../utils/helpers';
import { TypeBadge } from './ui/type-badge';

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
          type === 'all' ? (
            <Button
              key={type}
              onClick={() => setSelectedType(type)}
              variant={selectedType === 'all' ? 'default' : 'outline'}
              size="sm"
              className="capitalize"
            >
              All Types
            </Button>
          ) : (
            <div 
              key={type} 
              onClick={() => setSelectedType(type)}
              className={cn(
                "cursor-pointer",
                selectedType === type ? "ring-2 ring-primary ring-offset-2" : ""
              )}
            >
              <TypeBadge type={type as any} />
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default TypeFilter;
