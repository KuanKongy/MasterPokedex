import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { List } from 'lucide-react';
import PokemonMap from '../components/PokemonMap';
import HelpTip from '../components/HelpTip';
import { useRegions } from '@/hooks/api/world';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Pokémon Map</h1>
          <p className="text-muted-foreground">
            Explore locations and discover which Pokémon can be found in different areas
          </p>
        </div>
        <Link
          to="/locations"
          className="inline-flex items-center gap-1 text-sm font-medium text-pokebrand-red hover:underline"
        >
          <List className="h-3.5 w-3.5" />
          Browse all locations
        </Link>
      </div>

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
                  {region.description && <CardDescription>{region.description}</CardDescription>}
                  {/* Counts as chips rather than a run-on sentence — three
                      numbers separated by middots read as one long caption. */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="secondary" className="font-normal">
                      {region.locationCount} locations
                    </Badge>
                    {region.areaCount > 0 && (
                      <>
                        <Badge variant="secondary" className="font-normal">
                          {region.areaCount} areas
                        </Badge>
                        <HelpTip title="Areas">
                          A location splits into areas — floors of a cave, tall grass, water —
                          and encounters are listed per area.
                        </HelpTip>
                      </>
                    )}
                    {region.speciesCount > 0 && (
                      <Badge variant="secondary" className="font-normal">
                        {region.speciesCount} Pokémon found here
                      </Badge>
                    )}
                  </div>
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
