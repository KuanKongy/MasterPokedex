import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, EyeOff, MapPin } from 'lucide-react';
import { useItemDetail } from '@/hooks/api/items';
import ItemSprite from '../components/ItemSprite';
import LoadingSpinner from '../components/LoadingSpinner';
import { HoverTip } from '../components/HelpTip';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { capitalize } from '../utils/helpers';

/**
 * One item's page: what it does, what it costs, and every place the games
 * leave one lying on the ground (dex.location_items, parsed from Bulbapedia's
 * pickup tables). Shop-only and event items simply have no pickup list.
 */
const ItemDetail: React.FC = () => {
  const { name = '' } = useParams();
  const { data: item, isLoading, isError } = useItemDetail(name);

  if (isLoading) return <LoadingSpinner />;
  if (isError || !item) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="mb-4 text-muted-foreground">No such item.</p>
        <Link to="/items" className="text-pokebrand-red hover:underline">
          Back to the catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Link
        to="/items"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        All items
      </Link>

      <Card>
        <CardContent className="flex items-start gap-4 p-6">
          <ItemSprite src={item.sprite} itemName={item.name} alt={item.displayName} className="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold md:text-3xl">{item.displayName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {item.categoryName && (
                <Badge variant="secondary" className="capitalize">
                  {item.categoryName}
                </Badge>
              )}
              {item.pocket && (
                <Badge variant="outline" className="capitalize">
                  {item.pocket.replace(/-/g, ' ')} pocket
                </Badge>
              )}
              {item.cost !== null && item.cost > 0 && (
                <HoverTip
                  title="Price"
                  trigger={<Badge variant="outline">₽{item.cost}</Badge>}
                >
                  What a shop charges for it in the games, in Poké Dollars.
                </HoverTip>
              )}
              {item.flingPower !== null && (
                <HoverTip
                  title="Fling power"
                  trigger={<Badge variant="outline">Fling {item.flingPower}</Badge>}
                >
                  The damage of the move Fling when the holder throws this item.
                </HoverTip>
              )}
            </div>
            {item.effect && <p className="mt-3 text-sm text-muted-foreground">{item.effect}</p>}
          </div>
        </CardContent>
      </Card>

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-semibold">
        <MapPin className="h-5 w-5 text-pokebrand-red" />
        Found in
      </h2>
      {item.locations.length === 0 ? (
        <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No field pickups recorded; look to shops, gifts or events for this one.
        </p>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {item.locations.map((loc) => (
              <Link
                key={`${loc.locationId}-${loc.note ?? ''}`}
                to={`/locations/${loc.locationId}`}
                className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{capitalize(loc.locationName)}</span>
                  {loc.regionName && (
                    <span className="ml-2 text-xs text-muted-foreground">{loc.regionName}</span>
                  )}
                  {loc.note && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{loc.note}</span>
                  )}
                </span>
                {loc.spots > 1 && (
                  <span className="shrink-0 text-xs text-muted-foreground">×{loc.spots}</span>
                )}
                {loc.hidden && (
                  <HoverTip
                    title="Hidden item"
                    trigger={
                      <Badge variant="outline" className="shrink-0 gap-1 text-[0.6875rem]">
                        <EyeOff className="h-3 w-3" />
                        hidden
                      </Badge>
                    }
                  >
                    Not visible on the ground; the games need the Itemfinder or a sharp eye on
                    the exact tile.
                  </HoverTip>
                )}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ItemDetail;
