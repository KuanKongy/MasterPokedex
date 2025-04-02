
import React, { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchRegionById, fetchRegionPokemon, fetchRegionLocations } from '../api/regionApi';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import PokemonCard from '../components/PokemonCard';
import LocationDetails from '../components/LocationDetails';
import { ChevronLeft, MapPin } from 'lucide-react';

const RegionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  
  const { data: region, isLoading: isLoadingRegion } = useQuery({
    queryKey: ['region', id],
    queryFn: () => fetchRegionById(parseInt(id || '1'))
  });
  
  const { data: regionPokemon, isLoading: isLoadingPokemon } = useQuery({
    queryKey: ['regionPokemon', id],
    queryFn: () => fetchRegionPokemon(parseInt(id || '1'))
  });
  
  const { data: locations, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['regionLocations', id],
    queryFn: () => fetchRegionLocations(parseInt(id || '1'))
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
              {[
                { label: 'Main City', value: region.mainCity },
                { label: 'Professor', value: region.professor },
                { label: 'Generation', value: region.generation },
                { label: 'Starter Pokémon', value: region.starters?.join(', ') }
              ].map((item, idx) => (
                <div key={idx} className="flex">
                  <p className="font-bold w-[150px]">{item.label}:</p>
                  <p>{item.value}</p>
                </div>
              ))}
            </div>
            
            <p>{region.description}</p>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="pokemon">
        <TabsList>
          <TabsTrigger value="pokemon">Regional Pokémon</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="gyms">Gyms & Leaders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pokemon">
          <div className="p-2">
            {isLoadingPokemon ? (
              <div className="p-4 text-center">Loading Pokémon...</div>
            ) : (
              <div>
                <p className="mb-4">These Pokémon can be found in the {region.name} region:</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {regionPokemon?.pokemon.map((pokemon) => (
                    <div 
                      key={pokemon.id} 
                      className="border border-gray-200 rounded-md"
                    >
                      <PokemonCard pokemon={pokemon} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="locations">
          <div className="p-2">
            {isLoadingLocations ? (
              <div className="p-4 text-center">Loading locations...</div>
            ) : (
              <div className="flex flex-col md:flex-row gap-4">
                <div 
                  className="flex-none w-[300px] border border-gray-200 rounded-md overflow-y-auto"
                  style={{ height: 'auto', maxHeight: '500px' }}
                >
                  {locations?.map((location) => (
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
                      locationId={selectedLocation} 
                      regionId={region.id}
                    />
                  ) : (
                    <div className="border border-gray-200 rounded-md p-8 text-center">
                      <p className="text-gray-500">Select a location to view details</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="gyms">
          <div>
            <p className="mb-4">Gym Leaders and Elite Four members from the {region.name} region:</p>
            
            {region.gymLeaders?.map((leader, idx) => (
              <Card key={idx} className="mb-4">
                <CardHeader>
                  <h3 className="text-xl font-semibold">{leader.name}</h3>
                  <p className="text-sm">
                    {leader.title} - {leader.type} Type
                  </p>
                </CardHeader>
                <CardContent>
                  <p>{leader.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegionDetail;
