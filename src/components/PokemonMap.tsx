
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLocations } from '../api/locationApi';
import LocationDetails from './LocationDetails';
import { Location } from '../types/location';
import { MapPin, Compass } from 'lucide-react';

interface PokemonMapProps {
  regionId?: number;
  selectedLocation?: number | null;
  onLocationSelect?: (locationId: number) => void;
}

const PokemonMap: React.FC<PokemonMapProps> = ({ 
  regionId, 
  selectedLocation: externalSelectedLocation, 
  onLocationSelect 
}) => {
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  
  // Use external state if provided
  const activeLocation = externalSelectedLocation !== undefined 
    ? externalSelectedLocation 
    : selectedLocation;
  
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
  
  // Handle location selection
  const handleLocationClick = (locationId: number) => {
    if (onLocationSelect) {
      onLocationSelect(locationId);
    } else {
      setSelectedLocation(locationId);
    }
  };
  
  // Reset selected location when region changes
  useEffect(() => {
    setSelectedLocation(null);
  }, [regionId]);
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-16"><p>Loading map data...</p></div>;
  }
  
  if (error) {
    return <div className="text-red-500 p-4">Error loading map data</div>;
  }
  
  // Get current region name
  const regionName = regionId ? 
    (regionId === 1 ? "Kanto" : regionId === 2 ? "Johto" : regionId === 3 ? "Hoenn" : "Unknown") : 
    "Kanto";
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="shadow-md rounded-md border bg-white h-full">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <MapPin className="text-red-500" size={20} />
              <h2 className="text-lg font-medium">{regionName} Locations</h2>
            </div>
            <p className="text-gray-500 text-sm">
              Select a location to see which Pokémon can be found there
            </p>
          </div>
          <div>
            <div className="max-h-[calc(100vh-300px)] overflow-y-auto">
              <div>
                {regionLocations?.length ? (
                  regionLocations.map((location) => (
                    <div 
                      key={location.id}
                      className={`p-3 ${activeLocation === location.id ? 'bg-gray-100' : ''} 
                      hover:bg-gray-50 cursor-pointer transition-colors border-b`}
                      onClick={() => handleLocationClick(location.id)}
                    >
                      <p className="font-medium">{location.name}</p>
                      <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Compass size={12} /> {location.region}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-center text-gray-500">
                    No locations found for this region
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        {activeLocation && regionLocations ? (
          <LocationDetails location={regionLocations.find(loc => loc.id === activeLocation)} />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center shadow-md border rounded-md bg-white">
            <MapPin size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Location</h3>
            <p className="text-gray-500">
              Click on a location from the list to view detailed information and Pokémon encounters
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PokemonMap;
