
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLocations } from '../api/locationApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { MapPin, Compass } from 'lucide-react';
import LocationDetails from './LocationDetails';
import { Location } from '../types/location';

const PokemonMap: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  
  const { data: locations, isLoading, error } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations
  });
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><p>Loading map data...</p></div>;
  }
  
  if (error) {
    return <div className="text-red-500 p-4">Error loading map data</div>;
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card className="shadow-md h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-pokebrand-red" />
              Kanto Locations
            </CardTitle>
            <CardDescription>
              Select a location to see which Pokémon can be found there
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              <div className="divide-y">
                {locations?.map((location) => (
                  <div 
                    key={location.id}
                    className={`p-3 hover:bg-secondary/50 cursor-pointer transition-colors ${
                      selectedLocation?.id === location.id ? 'bg-secondary' : ''
                    }`}
                    onClick={() => setSelectedLocation(location)}
                  >
                    <div className="font-medium">{location.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Compass className="h-3 w-3" /> {location.region}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        {selectedLocation ? (
          <LocationDetails location={selectedLocation} />
        ) : (
          <Card className="h-full flex flex-col items-center justify-center p-6 text-center shadow-md">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-medium mb-2">Select a Location</h3>
            <p className="text-muted-foreground">
              Click on a location from the list to view detailed information and Pokémon encounters
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PokemonMap;
