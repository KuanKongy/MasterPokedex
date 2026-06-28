import React from 'react';
import { Link } from 'react-router-dom';
import type { MegaSummary } from '@masterpokedex/shared';
import LoadingSpinner from '../LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { TypeBadge } from '../ui/type-badge';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

/**
 * A gallery of one kind of alternate form — the Megas, the Gigantamax lineup —
 * each card linking to the form and back to the species it belongs to.
 * Shared because the two pages differ only in their heading and their query.
 */
const FormGallery: React.FC<{
  title: string;
  blurb: (count: number) => string;
  forms: MegaSummary[];
  isLoading: boolean;
}> = ({ title, blurb, forms, isLoading }) => {
  const { spriteStyle } = useSpritePref();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-2 text-3xl font-extrabold md:text-4xl">{title}</h1>
      <p className="mb-8 text-muted-foreground">{blurb(forms.length)}</p>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {forms.map((form) => (
            <Card key={form.id} className="overflow-hidden">
              <CardContent className="p-4">
                <Link to={`/pokemon/${form.id}`} className="flex items-center gap-3">
                  <img
                    src={pokemonImage(form.id, spriteStyle)}
                    alt={form.formLabel ?? form.name}
                    loading="lazy"
                    onError={(e) => spriteFallback(e, form.id, form.basePokemonId)}
                    className={cn('h-20 w-20 shrink-0 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                  />
                  <div className="min-w-0">
                    <h3 className="truncate font-bold hover:underline">{form.formLabel ?? form.name}</h3>
                    <div className="mt-1 flex gap-1">
                      {form.types.map((type) => (
                        <TypeBadge key={type} type={type} size="sm" />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      BST <span className="font-semibold text-foreground">{form.stats.total}</span>
                    </p>
                  </div>
                </Link>
                <p className="mt-3 border-t pt-2 text-xs text-muted-foreground">
                  Base:{' '}
                  <Link to={`/pokemon/${form.basePokemonId}`} className="font-medium text-foreground hover:underline">
                    {form.baseName}
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

export default FormGallery;
