import React from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, EyeOff, MapPin, PackagePlus, Sparkles } from 'lucide-react';
import { useAdjustItem, useItemDetail } from '@/hooks/api/items';
import { useEvolutionSearch, useGmax, useMegas } from '@/hooks/api/dex';
import { megaFormOfStoneSlug } from '../components/pokemon/mega-stones';
import type { MegaSummary } from '@masterpokedex/shared';

function splitOnce(text: string, needle: string): [string, string | null] {
  const index = text.indexOf(needle);
  return index === -1 ? [text, null] : [text.slice(0, index), text.slice(index + needle.length)];
}

/** A stone's effect line with its Pokémon as links: the base and the Mega form. */
const StoneEffect: React.FC<{ effect: string; mega: MegaSummary }> = ({ effect, mega }) => {
  const label = mega.formLabel ?? mega.name;
  const [before, after] = splitOnce(effect, label);
  if (after === null) {
    // The named form isn't one of ours verbatim (Tatsugiri's shared stone);
    // the species still links.
    const [pre, mid] = splitOnce(effect, mega.baseName);
    if (mid === null) return <>{effect}</>;
    return (
      <>
        {pre}
        <Link to={`/pokemon/${mega.basePokemonId}`} className="font-medium text-pokebrand-red hover:underline">
          {mega.baseName}
        </Link>
        {mid}
      </>
    );
  }
  const [pre, mid] = splitOnce(before, mega.baseName);
  return (
    <>
      {mid === null ? (
        before
      ) : (
        <>
          {pre}
          <Link to={`/pokemon/${mega.basePokemonId}`} className="font-medium text-pokebrand-red hover:underline">
            {mega.baseName}
          </Link>
          {mid}
        </>
      )}
      <Link to={`/pokemon/${mega.id}`} className="font-medium text-pokebrand-red hover:underline">
        {label}
      </Link>
      {after}
    </>
  );
};
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import ItemSprite from '../components/ItemSprite';
import LoadingSpinner from '../components/LoadingSpinner';
import HelpTip, { HoverTip } from '../components/HelpTip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { spriteFallback } from '@/prefs/SpritePrefContext';
import { capitalize } from '../utils/helpers';

/**
 * One item's page: what it does, what it costs, every place the games leave
 * one lying on the ground (dex.location_items, parsed from Bulbapedia's
 * pickup tables — shop-only and event items simply have no pickup list), and
 * the Pokémon that evolve by using or holding it.
 */
