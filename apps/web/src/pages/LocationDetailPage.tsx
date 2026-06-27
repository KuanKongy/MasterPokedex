import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLocationDetail } from '@/hooks/api/world';
import LoadingSpinner from '../components/LoadingSpinner';
import EncounterList from '../components/locations/EncounterList';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Map as MapIcon, MapPin, Swords } from 'lucide-react';
import { resolveAsset } from '@/lib/assets';

/**
 * One location's full page — the deep end of the map-first flow. Header
 * facts up top, then the shared simple-first encounter list with per-area
 * detail expanders.
 */
const LocationDetailPage: React.FC = () => {
  const { id } = useParams();
  const locationId = Number(id);
  const { data: location, isLoading, error } = useLocationDetail(Number.isInteger(locationId) ? locationId : undefined);

  if (isLoading) return <LoadingSpinner />;

  if (error || !location) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-2">Location not found</h2>
        <Link to="/locations" className="text-pokebrand-red hover:underline">
          Back to all locations
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4 flex items-center gap-4 text-sm">
        <Link to="/locations" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" />
          All locations
        </Link>
        {location.regionName && (
          <Link
            to={`/map?region=${location.regionName.toLowerCase()}`}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <MapIcon className="h-4 w-4" />
            {location.regionName} map
          </Link>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl md:text-4xl font-extrabold">{location.displayName}</h1>
        {location.kind && (
          <Badge variant="outline" className="capitalize">
            {location.kind}
          </Badge>
        )}
      </div>
      {location.regionName && (
        <p className="-mt-4 mb-6 flex items-center gap-1 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          {location.regionName}
        </p>
      )}

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {location.image && (
          <img
            src={resolveAsset(location.image)}
            alt={location.displayName}
            className="w-full rounded-lg border object-cover shadow-sm"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.onerror = null;
              target.src = resolveAsset('placeholder.svg');
            }}
          />
        )}
        <div className="space-y-4">
          {location.description && <p className="text-muted-foreground">{location.description}</p>}

          {(location.notableTrainers ?? []).length > 0 && (
            <div>
              <h2 className="mb-2 flex items-center gap-1.5 font-semibold">
                <Swords className="h-4 w-4 text-pokebrand-red" />
                Notable Trainers
              </h2>
              <div className="flex flex-wrap gap-2">
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
              <h2 className="mb-2 flex items-center gap-1.5 font-semibold">
                <MapIcon className="h-4 w-4 text-pokebrand-red" />
                Neighboring Locations
              </h2>
              <div className="flex flex-wrap gap-2">
                {location.neighbors.map((neighbor) => (
                  <Link key={neighbor.id} to={`/locations/${neighbor.id}`}>
                    <Badge variant="outline" className="hover:bg-muted">
                      {neighbor.displayName}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <h2 className="mb-4 text-2xl font-bold">Pokémon Encounters</h2>
      <EncounterList areas={location.areas} variant="full" />
    </div>
  );
};

export default LocationDetailPage;
