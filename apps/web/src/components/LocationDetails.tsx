import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EncounterRarity } from '@masterpokedex/shared';
import { useLocationDetail } from '@/hooks/api/world';
import { TypeBadge } from './ui/type-badge';
import { pokemonImage, spriteFallback, useSpritePref } from '@/prefs/SpritePrefContext';
import { capitalize } from '../utils/helpers';
import LoadingSpinner from './LoadingSpinner';

interface LocationDetailsProps {
  locationId: number;
  onSelectLocation: (locationId: number) => void;
}

const RARITY_STYLE: Record<EncounterRarity, string> = {
  common: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  uncommon: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  rare: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  'very-rare': 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  legendary: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
};

/**
 * One location: curated art and blurb, its neighbours, and the real encounter
 * tables from the dex — method, levels and rarity per area, not the old
 * hand-typed five-Pokémon list.
 */
const LocationDetails: React.FC<LocationDetailsProps> = ({ locationId, onSelectLocation }) => {
  const { data: location, isLoading, error } = useLocationDetail(locationId);
  const { spriteStyle } = useSpritePref();

  if (isLoading) {
    return (
      <Card className="shadow-md flex items-center justify-center min-h-[300px]">
        <LoadingSpinner />
      </Card>
    );
  }

  if (error || !location) {
    return (
      <Card className="shadow-md p-6">
        <p className="text-red-500">Could not load this location.</p>
      </Card>
    );
  }

  const areasWithEncounters = location.areas.filter((area) => area.encounters.length > 0);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">{location.displayName}</CardTitle>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" /> {location.regionName}
            </p>
          </div>
          {location.kind && (
            <Badge variant="outline" className="capitalize">
              {location.kind}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {location.image && (
              <div>
                <img
                  src={location.image}
                  alt={location.displayName}
                  className="w-full h-auto rounded-md shadow-sm"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'placeholder.svg';
                  }}
                />
              </div>
            )}
            <div>
              {location.description && <p className="text-sm mb-4">{location.description}</p>}

              {location.neighbors.length > 0 && (
                <>
                  <h3 className="font-semibold mb-2">Neighboring Locations:</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {location.neighbors.map((neighbor) => (
                      <Badge
                        key={neighbor.id}
                        variant="outline"
                        className="flex items-center gap-1 cursor-pointer hover:bg-secondary"
                        onClick={() => onSelectLocation(neighbor.id)}
                      >
                        <Map className="h-3 w-3" />
                        {neighbor.displayName}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3">Pokémon Encounters:</h3>
            {areasWithEncounters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No wild encounters are recorded for this location.
              </p>
            ) : (
              <div className="space-y-6">
                {areasWithEncounters.map((area) => (
                  <div key={area.id}>
                    {areasWithEncounters.length > 1 && (
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">
                        {area.displayName}
                      </h4>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {area.encounters.map((encounter, index) => (
                        <Link
                          key={`${encounter.pokemonId}-${encounter.method}-${index}`}
                          to={`/pokemon/${encounter.pokemonId}`}
                          className="flex flex-col items-center p-4 border rounded-md bg-card hover:shadow-md transition-shadow"
                        >
                          <div className="mb-3">
                            <img
                              src={pokemonImage(encounter.pokemonId, spriteStyle)}
                              alt={encounter.pokemonName}
                              loading="lazy"
                              onError={(e) => spriteFallback(e, encounter.pokemonId)}
                              className={`w-20 h-20 object-contain ${spriteStyle === 'sprite' ? 'pixelated' : ''}`}
                            />
                          </div>
                          <div className="text-center">
                            <div className="text-base font-medium mb-1">
                              {capitalize(encounter.pokemonName)}
                            </div>
                            <div className="text-xs text-muted-foreground mb-2 capitalize">
                              {encounter.method.replace(/-/g, ' ')} · Lv. {encounter.minLevel}
                              {encounter.maxLevel !== encounter.minLevel && `–${encounter.maxLevel}`}
                            </div>
                            <div className="flex gap-1 justify-center flex-wrap mb-2">
                              {encounter.types.map((type) => (
                                <TypeBadge key={type} type={type} />
                              ))}
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full capitalize ${RARITY_STYLE[encounter.rarity] ?? ''}`}
                            >
                              {encounter.rarity.replace('-', ' ')}
                            </span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationDetails;
