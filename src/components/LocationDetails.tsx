
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Location, PokemonEncounter } from '../types/location';
import { Badge } from './ui/badge';
import { MapPin, CloudRain, Sun, Moon, Star } from 'lucide-react';

interface LocationDetailsProps {
  location: Location;
}

const rarityColors: Record<string, string> = {
  common: 'bg-gray-200 text-gray-800',
  uncommon: 'bg-green-100 text-green-800',
  rare: 'bg-blue-100 text-blue-800',
  'very-rare': 'bg-purple-100 text-purple-800',
  legendary: 'bg-yellow-100 text-yellow-800'
};

const PokemonEncounterCard: React.FC<{ encounter: PokemonEncounter }> = ({ encounter }) => {
  return (
    <div className="flex items-center p-2 border rounded-md bg-card hover:shadow-md transition-shadow">
      <div className="flex-shrink-0 mr-3">
        <img 
          src={encounter.sprite} 
          alt={encounter.name} 
          className="w-16 h-16 object-contain"
        />
      </div>
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium">{encounter.name}</span>
          <span className={`text-xs px-2 py-1 rounded-full ${rarityColors[encounter.rarity]}`}>
            {encounter.rarity.charAt(0).toUpperCase() + encounter.rarity.slice(1)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mb-1">
          Encounter rate: {encounter.encounterRate}%
        </div>
        {encounter.conditions && encounter.conditions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {encounter.conditions.map((condition) => (
              <Badge key={condition} variant="outline" className="text-xs">
                {condition}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const LocationDetails: React.FC<LocationDetailsProps> = ({ location }) => {
  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'rainy': return <CloudRain className="h-4 w-4" />;
      case 'sunny': return <Sun className="h-4 w-4" />;
      case 'night': return <Moon className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">{location.name}</CardTitle>
            <p className="text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" /> {location.region}
            </p>
          </div>
          <div className="flex gap-1">
            {location.weather.map((weather) => (
              <Badge key={weather} variant="secondary" className="capitalize">
                <span className="flex items-center gap-1">
                  {getWeatherIcon(weather)} {weather}
                </span>
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-6">{location.description}</p>

        <h3 className="font-semibold text-lg mb-3">Pokémon Encounters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {location.pokemonEncounters.map((encounter) => (
            <PokemonEncounterCard key={encounter.pokemonId} encounter={encounter} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationDetails;
