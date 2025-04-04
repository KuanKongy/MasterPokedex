
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Location } from '../types/location';
import { Badge } from './ui/badge';
import { MapPin, Map } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchPokemonDetails } from '../api/pokemonApi';

interface LocationDetailsProps {
  location: Location;
}

const LocationDetails: React.FC<LocationDetailsProps> = ({ location }) => {
  // Fetch all pokemon for this location
  const pokemonQueries = location.pokemon.map(pokemonId => {
    return useQuery({
      queryKey: ['pokemon', pokemonId],
      queryFn: () => fetchPokemonDetails(pokemonId),
      staleTime: 1000 * 60 * 60, // 1 hour
    });
  });

  // Check if all pokemon data has been loaded
  const isLoading = pokemonQueries.some(query => query.isLoading);
  
  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">{location.name}</CardTitle>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" /> {location.region.charAt(0).toUpperCase() + location.region.slice(1)}
            </p>
          </div>
          <Badge variant="outline" className="capitalize">
            {location.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <img 
              src={location.image} 
              alt={location.name}
              className="w-full h-auto rounded-md shadow-sm"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.onerror = null;
                target.src = "/placeholder.svg";
              }}
            />
          </div>
          <div>
            <p className="text-sm mb-4">{location.description}</p>
            
            {location.trainers && location.trainers.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Notable Trainers:</h3>
                <div className="flex flex-wrap gap-2">
                  {location.trainers.map((trainer, index) => (
                    <Badge key={index} variant="secondary">{trainer}</Badge>
                  ))}
                </div>
              </div>
            )}

            <h3 className="font-semibold mb-2">Neighboring Locations:</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {location.neighboringLocations.map((loc, index) => (
                <Badge key={index} variant="outline" className="flex items-center gap-1">
                  <Map className="h-3 w-3" />
                  {loc.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </Badge>
              ))}
            </div>
            
            <h3 className="font-semibold mb-2">Pokémon Encounters:</h3>
            {isLoading ? (
              <div className="text-center p-4">Loading Pokémon data...</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {pokemonQueries.map((query, index) => {
                  if (query.isLoading || !query.data) return null;
                  
                  const pokemon = query.data;
                  return (
                    <div key={index} className="flex items-center p-2 border rounded-md bg-card hover:shadow-sm transition-shadow">
                      <div className="mr-2">
                        <img 
                          src={pokemon.sprites.front_default} 
                          alt={pokemon.name}
                          className="w-10 h-10"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-medium">
                          {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          #{pokemon.id.toString().padStart(3, '0')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationDetails;
