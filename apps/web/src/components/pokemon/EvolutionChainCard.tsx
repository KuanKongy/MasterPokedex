import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { EvolutionNode } from '@masterpokedex/shared';
import { usePokemonForms } from '@/hooks/api/dex';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { evolutionCondition } from './evolution-utils';
import { capitalize } from '../../utils/helpers';
import { ALWAYS_SHOW_MEGAS, useBooleanPref } from '@/hooks/useBooleanPref';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

type ChainNode = {
  id: number;
  name: string;
  caption: string | null;
  highlighted: boolean;
  isMega?: boolean;
  /** The species' default form, for varieties PokeAPI has no art for. */
  baseId?: number;
};

/**
 * The species' evolution line, with an opt-in extra hop: Mega Evolutions
 * append after the final stage with how to reach them in one line.
 *
 * The Megas are fetched for the whole *family*, not the current species —
 * Charmander's page should be able to show Mega Charizard, and a
 * species-scoped request can only ever find forms on the stage that owns
 * them. Settings' "always show alternate forms" seeds the switch.
 */
const EvolutionChainCard: React.FC<{ evolution: EvolutionNode[]; pokemonId: number; speciesId: number }> = ({
  evolution,
  pokemonId,
  speciesId,
}) => {
  const { spriteStyle } = useSpritePref();
  const [alwaysShowMegas] = useBooleanPref(ALWAYS_SHOW_MEGAS);
  const [override, setOverride] = useState<boolean | null>(null);
  // The preference is the default; flipping the switch wins for this visit.
  const showMegas = override ?? alwaysShowMegas;
  const { data: forms } = usePokemonForms(pokemonId, { enabled: showMegas, family: true });

  const megas = showMegas ? (forms?.items ?? []).filter((form) => form.isMega) : [];

  const nodes: ChainNode[] = evolution.map((evo, index) => ({
    id: evo.id,
    name: capitalize(evo.name),
    caption: index > 0 ? evolutionCondition(evo) : null,
    highlighted: evo.id === speciesId,
  }));

  for (const mega of megas) {
    nodes.push({
      id: mega.id,
      name: mega.formLabel ?? capitalize(mega.name),
      caption:
        mega.name === 'rayquaza-mega'
          ? 'Knows Dragon Ascent'
          : `Mega Stone${mega.name.endsWith('-x') ? ' X' : mega.name.endsWith('-y') ? ' Y' : ''}`,
      highlighted: mega.id === pokemonId,
      isMega: true,
      baseId: mega.speciesId,
    });
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Evolution Chain</h2>
          <div className="flex items-center gap-2">
            <Switch id="show-megas" checked={showMegas} onCheckedChange={setOverride} />
            <Label htmlFor="show-megas" className="cursor-pointer text-sm text-muted-foreground">
              Show Mega Evolutions
            </Label>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {nodes.map((node, index) => (
            <React.Fragment key={node.id}>
              {index > 0 && (
                <div className="text-center px-2">
                  <ChevronRight className="h-6 w-6 text-muted-foreground mx-auto" />
                  <div className="text-xs text-muted-foreground mt-1 max-w-[110px]">{node.caption}</div>
                </div>
              )}

              <Link to={`/pokemon/${node.id}`}>
                <div
                  className={cn(
                    'p-5 border rounded-lg hover:border-pokebrand-red bg-card',
                    node.highlighted && 'bg-muted',
                    node.isMega && 'border-dashed',
                  )}
                >
                  <div className="w-32 h-32 flex items-center justify-center">
                    <img
                      src={pokemonImage(node.id, spriteStyle)}
                      alt={node.name}
                      onError={(e) => spriteFallback(e, node.id, node.baseId)}
                      className={cn('max-w-full max-h-full object-contain', spriteStyle === 'sprite' && 'pixelated')}
                    />
                  </div>
                  <p className="text-center mt-2 font-medium">{node.name}</p>
                  <p className="text-sm text-center text-muted-foreground">
                    {node.isMega ? 'Mega' : `#${node.id.toString().padStart(4, '0')}`}
                  </p>
                </div>
              </Link>
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EvolutionChainCard;
