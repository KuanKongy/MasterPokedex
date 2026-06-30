import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLocationCatalog } from '@/hooks/api/world';
import LoadingSpinner from '../components/LoadingSpinner';
import HelpTip from '../components/HelpTip';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Search } from 'lucide-react';
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

const Locations: React.FC = () => {
  const { data: regions, isLoading } = useLocationCatalog();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return regions ?? [];
    return (regions ?? [])
      .map((region) => ({
        ...region,
        locations: region.locations.filter((l) => l.displayName.toLowerCase().includes(q)),
      }))
      .filter((region) => region.locations.length > 0);
  }, [regions, query]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Pokémon Locations</h1>
          <p className="text-muted-foreground">
            Every known place in the world, region by region
            <HelpTip title="Greyed-out places" className="ml-1">
              A greyed row is a real place with no wild-encounter data recorded yet — its page
              still has the artwork and the story.
            </HelpTip>
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter locations…"
            className="pl-9"
          />
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
                        Where a Pokémon's “met at” can point outside the map — link trades,
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
                        <Badge variant="outline" className="shrink-0 capitalize text-[0.6875rem]">
                          {location.kind}
                        </Badge>
                      )}
                      {location.hasEncounters && (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {location.areaCount} area{location.areaCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">No locations match “{query.trim()}”.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Locations;
