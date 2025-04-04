
import React from 'react';
import { Link } from 'react-router-dom';
import { Pokemon } from '../types/pokemon';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { capitalize } from '../utils/helpers';
import { cn } from '@/lib/utils';

interface PokemonCardProps {
  pokemon: Pokemon;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon }) => {
  const { id, name, types, sprites } = pokemon;
  
  // Use the primary type for the card border color
  const primaryType = types[0]?.type.name || 'normal';
  
  return (
    <Link to={`/pokemon/${id}`} className="transition-transform hover:scale-105">
      <Card className={cn(
        "overflow-hidden bg-white border-2",
        `hover:border-poketype-${primaryType}`
      )}>
        <div className={cn(
          "bg-gradient-to-b from-gray-200 to-white p-4 flex items-center justify-center",
          "min-h-[180px]"
        )}>
          {sprites.other['official-artwork'].front_default ? (
            <img
              src={sprites.other['official-artwork'].front_default}
              alt={name}
              className="h-32 w-32 object-contain animate-fade-in"
            />
          ) : (
            <img
              src={sprites.front_default}
              alt={name}
              className="h-24 w-24 object-contain animate-fade-in pixelated"
            />
          )}
        </div>
        
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-muted-foreground">#{id.toString().padStart(3, '0')}</p>
          </div>
          
          <h3 className="font-bold text-lg mb-2">{capitalize(name)}</h3>
          
          <div className="flex gap-2 flex-wrap mt-1">
            {types.map(({ type }) => (
              <Badge 
                key={type.name} 
                className={`bg-poketype-${type.name} text-white`}
              >
                {capitalize(type.name)}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PokemonCard;
