import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { PokemonTypeSchema, type PokemonTypeName } from '@masterpokedex/shared';
import { useTypeInfo } from '@/hooks/api/pokemon';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TypeBadge } from '../components/ui/type-badge';
import HelpTip from '../components/HelpTip';
import { TypeIcon } from '../components/ui/type-icon';
import { ChevronLeft } from 'lucide-react';
import { capitalize } from '../utils/helpers';

const MatchupRow: React.FC<{ label: string; types: PokemonTypeName[] }> = ({ label, types }) => (
  <div className="flex flex-wrap items-center gap-1.5">
    <span className="mr-1 w-44 shrink-0 text-sm text-muted-foreground">{label}</span>
    {types.length === 0 ? (
      <span className="text-sm text-muted-foreground/60">none</span>
    ) : (
      types.map((type) => (
        <Link key={type} to={`/types/${type}`}>
          <TypeBadge type={type} size="sm" icon />
        </Link>
      ))
    )}
  </div>
);

/** One type's full offensive and defensive profile. */
const TypeDetail: React.FC = () => {
  const { name } = useParams();
  const parsed = PokemonTypeSchema.safeParse(name?.toLowerCase());
  const { data: info, isLoading } = useTypeInfo(parsed.success ? parsed.data : undefined);

  if (!parsed.success) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="mb-2 text-2xl font-bold">No such type</h2>
        <Link to="/types" className="text-pokebrand-red hover:underline">
          Back to the type chart
        </Link>
      </div>
    );
  }

  if (isLoading || !info) return <LoadingSpinner />;

  const type = parsed.data;

  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/types" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Type chart
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <TypeIcon type={type} className="h-8 w-8 text-pokebrand-red" />
        <h1 className="text-3xl font-extrabold md:text-4xl">{capitalize(type)}</h1>
        <span className="text-muted-foreground">{info.pokemonCount} Pokémon</span>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Attacking with {capitalize(type)}
              <HelpTip title="Attacking" faq="types" className="ml-1">
                Super effective deals ×2 damage, not very effective ×0.5, and no effect none at
                all — doubled again or halved again when both of a defender's types agree.
              </HelpTip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MatchupRow label="Super effective against" types={info.doubleDamageTo} />
            <MatchupRow label="Not very effective against" types={info.halfDamageTo} />
            <MatchupRow label="No effect against" types={info.noDamageTo} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              Defending as {capitalize(type)}
              <HelpTip title="Defending" faq="types" className="ml-1">
                Weak to takes ×2 damage, resists takes ×0.5, and immune takes none — a
                Pokémon's second type multiplies on top.
              </HelpTip>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <MatchupRow label="Weak to" types={info.doubleDamageFrom} />
            <MatchupRow label="Resists" types={info.halfDamageFrom} />
            <MatchupRow label="Immune to" types={info.noDamageFrom} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Link to={`/?type=${type}`}>
          <Button variant="outline">Browse {capitalize(type)} Pokémon</Button>
        </Link>
      </div>
    </div>
  );
};

export default TypeDetail;
