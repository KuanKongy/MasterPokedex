import React from 'react';
import { Link } from 'react-router-dom';
import type { PokemonSummary } from '@masterpokedex/shared';
import { Card, CardContent } from '@/components/ui/card';
import { capitalize } from '../utils/helpers';
import { cn } from '@/lib/utils';
import { TypeBadge } from './ui/type-badge';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';

interface PokemonCardProps {
  pokemon: PokemonSummary;
}

const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon }) => {
  const { id, name, types } = pokemon;
  const { spriteStyle } = useSpritePref();
  const primaryType = types[0] ?? 'normal';

  return (
    <Link to={`/pokemon/${id}`} className="transition-transform hover:scale-105">
      <Card
        className={cn('overflow-hidden bg-card border-2', `hover:border-poketype-${primaryType}`)}
      >
        <div
          className={cn(
            'bg-gradient-to-b from-muted to-card p-4 flex items-center justify-center',
            'min-h-[180px]',
          )}
        >
          <img
            src={pokemonImage(id, spriteStyle)}
            alt={name}
            loading="lazy"
            onError={(e) => spriteFallback(e, id)}
            className={cn(
              'object-contain animate-fade-in',
              spriteStyle === 'sprite' ? 'h-24 w-24 pixelated' : 'h-32 w-32',
            )}
          />
        </div>

        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm text-muted-foreground">#{id.toString().padStart(3, '0')}</p>
          </div>

          <h3 className="font-bold text-lg mb-2">{capitalize(name)}</h3>

          <div className="flex gap-2 flex-wrap mt-1">
            {types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PokemonCard;
