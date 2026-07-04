import React, { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLocationCatalog } from '@/hooks/api/world';
import LoadingSpinner from '../components/LoadingSpinner';
import HelpTip, { HoverTip } from '../components/HelpTip';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Search } from 'lucide-react';
import { capitalize } from '../utils/helpers';
import { cn } from '@/lib/utils';

/**
 * The world's location catalog, every region at once — the browsable
 * counterpart to the visual /map. Rows without encounter data are still
 * listed (they exist in the world) but dimmed, so the useful ones stand out.
 *
 * The last group has no region: 91 rows upstream are meeting points and event
 * venues rather than places — "Link Trade (Met)", "Pokémon Movie 12", the
 * Fukuoka Pokémon Center. They used to be joined away and unreachable from
 * here while still resolving by id, so they are shown and labelled instead.
 */
const OTHER_REGION_ID = 0;

const AREA_FILTERS = ['any', 'encounters', 'none', '1', '3', '5'] as const;

const Locations: React.FC = () => {
  const { data: regions, isLoading } = useLocationCatalog();
  // Filters ride the URL so Back keeps them and searches deep-link (?q=).
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const kind = params.get('kind') ?? 'all';
  const rawAreas = params.get('areas');
  const areas = (AREA_FILTERS as readonly string[]).includes(rawAreas ?? '') ? rawAreas! : 'any';

  const patchParams = (patch: Record<string, string | null>) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === '') next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  // Derived from the loaded data so kinds that never occur produce no option.
  const kinds = useMemo(() => {
    const set = new Set<string>();
    for (const region of regions ?? []) for (const l of region.locations) if (l.kind) set.add(l.kind);
    return [...set].sort();
  }, [regions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q && kind === 'all' && areas === 'any') return regions ?? [];
    const matchesAreas = (l: { areaCount?: number; hasEncounters?: boolean }) =>
      areas === 'any'
        ? true
        : areas === 'encounters'
          ? !!l.hasEncounters
          : areas === 'none'
            ? (l.areaCount ?? 0) === 0
            : (l.areaCount ?? 0) >= Number(areas);
    return (regions ?? [])
      .map((region) => ({
        ...region,
        locations: region.locations.filter(
          (l) =>
            (!q || l.displayName.toLowerCase().includes(q)) &&
            (kind === 'all' || l.kind === kind) &&
            matchesAreas(l),
        ),
      }))
      .filter((region) => region.locations.length > 0);
  }, [regions, query, kind, areas]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Pokémon Locations</h1>
          <p className="text-muted-foreground">
            Every known place in the world, region by region
            <HelpTip title="Greyed-out places" className="ml-1">
              A greyed row is a real place with no wild-encounter data recorded yet; its page
              still has the artwork and the story.
            </HelpTip>
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => patchParams({ q: e.target.value || null })}
              placeholder="Filter locations…"
              className="pl-9"
            />
          </div>
          <Select value={kind} onValueChange={(next) => patchParams({ kind: next === 'all' ? null : next })}>
            <SelectTrigger className="w-full sm:w-40" aria-label="Filter by kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              {kinds.map((k) => (
                <SelectItem key={k} value={k}>
                  {capitalize(k.replace(/-/g, ' '))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={areas} onValueChange={(next) => patchParams({ areas: next === 'any' ? null : next })}>
            <SelectTrigger className="w-full sm:w-44" aria-label="Filter by areas">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All locations</SelectItem>
              <SelectItem value="encounters">Has encounters</SelectItem>
              <SelectItem value="1">1+ areas</SelectItem>
              <SelectItem value="3">3+ areas</SelectItem>
              <SelectItem value="5">5+ areas</SelectItem>
              <SelectItem value="none">No areas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-8">
          {filtered.map((region) => (
            <Card key={region.id}>
              <CardHeader className="flex flex-row items-baseline justify-between space-y-0 pb-3">
                <div>
                  <CardTitle className="text-xl">{region.displayName}</CardTitle>
                  {region.id === OTHER_REGION_ID && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Not places in the world: trade and event venues, distribution sites and side games.
                      <HelpTip title="Other & event" className="ml-1">
                        Where a Pokémon's “met at” can point outside the map: link trades,
                        real-world distributions and side-series games all land here.
                      </HelpTip>
                    </p>
                  )}
                </div>
                {region.id !== OTHER_REGION_ID && (
                  <Link
                    to={`/map?region=${region.name}`}
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-pokebrand-red hover:underline"
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    Open map
                  </Link>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
                  {region.locations.map((location) => (
                    <Link
                      key={location.id}
                      to={`/locations/${location.id}`}
                      className={cn(
                        'flex items-center gap-2 rounded-md border-b border-border/50 px-2 py-1.5 text-sm transition-colors hover:bg-muted/60',
                        !location.hasEncounters && 'text-muted-foreground/70',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{location.displayName}</span>
                      {location.kind && (
                        <HoverTip
                          title="Kind"
                          className="shrink-0"
                          trigger={
                            <Badge variant="outline" className="capitalize text-[0.6875rem]">
                              {location.kind}
                            </Badge>
                          }
                        >
                          What sort of place this is: a city, a route, a cave, a forest and so
                          on, as the games classify it.
                        </HoverTip>
                      )}
                      {location.hasEncounters && (
                        <HoverTip
                          title="Areas"
                          className="shrink-0 text-xs text-muted-foreground"
                          trigger={
                            <>
                              {location.areaCount} area{location.areaCount === 1 ? '' : 's'}
                            </>
                          }
                        >
                          A location splits into areas (floors of a cave, tall grass, water) and
                          encounters are listed per area.
                        </HoverTip>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">No locations match those filters.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Locations;
