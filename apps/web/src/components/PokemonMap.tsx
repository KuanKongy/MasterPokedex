import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { RegionSummary } from '@masterpokedex/shared';
import { useRegionLocations } from '@/hooks/api/world';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MapPin, Compass, AlertTriangle, Search, Star } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import LocationSurfaceCard from './locations/LocationSurfaceCard';
import HelpTip from './HelpTip';
import { resolveAsset } from '@/lib/assets';
import { cn } from '@/lib/utils';

const KIND_PIN_COLOR: Record<string, string> = {
  city: 'text-pokebrand-red',
  town: 'text-orange-500',
  forest: 'text-green-600',
  cave: 'text-stone-500',
  island: 'text-blue-500',
  route: 'text-amber-600',
  mountain: 'text-stone-600',
  water: 'text-sky-500',
};

interface PokemonMapProps {
  region: RegionSummary;
}

/**
 * The interactive half of the map page.
 *
 * Three bands rather than two columns. The old layout put the map beside a
 * fixed 560px-tall panel that had to hold a location's art, blurb, trainers,
 * neighbours *and* its encounter list in one narrow scroll — everything in it
 * read as squeezed. Now the map shares its row with the region's notable
 * places, and the location list and its detail get a full-width row below,
 * where the detail panel has room to put the art beside the text.
 *
 * Picking a pin or a row keeps you here; only "Full details" leaves for
 * /locations/:id.
 */
const PokemonMap: React.FC<PokemonMapProps> = ({ region }) => {
  const { data: locations, isLoading, error } = useRegionLocations(region.id);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  // Bring the detail into view wherever it lands — below the map on mobile,
  // beside the list on desktop.
  useEffect(() => {
    if (selectedId !== null) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [selectedId]);

  const all = useMemo(() => locations ?? [], [locations]);
  const pinned = useMemo(() => all.filter((l) => l.mapX !== null && l.mapY !== null), [all]);
  const notable = useMemo(
    () => all.filter((l) => l.notable || (l.notableTrainers ?? []).length > 0).slice(0, 12),
    [all],
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((l) => l.displayName.toLowerCase().includes(q)) : all;
  }, [all, query]);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        <p>Error loading map data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── the map, with the region's notable places beside it ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="shadow-md lg:col-span-2">
          <CardContent className="p-4">
            {region.mapImage ? (
              <div className="relative">
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
                      {location.kind && (
                        <p className="text-xs capitalize text-muted-foreground">{location.kind}</p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No map art for this region yet — its locations are listed below.
              </p>
            )}
            {pinned.length > 0 && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {pinned.length} of {region.locationCount} locations pinned — click a pin to preview it, or use the
                list below for the rest
                <HelpTip title="Pin colours" className="ml-1">
                  A pin is coloured by what the place is:{' '}
                  <span className="text-pokebrand-red">city</span>,{' '}
                  <span className="text-orange-500">town</span>,{' '}
                  <span className="text-amber-600">route</span>,{' '}
                  <span className="text-green-600">forest</span>,{' '}
                  <span className="text-stone-500">cave</span>,{' '}
                  <span className="text-stone-600">mountain</span>,{' '}
                  <span className="text-blue-500">island</span> or{' '}
                  <span className="text-sky-500">water</span>. Only curated places carry a pin;
                  the rest are in the list.
                </HelpTip>
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4 text-pokebrand-red" />
              Notable locations
              <HelpTip title="Notable locations" className="ml-1">
                Curated highlights of the region; the red names on a row are its Gym Leaders
                and other trainers worth challenging.
              </HelpTip>
            </CardTitle>
            <CardDescription>The places worth knowing about in {region.displayName}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {notable.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted-foreground">
                Nothing curated for this region yet — everything it has is in the list below.
              </p>
            ) : (
              <ScrollArea className="h-[22rem]">
                <div className="divide-y">
                  {notable.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => setSelectedId(location.id)}
                      className={cn(
                        'block w-full px-6 py-3 text-left transition-colors hover:bg-secondary/50',
                        selectedId === location.id && 'bg-secondary/60',
                      )}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-medium">{location.displayName}</span>
                        {location.kind && (
                          <span className="shrink-0 text-xs capitalize text-muted-foreground">{location.kind}</span>
                        )}
                      </div>
                      {location.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{location.description}</p>
                      )}
                      {(location.notableTrainers ?? []).length > 0 && (
                        <p className="mt-1 text-xs text-pokebrand-red">
                          {location.notableTrainers!.join(' · ')}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── every location, and whichever one is open ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" ref={panelRef}>
        <Card className="flex h-[28rem] flex-col shadow-md lg:h-[40rem]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MapPin className="h-4 w-4 text-pokebrand-red" />
              All {region.displayName} locations
            </CardTitle>
            <div className="relative pt-1">
              <Search className="absolute left-2.5 top-4 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Filter ${all.length} locations…`}
                className="pl-8"
                aria-label="Filter locations"
              />
            </div>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 p-0">
            <ScrollArea className="h-full">
              <div className="divide-y">
                {filtered.length > 0 ? (
                  filtered.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => setSelectedId(location.id)}
                      className={cn(
                        'block w-full px-4 py-2.5 text-left transition-colors hover:bg-secondary/50',
                        selectedId === location.id && 'bg-secondary/60',
                      )}
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
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No locations match “{query}”.
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          {selectedId !== null ? (
            <LocationSurfaceCard
              locationId={selectedId}
              onSelectNeighbor={setSelectedId}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <Card className="flex h-[28rem] items-center justify-center shadow-md lg:h-[40rem]">
              <div className="px-6 text-center">
                <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
                <p className="font-semibold">Pick a location</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Click a pin on the map or a row in the list to see its art, who lives there and which Pokémon can
                  be found.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default PokemonMap;
