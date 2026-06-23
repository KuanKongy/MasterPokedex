import React from 'react';
import { useRegionLocations } from '@/hooks/api/world';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { MapPin, Compass, AlertTriangle } from 'lucide-react';
import LocationDetails from './LocationDetails';
import { cn } from '@/lib/utils';

interface PokemonMapProps {
  regionId: number;
  selectedLocationId: number | null;
  onSelectLocation: (locationId: number | null) => void;
}

const PokemonMap: React.FC<PokemonMapProps> = ({ regionId, selectedLocationId, onSelectLocation }) => {
  const { data: locations, isLoading, error } = useRegionLocations(regionId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading map data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        <p>Error loading map data. Please try again later.</p>
      </div>
    );
  }

  const regionName = locations?.[0]?.regionName ?? '';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card className="shadow-md h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-pokebrand-red" />
              {regionName ? `${regionName} Locations` : 'Locations'}
            </CardTitle>
            <CardDescription>Select a location to see which Pokémon can be found there</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              <div className="divide-y">
                {locations && locations.length > 0 ? (
                  locations.map((location) => (
                    <div
                      key={location.id}
                      className={cn(
                        'p-3 hover:bg-secondary/50 cursor-pointer transition-colors',
                        selectedLocationId === location.id && 'bg-secondary',
                      )}
                      onClick={() => onSelectLocation(location.id)}
                    >
                      <div className="font-medium">{location.displayName}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Compass className="h-3 w-3" />
                        {location.kind ? (
                          <span className="capitalize">{location.kind}</span>
                        ) : (
                          location.regionName
                        )}
                        {location.areaCount > 0 && (
                          <span className="ml-auto text-xs">
                            {location.areaCount} area{location.areaCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-muted-foreground">
                    No locations found for this region
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-2">
        {selectedLocationId !== null ? (
          <LocationDetails locationId={selectedLocationId} onSelectLocation={onSelectLocation} />
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
