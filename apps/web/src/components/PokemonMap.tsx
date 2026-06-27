import React, { useEffect, useRef, useState } from 'react';
import type { RegionSummary } from '@masterpokedex/shared';
import { useRegionLocations } from '@/hooks/api/world';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MapPin, Compass, AlertTriangle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import LocationSurfaceCard from './locations/LocationSurfaceCard';
import { resolveAsset } from '@/lib/assets';
import { cn } from '@/lib/utils';

const KIND_PIN_COLOR: Record<string, string> = {
  city: 'text-pokebrand-red',
  town: 'text-orange-500',
  forest: 'text-green-600',
  cave: 'text-stone-500',
  island: 'text-blue-500',
};

interface PokemonMapProps {
  region: RegionSummary;
}

/**
 * The interactive half of the map page. Picking a pin or a list row keeps
 * you here: the right column swaps to a surface preview of that location,
 * and only its "Full details" button leaves for /locations/:id.
 */
const PokemonMap: React.FC<PokemonMapProps> = ({ region }) => {
  const { data: locations, isLoading, error } = useRegionLocations(region.id);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // On stacked (mobile) layouts the panel sits below the map — bring it into view.
  useEffect(() => {
    if (selectedId !== null) {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedId]);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <p>Error loading map data. Please try again later.</p>
      </div>
    );
  }

  const pinned = (locations ?? []).filter((l) => l.mapX !== null && l.mapY !== null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card className="shadow-md">
          <CardContent className="p-4">
            {region.mapImage ? (
              <div className="relative mx-auto max-w-3xl">
                <img
                  src={resolveAsset(region.mapImage)}
                  alt={`Map of ${region.displayName}`}
                  className="w-full rounded-md shadow-md"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = resolveAsset('placeholder.svg');
                  }}
                />
                {pinned.map((location) => (
                  <Tooltip key={location.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={location.displayName}
                        onClick={() => setSelectedId(location.id)}
                        style={{ left: `${location.mapX}%`, top: `${location.mapY}%` }}
                        className={cn(
                          'absolute -translate-x-1/2 -translate-y-full drop-shadow transition-transform hover:scale-125 focus-visible:scale-125',
                          selectedId === location.id && 'scale-125 drop-shadow-lg',
                        )}
                      >
                        <MapPin
                          className={cn(
                            'h-6 w-6',
                            selectedId === location.id ? 'fill-pokebrand-red/30' : 'fill-white/80',
                            KIND_PIN_COLOR[location.kind ?? ''] ?? 'text-pokebrand-red',
                          )}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{location.displayName}</p>
                      {location.kind && <p className="text-xs capitalize text-muted-foreground">{location.kind}</p>}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No map art for this region yet — its locations are listed here.
              </p>
            )}
            {pinned.length > 0 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {pinned.length} of {region.locationCount} locations placed on the map — click a pin to preview it here
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1" ref={panelRef}>
        {selectedId !== null ? (
          <LocationSurfaceCard
            locationId={selectedId}
            onSelectNeighbor={setSelectedId}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <Card className="flex h-[560px] flex-col shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-pokebrand-red" />
                {region.displayName} Locations
              </CardTitle>
              <CardDescription>Pick a location to preview which Pokémon can be found there</CardDescription>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 p-0">
              <ScrollArea className="h-full">
                <div className="divide-y">
                  {locations && locations.length > 0 ? (
                    locations.map((location) => (
                      <button
                        key={location.id}
                        type="button"
                        onClick={() => setSelectedId(location.id)}
                        className="block w-full p-3 text-left transition-colors hover:bg-secondary/50"
                      >
                        <div className="font-medium">{location.displayName}</div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Compass className="h-3 w-3" />
                          {location.kind ? <span className="capitalize">{location.kind}</span> : location.regionName}
                          {location.areaCount > 0 && (
                            <span className="ml-auto text-xs">
                              {location.areaCount} area{location.areaCount === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="p-3 text-center text-muted-foreground">No locations found for this region</div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PokemonMap;
