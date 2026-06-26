import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { usePokemonForms } from '@/hooks/api/dex';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TypeBadge } from '../ui/type-badge';
import LoadingSpinner from '../LoadingSpinner';
import { capitalize } from '../../utils/helpers';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

/**
 * Mega Evolutions, regional forms and Gigantamax variants of the current
 * species. Hidden behind a toggle by default — most visits are about the
 * base form — and only fetched once opened.
 */
const FormsSection: React.FC<{ pokemonId: number; currentId: number }> = ({ pokemonId, currentId }) => {
  const [open, setOpen] = useState(false);
  const { data, isLoading } = usePokemonForms(pokemonId, { enabled: open });
  const { spriteStyle } = useSpritePref();

  const forms = data?.items ?? [];
  // With only the default form there is nothing to show — but that is only
  // knowable after opening; the button stays honest either way.
  if (open && !isLoading && forms.length <= 1) return null;

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Forms &amp; Mega Evolutions</h2>
          <Button variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
            {open ? (
              <>
                Hide <ChevronUp className="ml-1 h-4 w-4" />
              </>
            ) : (
              <>
                Show <ChevronDown className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {open &&
          (isLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {forms.map((form) => (
                <Link
                  key={form.id}
                  to={`/pokemon/${form.id}`}
                  className={cn(
                    'flex flex-col items-center rounded-lg border p-4 transition-colors hover:border-pokebrand-red/60',
                    form.id === currentId && 'bg-muted',
                  )}
                >
                  <img
                    src={pokemonImage(form.id, spriteStyle)}
                    alt={form.formLabel ?? form.name}
                    loading="lazy"
                    onError={(e) => spriteFallback(e, form.id)}
                    className={cn('h-20 w-20 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                  />
                  <p className="mt-2 text-center text-sm font-medium">
                    {form.formLabel ?? capitalize(form.name)}
                  </p>
                  <div className="mt-1 flex gap-1">
                    {form.types.map((type) => (
                      <TypeBadge key={type} type={type} size="sm" />
                    ))}
                  </div>
                  <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                    {form.isDefault && (
                      <Badge variant="outline" className="text-[0.6875rem]">
                        Base
                      </Badge>
                    )}
                    {form.isMega && <Badge className="bg-poketype-dragon text-[0.6875rem] text-white">Mega</Badge>}
                    {form.isGmax && <Badge className="bg-poketype-fighting text-[0.6875rem] text-white">Gigantamax</Badge>}
                    {form.isRegional && (
                      <Badge variant="secondary" className="text-[0.6875rem]">
                        Regional
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">BST {form.stats.total}</span>
                  </div>
                </Link>
              ))}
            </div>
          ))}
      </CardContent>
    </Card>
  );
};

export default FormsSection;
