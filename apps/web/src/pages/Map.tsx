import React from 'react';
import { useSearchParams } from 'react-router-dom';
import PokemonMap from '../components/PokemonMap';
import { useRegions } from '@/hooks/api/world';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * Region explorer. Every region the dex knows comes from the API; the map
 * images and blurbs are our curated data, self-hosted under public/maps, and
 * the pins are per-location percentage coordinates over the art. The active
 * region rides in ?region= so the catalog page can deep-link here.
 */
const Map = () => {
  const { data: regions, isLoading } = useRegions();
  const [params, setParams] = useSearchParams();

  const requested = params.get('region');
  const activeRegion =
    regions?.find((r) => r.name === requested || String(r.id) === requested) ?? regions?.[0] ?? null;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Pokémon Map</h1>
      <p className="text-muted-foreground mb-8">
        Explore locations and discover which Pokémon can be found in different areas
      </p>

      {isLoading || !regions || !activeRegion ? (
        <div className="flex justify-center p-8">
          <LoadingSpinner />
        </div>
      ) : (
        <Tabs
          value={String(activeRegion.id)}
          onValueChange={(value) => {
            const region = regions.find((r) => String(r.id) === value);
            setParams(region ? { region: region.name } : {}, { replace: true });
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
            <TabsContent key={region.id} value={region.id.toString()} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{region.displayName} Region</CardTitle>
                  <CardDescription>
                    {region.description}
                    {region.description ? ' · ' : ''}
                    {region.locationCount} known locations
                  </CardDescription>
                </CardHeader>
              </Card>
              <PokemonMap region={region} />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default Map;
