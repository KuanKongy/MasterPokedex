import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { usePokemonForms } from '@/hooks/api/dex';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TypeBadge } from '../ui/type-badge';
import HelpTip from '../HelpTip';
import LoadingSpinner from '../LoadingSpinner';
import { capitalize } from '../../utils/helpers';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { ALWAYS_SHOW_MEGAS, useBooleanPref } from '@/hooks/useBooleanPref';
import { cn } from '@/lib/utils';

/**
 * Mega Evolutions, regional forms and Gigantamax variants for the whole
 * evolution family, grouped by species.
 *
 * Family, not species, is the point. Megas and Gigantamax forms belong to one
 * stage — Venusaur's, never Bulbasaur's — so a species-scoped section is blank
 * on every page except the last, which is the one page where nobody needs
 * telling that Venusaur has a Mega. Opening Bulbasaur and seeing what the line
 * eventually becomes is the question being asked.
 */
const FormsSection: React.FC<{ pokemonId: number; currentId: number }> = ({ pokemonId, currentId }) => {
  const [alwaysShow] = useBooleanPref(ALWAYS_SHOW_MEGAS);
  const [override, setOverride] = useState<boolean | null>(null);
  const open = override ?? alwaysShow;
  const { data, isLoading } = usePokemonForms(pokemonId, { enabled: open, family: true });
  const { spriteStyle } = useSpritePref();

  const forms = data?.items ?? [];
  // Only the base form of a single-species family is no forms at all.
  const interesting = forms.filter((form) => !form.isDefault);
  if (open && !isLoading && interesting.length === 0) return null;

  // One block per species, in evolution order, so a family reads top to bottom.
  const groups: Array<{ speciesId: number; speciesName: string; forms: typeof forms }> = [];
  for (const form of forms) {
    const speciesId = form.speciesId ?? form.id;
    const last = groups[groups.length - 1];
    if (last && last.speciesId === speciesId) last.forms.push(form);
    else groups.push({ speciesId, speciesName: form.speciesName ?? capitalize(form.name), forms: [form] });
  }
  // A species with nothing but its default form adds a heading and no news.
  const shown = groups.filter((group) => group.forms.some((form) => !form.isDefault));

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Forms &amp; Mega Evolutions
            <HelpTip title="Family forms" faq="family-forms" className="ml-1">
              Every form in the whole family — Megas, Gigantamax and regional variants on any
              stage — which is why Bulbasaur's page shows Mega Venusaur.
            </HelpTip>
          </h2>
          <Button variant="ghost" size="sm" onClick={() => setOverride(!open)}>
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
            <div className="mt-4 space-y-5">
              {shown.map((group) => (
                <div key={group.speciesId}>
                  {shown.length > 1 && (
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{group.speciesName}</h3>
                  )}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {group.forms.map((form) => (
                      <Link
                        key={form.id}
                        to={`/pokemon/${form.id}`}
                        className={cn(
                          'flex flex-col items-center rounded-lg border p-4 transition-colors hover:border-pokebrand-extra/60',
                          form.id === currentId && 'bg-muted',
                        )}
                      >
                        <img
                          src={pokemonImage(form.id, spriteStyle)}
                          alt={form.formLabel ?? form.name}
                          loading="lazy"
                          onError={(e) => spriteFallback(e, form.id, form.speciesId)}
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
                          {form.isMega && (
                            <>
                              <Badge className="bg-poketype-dragon text-[0.6875rem] text-white">Mega</Badge>
                              <HelpTip title="Mega Evolution" faq="mega-gigantamax">
                                A temporary battle transformation via its Mega Stone — it ends
                                with the battle.
                              </HelpTip>
                            </>
                          )}
                          {form.isGmax && (
                            <>
                              <Badge className="bg-poketype-fighting text-[0.6875rem] text-white">Gigantamax</Badge>
                              <HelpTip title="Gigantamax" faq="mega-gigantamax">
                                Galar's battle-only gigantism for individuals with the
                                Gigantamax Factor — colossal, reshaped, temporary.
                              </HelpTip>
                            </>
                          )}
                          {form.isRegional && (
                            <>
                              <Badge variant="secondary" className="text-[0.6875rem]">
                                Regional
                              </Badge>
                              <HelpTip title="Regional form">
                                The species as another region shaped it — different typing or
                                look, permanent, often with its own evolution.
                              </HelpTip>
                            </>
                          )}
                          <span className="text-xs text-muted-foreground">
                            BST {form.stats.total}
                            <HelpTip title="BST" className="ml-1">
                              Base Stat Total — the six base stats added up.
                            </HelpTip>
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
      </CardContent>
    </Card>
  );
};

export default FormsSection;
