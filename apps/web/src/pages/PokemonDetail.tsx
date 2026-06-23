import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  useEvolutionChain,
  usePokemon,
  usePokemonEncounters,
  usePokemonMoves,
} from '@/hooks/api/pokemon';
import { useMyFavorites, useSetFavorite } from '@/hooks/api/trainer';
import { useAuth } from '@/auth/AuthProvider';
import LoadingSpinner from '../components/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Heart, MapPin } from 'lucide-react';
import { capitalize, formatHeight, formatWeight, getStatColor, formatStatName } from '../utils/helpers';
import { cn } from '@/lib/utils';
import { TypeBadge } from '@/components/ui/type-badge';
import { useToast } from '@/hooks/use-toast';

/** Highest id among default forms; prev/next stays inside the real dex. */
const MAX_DEX_ID = 1025;

const STAT_KEYS = ['hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed'] as const;
const STAT_LABELS: Record<(typeof STAT_KEYS)[number], string> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  specialAttack: 'special-attack',
  specialDefense: 'special-defense',
  speed: 'speed',
};

const PokemonDetail: React.FC = () => {
  const { id: idOrName } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { toast } = useToast();
  const [showAllMoves, setShowAllMoves] = useState(false);

  const { data: pokemon, isLoading, error } = usePokemon(idOrName);
  const { data: evolution } = useEvolutionChain(pokemon?.id);
  const { data: encounters } = usePokemonEncounters(pokemon?.id);
  const { data: moves } = usePokemonMoves(pokemon?.id);
  const { data: favorites } = useMyFavorites();
  const setFavorite = useSetFavorite();

  const isFavorite = !!pokemon && !!favorites?.some((f) => f.id === pokemon.id);

  const encountersByLocation = useMemo(() => {
    if (!encounters) return [];
    const seen = new Map<number, { name: string; region: string | null; methods: Set<string> }>();
    for (const row of encounters) {
      let entry = seen.get(row.locationId);
      if (!entry) {
        entry = { name: row.locationDisplayName, region: row.regionName, methods: new Set() };
        seen.set(row.locationId, entry);
      }
      entry.methods.add(row.method);
    }
    return [...seen.entries()].slice(0, 12);
  }, [encounters]);

  if (isLoading) return <LoadingSpinner />;

  if (error || !pokemon) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-2xl font-bold mb-4">Error Loading Pokémon</h1>
        <p className="text-red-500">Could not load details for this Pokémon.</p>
        <Link to="/">
          <Button className="mt-4">Return to Pokédex</Button>
        </Link>
      </div>
    );
  }

  const primaryType = pokemon.types[0] ?? 'normal';
  const prevPokemonId = pokemon.id - 1;
  const nextPokemonId = pokemon.id + 1;
  const shownMoves = showAllMoves ? (moves ?? []) : (moves ?? []).slice(0, 12);

  const handleFavorite = () => {
    if (!session) {
      toast({ title: 'Sign in to keep favorites', description: 'Favorites live on your trainer account.' });
      navigate('/login');
      return;
    }
    setFavorite.mutate({ pokemonId: pokemon.id, favorite: !isFavorite });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Navigation buttons */}
      <div className="flex justify-between items-center mb-6">
        <Link to="/">
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Pokédex
          </Button>
        </Link>

        <div className="flex gap-2">
          {prevPokemonId >= 1 && (
            <Link to={`/pokemon/${prevPokemonId}`}>
              <Button variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />#{prevPokemonId.toString().padStart(3, '0')}
              </Button>
            </Link>
          )}
          {nextPokemonId <= MAX_DEX_ID && (
            <Link to={`/pokemon/${nextPokemonId}`}>
              <Button variant="outline">
                #{nextPokemonId.toString().padStart(3, '0')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Pokemon header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">#{pokemon.id.toString().padStart(3, '0')}</p>
            <h1 className="text-3xl md:text-5xl font-extrabold">{capitalize(pokemon.name)}</h1>
            {pokemon.species.genus && (
              <p className="text-muted-foreground mt-1">{pokemon.species.genus}</p>
            )}
          </div>
          <Button
            variant={isFavorite ? 'default' : 'outline'}
            onClick={handleFavorite}
            disabled={setFavorite.isPending}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={cn('mr-2 h-4 w-4', isFavorite && 'fill-current')} />
            {isFavorite ? 'Favorited' : 'Favorite'}
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          {pokemon.species.isLegendary && <Badge variant="secondary">Legendary</Badge>}
          {pokemon.species.isMythical && <Badge variant="secondary">Mythical</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column with image */}
        <Card
          className={cn(
            'overflow-hidden bg-gradient-to-b from-muted to-card',
            `border-poketype-${primaryType} border-2`,
          )}
        >
          <CardContent className="flex items-center justify-center p-8">
            {pokemon.artwork ? (
              <img src={pokemon.artwork} alt={pokemon.name} className="h-64 w-64 object-contain animate-fade-in" />
            ) : pokemon.sprite ? (
              <img src={pokemon.sprite} alt={pokemon.name} className="h-48 w-48 object-contain animate-fade-in pixelated" />
            ) : null}
          </CardContent>
        </Card>

        {/* Middle column with info */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {pokemon.species.description && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-muted-foreground">{pokemon.species.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold">Height</h3>
                <p>{formatHeight(pokemon.height)}</p>
              </div>
              <div>
                <h3 className="font-semibold">Weight</h3>
                <p>{formatWeight(pokemon.weight)}</p>
              </div>
              {pokemon.species.growthRate && (
                <div>
                  <h3 className="font-semibold">Growth rate</h3>
                  <p className="capitalize">{pokemon.species.growthRate.replace(/-/g, ' ')}</p>
                </div>
              )}
              {pokemon.species.captureRate !== null && (
                <div>
                  <h3 className="font-semibold">Capture rate</h3>
                  <p>{pokemon.species.captureRate}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Types</h3>
              <div className="flex gap-2 flex-wrap">
                {pokemon.types.map((type) => (
                  <TypeBadge key={type} type={type} />
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Abilities</h3>
              <div className="flex gap-2 flex-wrap">
                {pokemon.abilities.map((ability) => (
                  <Badge key={`${ability.slot}-${ability.name}`} variant={ability.isHidden ? 'outline' : 'default'}>
                    {capitalize(ability.name.replace(/-/g, ' '))}
                    {ability.isHidden && ' (Hidden)'}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Type matchups from the full efficacy chart */}
            <div>
              <h3 className="font-semibold mb-2">Matchups</h3>
              <div className="space-y-2 text-sm">
                {pokemon.matchups.weakTo.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-muted-foreground mr-1">Weak to:</span>
                    {pokemon.matchups.weakTo.map((m) => (
                      <span key={m.type} className="flex items-center gap-0.5">
                        <TypeBadge type={m.type} />
                        <span className="text-xs text-muted-foreground">×{m.factor}</span>
                      </span>
                    ))}
                  </div>
                )}
                {pokemon.matchups.resists.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-muted-foreground mr-1">Resists:</span>
                    {pokemon.matchups.resists.map((m) => (
                      <span key={m.type} className="flex items-center gap-0.5">
                        <TypeBadge type={m.type} />
                        <span className="text-xs text-muted-foreground">×{m.factor}</span>
                      </span>
                    ))}
                  </div>
                )}
                {pokemon.matchups.immuneTo.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-muted-foreground mr-1">Immune to:</span>
                    {pokemon.matchups.immuneTo.map((type) => (
                      <TypeBadge key={type} type={type} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right column with stats */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Base Stats</h2>
            <div className="space-y-4">
              {STAT_KEYS.map((key) => {
                const value = pokemon.stats[key];
                return (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <span className="font-medium">{formatStatName(STAT_LABELS[key])}</span>
                      <span>{value}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full">
                      <div
                        className={`h-full rounded-full ${getStatColor(value)}`}
                        style={{ width: `${Math.min(100, (value / 255) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between border-t pt-3 font-semibold">
                <span>Total</span>
                <span>{pokemon.stats.total}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolution chain */}
      {evolution && evolution.length > 1 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Evolution Chain</h2>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {evolution.map((evo, index) => (
                <React.Fragment key={evo.id}>
                  {index > 0 && (
                    <div className="text-center px-2">
                      <ChevronRight className="h-6 w-6 text-muted-foreground mx-auto" />
                      <div className="text-xs text-muted-foreground mt-1 max-w-[90px]">
                        {evo.minLevel
                          ? `Lv. ${evo.minLevel}`
                          : evo.item
                            ? capitalize(evo.item.replace(/-/g, ' '))
                            : evo.minHappiness
                              ? 'Friendship'
                              : evo.trigger
                                ? capitalize(evo.trigger.replace(/-/g, ' '))
                                : 'Evolution'}
                      </div>
                    </div>
                  )}

                  <Link to={`/pokemon/${evo.id}`}>
                    <div
                      className={cn(
                        'p-4 border rounded-lg hover:border-pokebrand-red bg-card',
                        evo.id === pokemon.speciesId && 'bg-muted',
                      )}
                    >
                      <div className="w-24 h-24 flex items-center justify-center">
                        {(evo.artwork || evo.sprite) && (
                          <img
                            src={evo.artwork ?? evo.sprite ?? undefined}
                            alt={evo.name}
                            className="max-w-full max-h-full object-contain"
                          />
                        )}
                      </div>
                      <p className="text-center mt-2 text-sm font-medium">{capitalize(evo.name)}</p>
                      <p className="text-xs text-center text-muted-foreground">
                        #{evo.id.toString().padStart(3, '0')}
                      </p>
                    </div>
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Where to find it + moves */}
      <Card className="mt-6">
        <CardContent className="p-6">
          <Tabs defaultValue="locations">
            <TabsList>
              <TabsTrigger value="locations">Locations</TabsTrigger>
              <TabsTrigger value="moves">Moves</TabsTrigger>
            </TabsList>

            <TabsContent value="locations" className="pt-4">
              {encountersByLocation.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No known wild encounters — this Pokémon may only be obtained by evolution or events.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {encountersByLocation.map(([locationId, entry]) => (
                    <div key={locationId} className="flex items-start gap-2 border rounded-md p-3">
                      <MapPin className="h-4 w-4 text-pokebrand-red mt-0.5 shrink-0" />
                      <div>
                        <div className="font-medium text-sm">{entry.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {entry.region ?? 'Unknown region'} · {[...entry.methods].join(', ')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="moves" className="pt-4">
              {shownMoves.length === 0 ? (
                <p className="text-muted-foreground text-sm">No move data.</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Move</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead className="text-right">Power</TableHead>
                        <TableHead className="text-right">Acc.</TableHead>
                        <TableHead>Learned by</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shownMoves.map((move) => (
                        <TableRow key={`${move.name}-${move.learnMethod}`}>
                          <TableCell className="font-medium">
                            {capitalize(move.name.replace(/-/g, ' '))}
                          </TableCell>
                          <TableCell>
                            <TypeBadge type={move.type} />
                          </TableCell>
                          <TableCell className="capitalize">{move.damageClass}</TableCell>
                          <TableCell className="text-right">{move.power ?? '—'}</TableCell>
                          <TableCell className="text-right">{move.accuracy ?? '—'}</TableCell>
                          <TableCell className="capitalize">
                            {move.learnMethod === 'level-up' && move.levelLearnedAt
                              ? `Level ${move.levelLearnedAt}`
                              : move.learnMethod.replace(/-/g, ' ')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {(moves?.length ?? 0) > 12 && (
                    <div className="flex justify-center mt-4">
                      <Button variant="outline" size="sm" onClick={() => setShowAllMoves((v) => !v)}>
                        {showAllMoves ? 'Show fewer' : `Show all ${moves!.length} moves`}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default PokemonDetail;
