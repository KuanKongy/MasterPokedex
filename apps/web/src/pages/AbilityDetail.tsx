import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAbility } from '@/hooks/api/dex';
import LoadingSpinner from '../components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TypeBadge } from '../components/ui/type-badge';
import HelpTip from '../components/HelpTip';
import { ChevronLeft } from 'lucide-react';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

/** One ability: its effect and every Pokémon that can carry it. */
const AbilityDetail: React.FC = () => {
  const { idOrName } = useParams();
  const { data: ability, isLoading, error } = useAbility(idOrName);
  const { spriteStyle } = useSpritePref();

  if (isLoading) return <LoadingSpinner />;
  if (error || !ability) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="mb-2 text-2xl font-bold">Ability not found</h2>
        <Link to="/abilities" className="text-pokebrand-red hover:underline">
          Back to all abilities
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/abilities"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All abilities
      </Link>

      <h1 className="mb-2 text-3xl font-extrabold md:text-4xl">{ability.displayName}</h1>
      {ability.generation && (
        <p className="mb-6 text-muted-foreground">Introduced in Generation {ability.generation}</p>
      )}

      <Card className="mb-8">
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            {ability.shortEffect ?? 'No effect text is recorded for this ability.'}
          </p>
        </CardContent>
      </Card>

      <h2 className="mb-4 text-2xl font-bold">Pokémon with {ability.displayName} ({ability.pokemon.length})</h2>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pokémon</TableHead>
              <TableHead>Types</TableHead>
              <TableHead>
                Slot
                <HelpTip title="Ability slot" className="ml-1">
                  Slots 1 and 2 are the ordinary abilities a wild Pokémon can have; Hidden is
                  the rare extra one from special encounters and raids.
                </HelpTip>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ability.pokemon.map((entry) => (
              <TableRow key={`${entry.pokemonId}-${entry.slot}`}>
                <TableCell>
                  <Link
                    to={`/pokemon/${entry.pokemonId}`}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    <img
                      src={pokemonImage(entry.pokemonId, spriteStyle)}
                      alt=""
                      loading="lazy"
                      onError={(e) => spriteFallback(e, entry.pokemonId)}
                      className={cn('h-8 w-8 object-contain', spriteStyle === 'sprite' && 'pixelated')}
                    />
                    {entry.formLabel ?? entry.displayName}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {entry.types.map((type) => (
                      <TypeBadge key={type} type={type} size="sm" />
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {entry.isHidden ? <Badge variant="outline">Hidden</Badge> : <span className="text-sm">{entry.slot}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AbilityDetail;
