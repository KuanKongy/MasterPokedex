import React from 'react';
import { Link } from 'react-router-dom';
import type { PokemonSummary } from '@masterpokedex/shared';
import { Card, CardContent } from '@/components/ui/card';
import { capitalize } from '../utils/helpers';
import { cn } from '@/lib/utils';
import { TypeBadge } from './ui/type-badge';
import HelpTip from './HelpTip';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';

interface PokemonCardProps {
  pokemon: PokemonSummary;
}

/** Compact dex card — six of these fit a desktop row, like the reference site. */
const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon }) => {
  const { id, name, types } = pokemon;
  const { spriteStyle } = useSpritePref();

  return (
    <Link to={`/pokemon/${id}`} className="transition-transform hover:scale-[1.03]">
      <Card className="overflow-hidden bg-card border hover:border-pokebrand-red/50 transition-colors">
        <div className="bg-gradient-to-b from-muted to-card px-3 pt-3 pb-1 flex items-center justify-center min-h-[112px]">
          <img
            src={pokemonImage(id, spriteStyle)}
            alt={name}
            loading="lazy"
            onError={(e) => spriteFallback(e, id)}
            className={cn(
              'object-contain animate-fade-in',
              spriteStyle === 'sprite' ? 'h-20 w-20 pixelated' : 'h-24 w-24',
            )}
          />
        </div>

        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">
            #{id.toString().padStart(4, '0')}
            <HelpTip title="Dex number" className="ml-1">
              Its National Pokédex number — the same in every game.
            </HelpTip>
          </p>
          <h3 className="font-bold text-sm mb-1.5 truncate">{capitalize(name)}</h3>
          <div className="flex gap-1 flex-wrap">
            {types.map((type) => (
              <TypeBadge key={type} type={type} size="sm" />
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default PokemonCard;
