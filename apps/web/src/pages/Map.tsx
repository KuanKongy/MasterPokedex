
import React, { useState, useEffect } from 'react';
import PokemonMap from '../components/PokemonMap';
import { useQuery } from '@tanstack/react-query';
import { fetchRegions } from '../api/regionApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle } from 'lucide-react';
import { TypeBadge } from '@/components/ui/type-badge';

const Map = () => {
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const { toast } = useToast();
  
  const { data: regions, isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegions
  });

  // Set default region when data loads
  useEffect(() => {
    if (regions && regions.length > 0 && !selectedRegionId) {
      setSelectedRegionId(regions[0].id);
    }
  }, [regions, selectedRegionId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Pokémon Map</h1>
      <p className="text-muted-foreground mb-8">
        Explore locations and discover which Pokémon can be found in different areas
      </p>
      
      {isLoading ? (
        <div className="flex justify-center p-8">Loading region data...</div>
      ) : (
        <div className="space-y-6">
          <Tabs 
            defaultValue={regions?.[0]?.id.toString()} 
            onValueChange={(value) => setSelectedRegionId(Number(value))}
          >
            <TabsList className="mb-4 flex overflow-x-auto">
              {regions?.map(region => (
                <TabsTrigger key={region.id} value={region.id.toString()}>
                  {region.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {regions?.map(region => (
              <TabsContent key={region.id} value={region.id.toString()}>
                <Card>
                  <CardHeader>
                    <CardTitle>{region.name} Region</CardTitle>
                    <CardDescription>{region.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div>
                        <img 
                          src={region.mainImage} 
                          alt={`Map of ${region.name}`}
                          className="rounded-md shadow-md w-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            
                            // Use placeholder for missing image
                            target.src = "/placeholder.svg";
                            
                            // Show toast notification
                            if (region.name === "Kanto") {
                              toast({
                                title: "Map image not found",
                                description: `The map image for ${region.name} region is unavailable.`,
                                variant: "destructive"
                              });
                            }
                          }}
                        />
                       
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Notable Locations</h3>
                        <ul className="space-y-4">
                          {region.locations.map(location => (
                            <li key={location.id} className="border-b pb-3">
                              <div className="font-medium">{location.name}</div>
                              <div className="text-sm text-muted-foreground">{location.description}</div>
                              {location.pokemonEncounters.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs font-medium mb-1">Pokémon Encounters:</div>
                                  <div className="flex flex-wrap gap-2">
                                    {location.pokemonEncounters.map(encounter => (
                                      <div key={encounter.pokemonId} className="flex items-center gap-1 bg-muted/50 px-3 py-2 rounded-md">
                                        <img 
                                          src={encounter.sprite || "/placeholder.svg"} 
                                          alt={encounter.name} 
                                          className="w-16 h-16" // Increased size from 4x4 to 8x8
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null;
                                            target.src = "/placeholder.svg";
                                          }}
                                        />
                                        <span className="text-sm">{encounter.name}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
          
          <PokemonMap regionId={selectedRegionId || 1} />
        </div>
      )}
    </div>
  );
};

export default Map;

// {region.name === "Kanto" && (
//   <div className="mt-2 px-3 py-2 bg-orange-100 text-orange-800 rounded-md flex items-center gap-2 text-sm">
//     <AlertTriangle className="h-4 w-4" />
//     Map image unavailable. Our Pokédex systems are being updated.
//   </div>
// )}