
import React, { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchRegionById } from '../api/regionApi';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import PokemonCard from '../components/PokemonCard';
import LocationDetails from '../components/LocationDetails';
import { ChevronLeft, MapPin } from 'lucide-react';

const RegionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  
  const { data: region, isLoading: isLoadingRegion } = useQuery({
    queryKey: ['region', id],
    queryFn: () => fetchRegionById(parseInt(id || '1'))
  });
  
  if (isLoadingRegion) {
    return <div className="p-8 text-center">Loading region data...</div>;
  }
  
  if (!region) {
    return (
      <div className="p-8 text-center">
        <p>Region not found</p>
        <div className="mt-4">
          <RouterLink to="/regions" className="text-blue-500 hover:underline">
            Return to Regions List
          </RouterLink>
        </div>
      </div>
    );
  }
  
  // Get locations directly from the region data
  const locations = region.locations || [];
  
  return (
    <div className="mx-auto p-4 max-w-[1200px]">
      <RouterLink to="/regions" className="flex items-center text-blue-500 mb-4">
        <ChevronLeft size={16} />
        <span className="ml-1">Back to Regions</span>
      </RouterLink>
      
      <div className="mb-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="flex-1 md:flex-none md:w-[280px] relative rounded-lg overflow-hidden shadow-md">
            <img 
              src={region.mainImage || '/placeholder.svg'} 
              alt={region.name} 
              className="object-cover w-full"
            />
          </div>
          
          <div className="flex-1 flex flex-col gap-4">
            <h1 className="text-2xl font-bold">{region.name}</h1>
            
            <div className="flex flex-col gap-2">
              {/* Display region properties if they exist */}
              <div className="flex">
                <p className="font-bold w-[150px]">Region:</p>
                <p>{region.name}</p>
              </div>
              <div className="flex">
                <p className="font-bold w-[150px]">Description:</p>
                <p>{region.description}</p>
              </div>
              <div className="flex">
                <p className="font-bold w-[150px]">Number of Locations:</p>
                <p>{region.locations?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Tabs value="locations">
        <TabsList>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="locations">
          <div className="p-2">
            <div className="flex flex-col md:flex-row gap-4">
              <div 
                className="flex-none w-[300px] border border-gray-200 rounded-md overflow-y-auto"
                style={{ height: 'auto', maxHeight: '500px' }}
              >
                {locations.map((location) => (
                  <div 
                    key={location.id}
                    className={`p-3 cursor-pointer border-b border-gray-200 flex items-center ${
                      selectedLocation === location.id ? 'bg-gray-100' : 'bg-transparent'
                    } hover:bg-gray-50`}
                    onClick={() => setSelectedLocation(location.id)}
                  >
                    <MapPin size={16} />
                    <span className="ml-2">{location.name}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex-1">
                {selectedLocation ? (
                  <LocationDetails 
                    location={locations.find(loc => loc.id === selectedLocation)} 
                  />
                ) : (
                  <div className="border border-gray-200 rounded-md p-8 text-center">
                    <p className="text-gray-500">Select a location to view details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegionDetail;
