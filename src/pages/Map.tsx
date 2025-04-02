
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLocations } from '../api/locationApi';
import { Location } from '../types/location';
import { MapPin } from 'lucide-react';
import PokemonMap from '../components/PokemonMap';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const Map: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations
  });
  
  const locationDetails = selectedLocation 
    ? locations.find(location => location.id === selectedLocation) 
    : null;
  
  const handleLocationSelect = (locationId: number) => {
    setSelectedLocation(locationId);
  };
  
  const clearSelection = () => {
    setSelectedLocation(null);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Pokémon World Map</h1>
      <p className="text-gray-600 mb-8">
        Explore regions and locations throughout the Pokémon world
      </p>
      
      <Tabs value="map">
        <TabsList>
          <TabsTrigger value="map">Interactive Map</TabsTrigger>
          <TabsTrigger value="list">Locations List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="map">
          <div 
            className="h-[600px] relative rounded-lg overflow-hidden border mb-4"
          >
            <PokemonMap 
              regionId={1} // Default to Kanto region
              selectedLocation={selectedLocation}
              onLocationSelect={handleLocationSelect}
            />
            
            {selectedLocation && locationDetails && (
              <div 
                className="absolute bottom-4 right-4 w-full md:w-[350px] z-10"
              >
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-lg">{locationDetails.name}</h3>
                      <button 
                        className="text-sm bg-transparent border-none cursor-pointer"
                        onClick={clearSelection}
                      >
                        ×
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-2">{locationDetails.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge>{locationDetails.region}</Badge>
                      {locationDetails.weather && locationDetails.weather.length > 0 && (
                        <Badge variant="secondary">Has Weather</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="list">
          <div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {locations.map((location) => (
              <Card key={location.id} className="cursor-pointer" onClick={() => handleLocationSelect(location.id)}>
                <CardContent className="p-4">
                  <div className="flex items-center mb-2">
                    <MapPin size={16} className="mr-2" />
                    <h3 className="font-semibold">{location.name}</h3>
                  </div>
                  <p className="text-sm text-gray-600">{location.region}</p>
                  
                  <div className="mt-3 flex gap-2">
                    <Badge variant="outline">Location</Badge>
                    {location.weather && location.weather.length > 0 && (
                      <Badge variant="secondary">Has Weather</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Map;
