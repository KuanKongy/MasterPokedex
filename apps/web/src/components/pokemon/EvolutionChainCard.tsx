import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { EvolutionNode } from '@masterpokedex/shared';
import { usePokemonForms } from '@/hooks/api/dex';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import EvolutionTree, { PhraseParts } from './EvolutionTree';
import { megaCaption, megaStoneOf, megaStoneSlug } from './mega-stones';
import HelpTip from '../HelpTip';
import { evolutionConditionParts } from './evolution-utils';
import { capitalize } from '../../utils/helpers';
import { ALWAYS_SHOW_MEGAS, useBooleanPref } from '@/hooks/useBooleanPref';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

type ChainNode = {
  id: number;
  from: number | null;
  name: string;
  caption: React.ReactNode;
  highlighted: boolean;
  /** Set on battle-only forms: dashed border and a label instead of a number. */
  formKind?: 'mega' | 'gmax';
  /** The species' default form, for varieties PokeAPI has no art for. */
  baseId?: number;
};

/**
 * The species' evolution line as a branching tree (see EvolutionTree), with
 * two opt-in extras: Mega Evolutions and Gigantamax forms, each behind its
 * own switch. Both are battle-only states, so they hang off the species that
 * owns them as parallel dashed branches — Venusaur forks into Mega Venusaur
 * and Gigantamax Venusaur side by side, never one after the other.
 *
 * The forms are fetched for the whole *family*, not the current species —
 * Charmander's page should be able to show Mega Charizard, and a
 * species-scoped request can only ever find forms on the stage that owns
 * them. Settings' "always show alternate forms" seeds both switches.
 */
const EvolutionChainCard: React.FC<{ evolution: EvolutionNode[]; pokemonId: number; speciesId: number }> = ({
  evolution,
  pokemonId,
  speciesId,
}) => {
  const { spriteStyle } = useSpritePref();
  const [alwaysShowForms] = useBooleanPref(ALWAYS_SHOW_MEGAS);
  const [megaOverride, setMegaOverride] = useState<boolean | null>(null);
  const [gmaxOverride, setGmaxOverride] = useState<boolean | null>(null);
  // The preference is the default; flipping a switch wins for this visit.
  const showMegas = megaOverride ?? alwaysShowForms;
  const showGmax = gmaxOverride ?? alwaysShowForms;
  const { data: forms } = usePokemonForms(pokemonId, { enabled: showMegas || showGmax, family: true });

  const megas = showMegas ? (forms?.items ?? []).filter((form) => form.isMega) : [];
  const gmaxes = showGmax ? (forms?.items ?? []).filter((form) => form.isGmax) : [];

  const nodes: ChainNode[] = evolution.map((evo) => ({
    id: evo.id,
    from: evo.from,
    name: capitalize(evo.name),
    caption: evo.from !== null ? <PhraseParts parts={evolutionConditionParts(evo)} /> : null,
    highlighted: evo.id === speciesId,
  }));

  for (const mega of megas) {
    const stone = megaStoneOf(mega.name);
    nodes.push({
      id: mega.id,
      from: mega.speciesId ?? null,
      name: mega.formLabel ?? capitalize(mega.name),
      // The stone is an item page of its own; Rayquaza and the stoneless
      // Z-A Megas keep their plain caption.
      caption: stone ? (
        <PhraseParts parts={[{ text: stone, itemSlug: megaStoneSlug(stone) }]} />
      ) : (
        megaCaption(mega.name)
      ),
      highlighted: mega.id === pokemonId,
      formKind: 'mega',
      baseId: mega.speciesId,
    });
  }

  for (const gmax of gmaxes) {
    nodes.push({
      id: gmax.id,
      from: gmax.speciesId ?? null,
      name: gmax.formLabel ?? capitalize(gmax.name),
      caption: 'Gigantamax Factor',
      highlighted: gmax.id === pokemonId,
      formKind: 'gmax',
      baseId: gmax.speciesId,
    });
  }

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            Evolution Chain
            <HelpTip title="Evolution chain" faq="evolution" className="ml-1">
              The whole family, branch by branch; each arrow states the exact in-game
              requirement for that step.
            </HelpTip>
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <Switch id="show-megas" checked={showMegas} onCheckedChange={setMegaOverride} />
              <Label htmlFor="show-megas" className="cursor-pointer text-sm text-muted-foreground">
                Megas
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="show-gmax" checked={showGmax} onCheckedChange={setGmaxOverride} />
              <Label htmlFor="show-gmax" className="cursor-pointer text-sm text-muted-foreground">
                Gigantamax
              </Label>
              <HelpTip title="Battle-only forms" faq="mega-gigantamax">
                Megas and Gigantamax are temporary battle transformations, not evolutions, so
                they branch off with a dashed border. A Mega's arrow names the exact stone it
                must hold; Gigantamax needs the Gigantamax Factor, a trait carried home from
                Max Raid Dens.
              </HelpTip>
            </div>
          </div>
        </div>
        <EvolutionTree
          nodes={nodes}
          renderCard={(node) => (
            <Link to={`/pokemon/${node.id}`}>
              <div
                className={cn(
                  'p-5 border rounded-lg hover:border-pokebrand-extra bg-card',
                  node.highlighted && 'bg-muted',
                  node.formKind && 'border-dashed',
                )}
              >
                <div className="w-36 h-36 flex items-center justify-center">
                  <img
                    src={pokemonImage(node.id, spriteStyle)}
                    alt={node.name}
                    onError={(e) => spriteFallback(e, node.id, node.baseId)}
                    className={cn('max-w-full max-h-full object-contain', spriteStyle === 'sprite' && 'pixelated')}
                  />
                </div>
                <p className="text-center mt-2 font-medium">{node.name}</p>
                <p className="text-sm text-center text-muted-foreground">
                  {node.formKind === 'mega'
                    ? 'Mega'
                    : node.formKind === 'gmax'
                      ? 'Gigantamax'
                      : `#${node.id.toString().padStart(4, '0')}`}
                </p>
              </div>
            </Link>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default EvolutionChainCard;
