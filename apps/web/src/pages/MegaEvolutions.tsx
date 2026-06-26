import React from 'react';
import { Link } from 'react-router-dom';
import { useMegas } from '@/hooks/api/dex';
import LoadingSpinner from '../components/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { TypeBadge } from '../components/ui/type-badge';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

/**
 * All 97 Mega Evolutions in one gallery — labeled forms from the dex, each
 * linked to its own detail page and back to its base species.
 */
const MegaEvolutions: React.FC = () => {
  const { data, isLoading } = useMegas();
  const { spriteStyle } = useSpritePref();
  const megas = data?.items ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Mega Evolutions</h1>
      <p className="text-muted-foreground mb-8">
        {megas.length > 0 ? `${megas.length} Mega forms` : 'Temporary battle forms'} unlocked by Mega Stones
      </p>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {megas.map((mega) => (
            <Card key={mega.id} className="overflow-hidden">
              <CardContent className="p-4">
                <Link to={`/pokemon/${mega.id}`} className="flex items-center gap-3">
                  <img
                    src={pokemonImage(mega.id, spriteStyle)}
                    alt={mega.formLabel ?? mega.name}
                    loading="lazy"
                    onError={(e) => spriteFallback(e, mega.id)}
                    className={cn('h-20 w-20 shrink-0 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                  />
                  <div className="min-w-0">
                    <h3 className="truncate font-bold hover:underline">{mega.formLabel ?? mega.name}</h3>
                    <div className="mt-1 flex gap-1">
                      {mega.types.map((type) => (
                        <TypeBadge key={type} type={type} size="sm" />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      BST <span className="font-semibold text-foreground">{mega.stats.total}</span>
                    </p>
                  </div>
                </Link>
                <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                  Base:{' '}
                  <Link to={`/pokemon/${mega.basePokemonId}`} className="font-medium text-foreground hover:underline">
                    {mega.baseName}
                  </Link>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default MegaEvolutions;
