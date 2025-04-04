
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchRegionById } from '../api/regionApi';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MapPin, Cloud, Route, ArrowLeft } from 'lucide-react';
import PokemonMap from '@/components/PokemonMap';

const RegionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const regionId = id ? parseInt(id) : 1;
  
  const { data: region, isLoading, error } = useQuery({
    queryKey: ['region', regionId],
    queryFn: () => fetchRegionById(regionId)
  });
  
  if (isLoading) {
    return <div className="container mx-auto px-4 py-8 text-center">Loading region details...</div>;
  }
  
  if (error || !region) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Region not found</h2>
        <p className="text-muted-foreground">We couldn't find the region you're looking for.</p>
        <Link to="/regions" className="text-primary hover:underline mt-4 inline-block">
          Return to regions list
        </Link>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Link to="/regions" className="flex items-center text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Regions
      </Link>
      
      <div className="flex flex-col md:flex-row gap-6 items-start mb-8">
        <div className="md:w-1/3">
          <img 
            src={region.mainImage} 
            alt={`${region.name} region map`}
            className="w-full rounded-lg shadow-md" 
          />
        </div>
        
        <div className="md:w-2/3">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">{region.name} Region</h1>
          <p className="text-muted-foreground mb-6">{region.description}</p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border rounded-md p-3 text-center">
              <p className="text-sm text-muted-foreground">Locations</p>
              <p className="text-xl font-bold">{region.locations.length}</p>
            </div>
            
            <div className="bg-card border rounded-md p-3 text-center">
              <p className="text-sm text-muted-foreground">Routes</p>
              <p className="text-xl font-bold">{Math.floor(region.locations.length / 2)}</p>
            </div>
            
            <div className="bg-card border rounded-md p-3 text-center">
              <p className="text-sm text-muted-foreground">Cities/Towns</p>
              <p className="text-xl font-bold">{Math.ceil(region.locations.length / 2)}</p>
            </div>
          </div>
          
          <h2 className="text-xl font-bold mb-3">About This Region</h2>
          <p className="text-muted-foreground">
            {region.name} is a vibrant region with diverse ecosystems and Pokémon habitats.
            Trainers from all over the world come to {region.name} to catch unique Pokémon and 
            challenge the region's Gym Leaders.
          </p>
        </div>
      </div>
      
      <Tabs defaultValue="locations" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="routes">Routes</TabsTrigger>
          <TabsTrigger value="map">Interactive Map</TabsTrigger>
        </TabsList>
        
        <TabsContent value="locations">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {region.locations.map(location => (
              <Card key={location.id}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{location.name}</CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {location.pokemonEncounters.length > 0 ? `${location.pokemonEncounters.length} Pokémon` : 'No encounters'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">{location.description}</p>
                  
                  {location.weather.length > 0 && (
                    <div className="flex items-center gap-1 text-xs mt-3">
                      <Cloud className="h-3 w-3" />
                      <span className="text-muted-foreground">Weather:</span>
                      <div className="flex gap-1">
                        {location.weather.map(w => (
                          <Badge key={w} variant="secondary" className="text-xs capitalize">{w}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {location.pokemonEncounters.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium mb-1">Pokémon encounters:</p>
                      <div className="flex flex-wrap gap-1">
                        {location.pokemonEncounters.map(encounter => (
                          <div key={encounter.pokemonId} className="flex items-center gap-1 bg-muted p-1 rounded-md">
                            <img src={encounter.sprite} alt={encounter.name} className="w-6 h-6" />
                            <span className="text-xs capitalize">{encounter.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="routes">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <Route className="h-5 w-5" /> {region.name} Routes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {region.locations.filter((_, i) => i % 2 === 1).map((location) => (
                    <div key={location.id} className="flex items-center gap-3 p-2 border rounded-md">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{`Route ${location.id}`}</p>
                        <p className="text-xs text-muted-foreground">Connects to {location.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <div className="bg-muted/30 rounded-lg p-6 flex flex-col items-center justify-center text-center">
              <Route className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Route Information</h3>
              <p className="text-muted-foreground">
                Routes connect different locations within the {region.name} region. They are paths where
                trainers can encounter wild Pokémon, battle other trainers, and discover new areas.
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="map">
          <PokemonMap regionId={regionId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RegionDetail;