const ItemDetail: React.FC = () => {
  const { name = '' } = useParams();
  const { data: item, isLoading, isError } = useItemDetail(name);
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const adjust = useAdjustItem();
  // Evolution edges keyed by this item, as trigger item or held item.
  const evolvers = useEvolutionSearch(
    {
      filter: {
        match: 'any',
        conditions: [
          { field: 'item', op: 'eq', value: name },
          { field: 'heldItem', op: 'eq', value: name },
        ],
      },
      limit: 50,
    },
    { enabled: !!name },
  );
  const evolverRows = evolvers.data?.pages.flatMap((page) => page.items) ?? [];
  // Mega Stones are not dex.evolution edges. The item's own effect names the
  // form ("Allows Absol to Mega Evolve into Mega Absol Z."), which matches
  // the megas list's formLabel exactly — all 92 stones, Z-A included, where
  // the hand-kept map knows only the classic 46 (kept as a fallback).
  const stoneTarget =
    item?.category === 'mega-stones' && item.effect
      ? (/Mega Evolve into (.+?)\.?\s*$/.exec(item.effect)?.[1] ?? null)
      : null;
  const stoneSpecies =
    item?.category === 'mega-stones' && item.effect
      ? (/Allows (.+?) to Mega Evolve/.exec(item.effect)?.[1] ?? null)
      : null;
  const mappedForm = megaFormOfStoneSlug(name);
  const { data: megas } = useMegas({ enabled: !!stoneTarget || !!mappedForm });
  // The Gigantamax counterpart: one band, every form that can wear it.
  const isDynamaxBand = name === 'dynamax-band';
  const { data: gmaxes } = useGmax({ enabled: isDynamaxBand });
  const gmaxRows = isDynamaxBand ? (gmaxes?.items ?? []) : [];
  const megaRows = (() => {
    const list = megas?.items ?? [];
    const exact = stoneTarget ? list.filter((mega) => (mega.formLabel ?? mega.name) === stoneTarget) : [];
    if (exact.length > 0) return exact;
    if (mappedForm) return list.filter((mega) => mega.name === mappedForm);
    // Tatsugirinite says "Mega Tatsugiri" while the dex holds one Mega per
    // form, so a species fallback surfaces all of them.
    if (stoneSpecies) return list.filter((mega) => mega.baseName === stoneSpecies);
    return [];
  })();

  const addToBag = () => {
    if (!item) return;
    if (!session) {
      toast({ title: 'Sign in to keep a bag', description: 'Your items live on your trainer account.' });
      navigate('/login', { state: { from: routerLocation.pathname + routerLocation.search } });
      return;
    }
    adjust.mutate(
      { itemId: item.id, delta: 1 },
      { onSuccess: () => toast({ title: `${item.displayName} added to your bag` }) },
    );
  };

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
                <HoverTip
                  title="Category"
                  trigger={
                    <Badge variant="secondary" className="capitalize">
                      {item.categoryName}
                    </Badge>
                  }
                >
                  The dex's grouping for what the item does, finer than the bag pockets.
                </HoverTip>
              )}
              {item.pocket && (
                <HoverTip
                  title="Bag pocket"
                  trigger={
                    <Badge variant="outline" className="capitalize">
                      {item.pocket.replace(/-/g, ' ')} pocket
                    </Badge>
                  }
                >
                  The pouch of the in-game bag this item is stored in.
                </HoverTip>
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
            {item.effect && (
              <p className="mt-3 text-sm text-muted-foreground">
                {megaRows.length > 0 ? <StoneEffect effect={item.effect} mega={megaRows[0]!} /> : item.effect}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            className="shrink-0"
            disabled={adjust.isPending}
            onClick={addToBag}
          >
            <PackagePlus className="mr-2 h-4 w-4" />
            Add to bag
          </Button>
        </CardContent>
      </Card>

      {(evolverRows.length > 0 || megaRows.length > 0 || gmaxRows.length > 0) && (
        <>
          <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-pokebrand-red" />
            Pokémon that evolve with it
          </h2>
          <Card>
            <CardContent className="divide-y p-0">
              {megaRows.map((mega) => (
                <Link
                  key={mega.id}
                  to={`/pokemon/${mega.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60"
                >
                  <img
                    src={mega.sprite ?? ''}
                    alt=""
                    loading="lazy"
                    onError={(e) => spriteFallback(e, mega.id, mega.basePokemonId)}
                    className="h-8 w-8 pixelated"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">
                      {mega.baseName} → {mega.formLabel ?? mega.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Mega Evolution with {item.displayName}, in battle
                    </span>
                  </span>
                </Link>
              ))}
              {gmaxRows.map((gmax) => (
                <Link
                  key={gmax.id}
                  to={`/pokemon/${gmax.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60"
                >
                  <img
                    src={gmax.sprite ?? ''}
                    alt=""
                    loading="lazy"
                    onError={(e) => spriteFallback(e, gmax.id, gmax.basePokemonId)}
                    className="h-8 w-8 pixelated"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">
                      {gmax.baseName} → {gmax.formLabel ?? gmax.name}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Gigantamax in a Max Raid or Gym battle, wearing the {item.displayName}
                    </span>
                  </span>
                </Link>
              ))}
              {evolverRows.map((edge) => (
                <Link
                  key={edge.id}
                  to={`/pokemon/${edge.toId}`}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60"
                >
                  {edge.sprite && (
                    <img
                      src={edge.sprite}
                      alt=""
                      loading="lazy"
                      onError={(e) => spriteFallback(e, edge.toId)}
                      className="h-8 w-8 pixelated"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">
                      {edge.fromName ?? '?'} → {edge.toName}
                    </span>
                    <span className="mt-0.5 block text-xs capitalize text-muted-foreground">
                      {edge.heldItem === name
                        ? `holding ${item.displayName}${edge.trigger === 'trade' ? ', traded' : ''}`
                        : `use ${item.displayName}`}
                    </span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-semibold">
        <MapPin className="h-5 w-5 text-pokebrand-red" />
        Found in
        <HelpTip title="Found in">
          Field pickups lying in the overworld, straight from the games; shops, gifts and
          events are not listed.
        </HelpTip>
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
