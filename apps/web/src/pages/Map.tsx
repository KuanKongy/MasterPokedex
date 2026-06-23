import React, { useState } from 'react';
import PokemonMap from '../components/PokemonMap';
import { useRegions } from '@/hooks/api/world';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Region explorer. Every region the dex knows comes from the API; the map
 * images and blurbs are our curated `location_meta`/`region` data, and the
 * pins are per-location percentage coordinates over the map art.
 */
const Map = () => {
  const { data: regions, isLoading } = useRegions();
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);

  const activeRegionId = selectedRegionId ?? regions?.[0]?.id ?? null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Pokémon Map</h1>
      <p className="text-muted-foreground mb-8">
        Explore locations and discover which Pokémon can be found in different areas
      </p>

      {isLoading || !regions ? (
        <div className="flex justify-center p-8">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="space-y-6">
          <Tabs
            value={activeRegionId?.toString()}
            onValueChange={(value) => {
              setSelectedRegionId(Number(value));
              setSelectedLocationId(null);
            }}
          >
            <TabsList className="mb-4 flex overflow-x-auto justify-start w-full">
              {regions.map((region) => (
                <TabsTrigger key={region.id} value={region.id.toString()}>
                  {region.displayName}
                </TabsTrigger>
              ))}
            </TabsList>

            {regions.map((region) => (
              <TabsContent key={region.id} value={region.id.toString()}>
                <Card>
                  <CardHeader>
                    <CardTitle>{region.displayName} Region</CardTitle>
                    <CardDescription>{region.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {region.mapImage ? (
                      <div className="max-w-3xl mx-auto">
                        <img
                          src={region.mapImage}
                          alt={`Map of ${region.displayName}`}
                          className="rounded-md shadow-md w-full"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = 'placeholder.svg';
                          }}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No map art for this region yet — its locations are listed below.
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-3 text-center">
                      {region.locationCount} known locations
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {activeRegionId !== null && (
            <PokemonMap
              regionId={activeRegionId}
              selectedLocationId={selectedLocationId}
              onSelectLocation={setSelectedLocationId}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Map;
