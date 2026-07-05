import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import type { PokemonSummary } from '@masterpokedex/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { capitalize } from '../utils/helpers';
import { cn } from '@/lib/utils';
import { TypeBadge } from './ui/type-badge';
import { HoverTip } from './HelpTip';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';

interface PokemonCardProps {
  pokemon: PokemonSummary;
  /** Favorites grids pass this; the card then wears a filled heart that unfavorites in place. */
  onUnfavorite?: () => void;
}

/** Compact dex card — six of these fit a desktop row, like the reference site. */
const PokemonCard: React.FC<PokemonCardProps> = ({ pokemon, onUnfavorite }) => {
  const { id, name, types } = pokemon;
  const { spriteStyle } = useSpritePref();

  return (
    <Link to={`/pokemon/${id}`} className="relative block transition-transform hover:scale-[1.03]">
      {onUnfavorite && (
        <Button
          size="icon"
          variant="outline"
          className="absolute right-1.5 top-1.5 z-10 h-8 w-8"
          aria-label={`Remove ${capitalize(name)} from favorites`}
          onClick={(e) => {
            // The whole card is a link; the heart must not follow it.
            e.preventDefault();
            e.stopPropagation();
            onUnfavorite();
          }}
        >
          <Heart className="h-4 w-4 fill-current text-pokebrand-red" />
        </Button>
      )}
      <Card className="overflow-hidden bg-card border hover:border-pokebrand-extra/50 transition-colors">
        <div className="bg-gradient-to-b from-muted to-card px-3 pt-3 pb-1 flex items-center justify-center min-h-[144px]">
          <img
            src={pokemonImage(id, spriteStyle)}
            alt={name}
            loading="lazy"
            onError={(e) => spriteFallback(e, id)}
            className={cn(
              'object-contain animate-fade-in',
              spriteStyle === 'sprite' ? 'h-32 w-32 pixelated' : spriteStyle === 'home' ? 'h-40 w-40' : 'h-32 w-32',
            )}
          />
        </div>

        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground">
            <HoverTip
              title="Dex number"
              trigger={<>#{id.toString().padStart(4, '0')}</>}
            >
              Its National Pokédex number, the same in every game.
            </HoverTip>
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
