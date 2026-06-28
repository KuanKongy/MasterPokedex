import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import type { EvolutionNode, PokemonDetail } from '@masterpokedex/shared';
import { Card, CardContent } from '@/components/ui/card';
import { evolutionCondition } from './evolution-utils';
import { capitalize } from '../../utils/helpers';

type Props = {
  pokemon: PokemonDetail;
  evolution: EvolutionNode[] | undefined;
  encounterLocations: number;
  encounterRegions: string[];
};

/**
 * "How do I actually get one of these."
 *
 * The page could already answer it in pieces — an evolution chain here, a
 * Locations tab there, a Mega badge in a collapsed section — but never in one
 * sentence, and the chain's captions were too terse to be an answer on their
 * own. Eevee is the case that makes it obvious: eight branches, each with a
 * different rule, and nothing on the page saying which one you are looking at.
 */
const HowToGet: React.FC<Props> = ({ pokemon, evolution, encounterLocations, encounterRegions }) => {
  const node = evolution?.find((n) => n.id === pokemon.speciesId);
  const parent = node?.from ? evolution?.find((n) => n.id === node.from) : undefined;
  const methods = node?.methods ?? [];

  const lines: React.ReactNode[] = [];

  if (pokemon.isMega) {
    lines.push(
      <>
        Mega Evolve <strong>{pokemon.speciesName}</strong> in battle while it holds its
        Mega Stone. The form lasts until the battle ends.
      </>,
    );
  } else if (pokemon.isGmax) {
    lines.push(
      <>
        Catch one with the <strong>Gigantamax Factor</strong>, then Dynamax it in a Max Raid or a Gym battle with a
        Dynamax Band.
      </>,
    );
  }

  if (parent && methods.length > 0) {
    lines.push(
      <>
        Evolves from{' '}
        <Link to={`/pokemon/${parent.id}`} className="font-medium text-pokebrand-red hover:underline">
          {capitalize(parent.name)}
        </Link>
        : {evolutionCondition(node!, { limit: 6 })}.
      </>,
    );
  }

  if (encounterLocations > 0) {
    const where =
      encounterRegions.length > 0
        ? ` across ${encounterRegions.map(capitalize).join(', ')}`
        : '';
    lines.push(
      <>
        Found in the wild in <strong>{encounterLocations}</strong> location{encounterLocations === 1 ? '' : 's'}
        {where} — see the Locations tab below.
      </>,
    );
  } else if (!pokemon.isMega && !pokemon.isGmax) {
    lines.push(
      parent ? (
        <>Not found in the wild; evolution is the only route.</>
      ) : (
        <>No wild encounters are recorded — a gift, trade, event or in-game static encounter.</>
      ),
    );
  }

  if (pokemon.species.isLegendary || pokemon.species.isMythical) {
    lines.push(
      <>
        {pokemon.species.isMythical ? 'Mythical' : 'Legendary'}: one per save file in the games it appears in.
      </>,
    );
  }

  if (lines.length === 0) return null;

  return (
    <Card className="mt-6">
      <CardContent className="p-6">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-pokebrand-red" />
          How to get one
        </h2>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {lines.map((line, index) => (
            <li key={index} className="flex gap-2">
              <span aria-hidden="true" className="text-pokebrand-red">
                •
              </span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default HowToGet;
