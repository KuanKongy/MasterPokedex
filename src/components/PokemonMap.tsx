
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLocations } from '../api/locationApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { MapPin, Compass, AlertTriangle } from 'lucide-react';
import LocationDetails from './LocationDetails';
import { Location } from '../types/location';
import { useToast } from '@/hooks/use-toast';

interface PokemonMapProps {
  regionId?: number;
}

const PokemonMap: React.FC<PokemonMapProps> = ({ regionId }) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const { toast } = useToast();
  
  const { data: locations, isLoading, error } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations
  });
  
  // Filter locations by region
  const regionLocations = locations?.filter(location => {
    if (!regionId) return location.region === "Kanto"; // Default to Kanto
    
    const regionNames: Record<number, string> = {
      1: "Kanto",
      2: "Johto",
      3: "Hoenn"
    };
    
    return location.region === regionNames[regionId];
  });
  
  // Reset selected location when region changes
  useEffect(() => {
    setSelectedLocation(null);
  }, [regionId]);

  // Display error toast if map data fails to load
  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading map data",
        description: "Unable to load location information. Please try again later.",
        variant: "destructive"
      });
    }
  }, [error, toast]);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><p>Loading map data...</p></div>;
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md flex items-center gap-3">
        <AlertTriangle className="h-5 w-5" />
        <p>Error loading map data. Please try again later.</p>
      </div>
    );
  }
  
  // Get current region name
  const regionName = regionId ? 
    (regionId === 1 ? "Kanto" : regionId === 2 ? "Johto" : regionId === 3 ? "Hoenn" : "Unknown") : 
    "Kanto";
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card className="shadow-md h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-pokebrand-red" />
              {regionName} Locations
            </CardTitle>
            <CardDescription>
              Select a location to see which Pokémon can be found there
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              <div className="divide-y">
                {regionLocations?.length ? (
                  regionLocations.map((location) => (
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
