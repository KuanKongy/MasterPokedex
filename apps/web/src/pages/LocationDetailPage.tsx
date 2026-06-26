import React from 'react';
import { Link, useParams } from 'react-router-dom';
import type { AreaEncounter } from '@masterpokedex/shared';
import { useLocationDetail } from '@/hooks/api/world';
import LoadingSpinner from '../components/LoadingSpinner';
import { RARITY_STYLE } from '../components/locations/rarity';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TypeBadge } from '../components/ui/type-badge';
import { ChevronLeft, Map as MapIcon, MapPin, Swords } from 'lucide-react';
import { capitalize } from '../utils/helpers';
import { resolveAsset } from '@/lib/assets';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

const prettifyIdent = (value: string) => value.split('-').map(capitalize).join(' ');

/** area encounters, grouped by method, each method sorted by rarity desc. */
function groupByMethod(encounters: AreaEncounter[]): Array<{ method: string; rows: AreaEncounter[] }> {
  const buckets = new Map<string, AreaEncounter[]>();
  for (const encounter of encounters) {
    const bucket = buckets.get(encounter.method) ?? [];
    bucket.push(encounter);
    buckets.set(encounter.method, bucket);
  }
  return [...buckets.entries()].map(([method, rows]) => ({
    method,
    rows: rows.sort((a, b) => b.chance - a.chance || a.pokemonName.localeCompare(b.pokemonName)),
  }));
}

/**
 * One location, catalogued the way pokemondb does routes: header facts up
 * top, then per-area encounter tables grouped by method — compact rows, not
 * the old wall of cards.
 */
const LocationDetailPage: React.FC = () => {
  const { id } = useParams();
  const locationId = Number(id);
  const { data: location, isLoading, error } = useLocationDetail(Number.isInteger(locationId) ? locationId : undefined);
  const { spriteStyle } = useSpritePref();

  if (isLoading) return <LoadingSpinner />;

  if (error || !location) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-2">Location not found</h2>
        <Link to="/locations" className="text-pokebrand-red hover:underline">
          Back to all locations
        </Link>
      </div>
    );
  }

  const areasWithEncounters = location.areas.filter((area) => area.encounters.length > 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4 flex items-center gap-4 text-sm">
        <Link to="/locations" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          All locations
        </Link>
        {location.regionName && (
          <Link
            to={`/map?region=${location.regionName.toLowerCase()}`}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <MapIcon className="h-4 w-4" />
            {location.regionName} map
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl md:text-4xl font-extrabold">{location.displayName}</h1>
        {location.kind && (
          <Badge variant="outline" className="capitalize">
            {location.kind}
          </Badge>
        )}
      </div>
      {location.regionName && (
        <p className="-mt-4 mb-6 flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {location.regionName}
        </p>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {location.image && (
          <img
            src={resolveAsset(location.image)}
            alt={location.displayName}
            className="w-full rounded-lg border object-cover shadow-sm"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = resolveAsset('placeholder.svg');
            }}
          />
        )}
        <div className="space-y-4">
          {location.description && <p className="text-muted-foreground">{location.description}</p>}

          {(location.notableTrainers ?? []).length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-1.5 font-semibold">
                <Swords className="h-4 w-4 text-pokebrand-red" />
                Notable Trainers
              </h2>
              <div className="flex flex-wrap gap-2">
                {location.notableTrainers!.map((trainer) => (
                  <Badge key={trainer} variant="secondary">
                    {trainer}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {location.neighbors.length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-1.5 font-semibold">
                <MapIcon className="h-4 w-4 text-pokebrand-red" />
                Neighboring Locations
              </h2>
              <div className="flex flex-wrap gap-2">
                {location.neighbors.map((neighbor) => (
                  <Link key={neighbor.id} to={`/locations/${neighbor.id}`}>
                    <Badge variant="outline" className="hover:bg-muted">
                      {neighbor.displayName}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <h2 className="mb-4 text-2xl font-bold">Pokémon Encounters</h2>
      {areasWithEncounters.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-muted-foreground">
          No wild encounters are recorded for this location.
        </p>
      ) : (
        <div className="space-y-6">
          {areasWithEncounters.map((area) => (
            <Card key={area.id}>
              {areasWithEncounters.length > 1 && (
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{area.displayName}</CardTitle>
                </CardHeader>
              )}
              <CardContent className={cn(areasWithEncounters.length === 1 && 'pt-6')}>
                <div className="space-y-5">
                  {groupByMethod(area.encounters).map(({ method, rows }) => (
                    <div key={method}>
                      <h3 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
                        {method.replace(/-/g, ' ')}
                      </h3>
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Pokémon</TableHead>
                              <TableHead>Types</TableHead>
                              <TableHead className="text-right">Levels</TableHead>
                              <TableHead className="text-right">Rarity</TableHead>
                              <TableHead>Games</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rows.map((encounter, index) => (
                              <TableRow key={`${encounter.pokemonId}-${index}`}>
                                <TableCell>
                                  <Link
                                    to={`/pokemon/${encounter.pokemonId}`}
                                    className="flex items-center gap-2 font-medium hover:underline"
                                  >
                                    <img
                                      src={pokemonImage(encounter.pokemonId, spriteStyle)}
                                      alt=""
                                      loading="lazy"
                                      onError={(e) => spriteFallback(e, encounter.pokemonId)}
                                      className={cn(
                                        'h-8 w-8 object-contain',
                                        spriteStyle === 'sprite' && 'pixelated',
                                      )}
                                    />
                                    {capitalize(encounter.pokemonName)}
                                  </Link>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {encounter.types.map((type) => (
                                      <TypeBadge key={type} type={type} size="sm" />
                                    ))}
                                  </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-right">
                                  {encounter.minLevel === encounter.maxLevel
                                    ? encounter.minLevel
                                    : `${encounter.minLevel}–${encounter.maxLevel}`}
                                </TableCell>
                                <TableCell className="text-right">
                                  <span
                                    className={cn(
                                      'inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs capitalize',
                                      RARITY_STYLE[encounter.rarity],
                                    )}
                                    title={`${encounter.chance}% slot chance`}
                                  >
                                    {encounter.rarity.replace('-', ' ')} · {encounter.chance}%
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex max-w-64 flex-wrap gap-1">
                                    {encounter.versions.map((version) => (
                                      <span
                                        key={version}
                                        className="rounded bg-muted px-1.5 py-0.5 text-[0.6875rem] text-muted-foreground"
                                      >
                                        {prettifyIdent(version)}
                                      </span>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationDetailPage;
