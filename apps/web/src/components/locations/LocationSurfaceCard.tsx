import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronLeft, Map as MapIcon, Swords } from 'lucide-react';
import { useLocationDetail } from '@/hooks/api/world';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import LoadingSpinner from '../LoadingSpinner';
import EncounterList from './EncounterList';
import LocationItemChips from './LocationItemChips';
import HelpTip from '../HelpTip';
import { resolveAsset } from '@/lib/assets';

type LocationSurfaceCardProps = {
  locationId: number;
  onSelectNeighbor: (id: number) => void;
  onClose: () => void;
};

/**
 * The map page's surface view of a location: enough to know what and who is
 * there, one click from the full page. Shares the react-query cache with
 * /locations/:id, so "Full details" opens instantly.
 *
 * Two columns from `sm` up — art on the left, the description, residents and
 * neighbours on the right, encounters full width underneath. Stacking all of
 * that in one narrow column, as this card used to, left every block cramped
 * and the art shrunk to a strip.
 */
const LocationSurfaceCard: React.FC<LocationSurfaceCardProps> = ({ locationId, onSelectNeighbor, onClose }) => {
  const { data: location, isLoading, error } = useLocationDetail(locationId);

  return (
    <Card className="flex h-[28rem] flex-col shadow-md lg:h-[40rem]">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          {location && (
            <CardTitle className="flex flex-wrap items-center gap-2">
              {location.displayName}
              {location.kind && (
                <Badge variant="outline" className="capitalize">
                  {location.kind}
                </Badge>
              )}
            </CardTitle>
          )}
          {location?.regionName && (
            <p className="mt-1 text-sm text-muted-foreground">{location.regionName}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="shrink-0 text-muted-foreground">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Close
        </Button>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        {isLoading ? (
          <LoadingSpinner />
        ) : error || !location ? (
          <div className="m-4 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Could not load this location.
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-5 px-6 pb-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {location.image ? (
                  <img
                    src={resolveAsset(location.image)}
                    alt={location.displayName}
                    className="aspect-video w-full rounded-md border object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.src = resolveAsset('placeholder.svg');
                    }}
                  />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                    No art for this location
                  </div>
                )}

                <div className="space-y-4">
                  {location.description && <p className="text-sm text-muted-foreground">{location.description}</p>}

                  {(location.notableTrainers ?? []).length > 0 && (
                    <div>
                      <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                        <Swords className="h-3.5 w-3.5 text-pokebrand-red" />
                        Notable Trainers
                        <HelpTip title="Notable Trainers">
                          Gym Leaders and named trainers the games place here.
                        </HelpTip>
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {location.notableTrainers!.map((trainer) => (
                          <Badge key={trainer} variant="secondary">
                            {trainer}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {location.neighbors.length > 0 && (
                    <div>
                      <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                        <MapIcon className="h-3.5 w-3.5 text-pokebrand-red" />
                        Neighboring Locations
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {location.neighbors.map((neighbor) => (
                          <button key={neighbor.id} type="button" onClick={() => onSelectNeighbor(neighbor.id)}>
                            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                              {neighbor.displayName}
                            </Badge>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {location.items.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-sm font-semibold">Items found here</h3>
                  <LocationItemChips items={location.items} compact limit={8} />
                </div>
              )}

              <div>
                <h3 className="mb-1.5 text-sm font-semibold">Pokémon Encounters</h3>
                <EncounterList areas={location.areas} variant="compact" />
              </div>
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <div className="border-t p-4 pt-3">
        <Button asChild className="w-full">
          <Link to={`/locations/${locationId}`}>Full details</Link>
        </Button>
      </div>
    </Card>
  );
};

export default LocationSurfaceCard;
