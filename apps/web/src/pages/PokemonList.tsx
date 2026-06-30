import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PokemonSortField, PokemonSummary, PokemonTypeName, SortDir } from '@masterpokedex/shared';
import { POKEMON_SORT_FIELDS } from '@masterpokedex/shared';
import { usePokemonList } from '@/hooks/api/pokemon';
import { useAuth } from '@/auth/AuthProvider';
import PokemonCard from '../components/PokemonCard';
import TypeFilter from '../components/TypeFilter';
import LoadingSpinner from '../components/LoadingSpinner';
import CatchPokemonDialog from '../components/CatchPokemonDialog';
import DexViewToggle, { type DexView } from '../components/dex/DexViewToggle';
import DexSpritesGrid from '../components/dex/DexSpritesGrid';
import DexStatsTable from '../components/dex/DexStatsTable';
import HelpTip from '../components/HelpTip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, SortDesc, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const VIEW_STORAGE_KEY = 'masterpokedex.dexView';

const GENERATIONS: Array<{ gen: number; region: string }> = [
  { gen: 1, region: 'Kanto' },
  { gen: 2, region: 'Johto' },
  { gen: 3, region: 'Hoenn' },
  { gen: 4, region: 'Sinnoh' },
  { gen: 5, region: 'Unova' },
  { gen: 6, region: 'Kalos' },
  { gen: 7, region: 'Alola' },
  { gen: 8, region: 'Galar' },
  { gen: 9, region: 'Paldea' },
];

function readStoredView(): DexView {
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (raw === 'cards' || raw === 'sprites' || raw === 'table') return raw;
  } catch {
    // default below
  }
  return 'cards';
}

/** Cards get a hover catch button; the denser views link straight through. */
const CardsGrid: React.FC<{ pokemon: PokemonSummary[]; onCatch: (p: PokemonSummary) => void }> = ({
  pokemon,
  onCatch,
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
    {pokemon.map((p) => (
      <div key={p.id} className="relative group">
        <Button
          className="absolute top-1.5 right-1.5 z-10 h-8 w-8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          size="icon"
          variant="outline"
          aria-label={`Catch ${p.name}`}
          onClick={() => onCatch(p)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <PokemonCard pokemon={p} />
      </div>
    ))}
  </div>
);

/** One generation's block in the default browse — fetched whole (a gen is ≤165 rows). */
const GenerationSection: React.FC<{
  gen: number;
  region: string;
  view: DexView;
  sort: PokemonSortField;
  dir: SortDir;
  onSort: (field: PokemonSortField) => void;
  onCatch: (p: PokemonSummary) => void;
}> = ({ gen, region, view, sort, dir, onSort, onCatch }) => {
  const { data, isLoading } = usePokemonList({ generation: gen, limit: 200 });
  const pokemon = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section className="mb-10" aria-label={`Generation ${gen}`}>
      <div className="mb-3 flex items-baseline gap-3 border-b pb-2">
        <h2 className="text-xl font-bold">Generation {gen}</h2>
        <span className="text-sm text-muted-foreground">
          {region}
          {pokemon.length > 0 && ` · ${pokemon.length} Pokémon`}
        </span>
        <HelpTip title="Generations">
          A generation is the set of games that introduced these Pokémon, and the region is
          the world those games take place in.
        </HelpTip>
      </div>
      {isLoading ? (
        <LoadingSpinner />
      ) : view === 'sprites' ? (
        <DexSpritesGrid pokemon={pokemon} />
      ) : view === 'table' ? (
        <DexStatsTable pokemon={pokemon} sort={sort} dir={dir} onSort={onSort} />
      ) : (
        <CardsGrid pokemon={pokemon} onCatch={onCatch} />
      )}
    </section>
  );
};

/**
 * The National Pokédex. Default browse is generation by generation, like the
 * reference site's national dex — "Load Generation N" instead of a blind
 * "Load more". Searching, type-filtering or re-sorting switches to a flat
 * server-side cursor list. Everything lives in the URL, so views are
 * shareable and the back button behaves.
 */
const PokemonList: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [catching, setCatching] = useState<PokemonSummary | null>(null);
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const q = params.get('q') ?? '';
  const selectedType = params.get('type') ?? 'all';
  const rawSort = params.get('sort');
  const sortBy: PokemonSortField = (POKEMON_SORT_FIELDS as readonly string[]).includes(rawSort ?? '')
    ? (rawSort as PokemonSortField)
    : 'id';
  const rawDir = params.get('dir');
  const dir: SortDir =
    rawDir === 'asc' || rawDir === 'desc' ? rawDir : sortBy === 'id' || sortBy === 'name' ? 'asc' : 'desc';

  const urlView = params.get('view');
  const [view, setViewState] = useState<DexView>(() =>
    urlView === 'cards' || urlView === 'sprites' || urlView === 'table' ? urlView : readStoredView(),
  );

  const [searchInput, setSearchInput] = useState(q);
  useEffect(() => setSearchInput(q), [q]);

  const [gensLoaded, setGensLoaded] = useState(1);

  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
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
    },
    [setParams],
  );

  const setView = (next: DexView) => {
    setViewState(next);
    patchParams({ view: next === 'cards' ? null : next });
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch {
      // preference just won't stick
    }
  };

  const handleSort = (field: PokemonSortField) => {
    const nextDir: SortDir =
      sortBy === field
        ? dir === 'asc'
          ? 'desc'
          : 'asc'
        : field === 'id' || field === 'name'
          ? 'asc'
          : 'desc';
    patchParams({ sort: field === 'id' && nextDir === 'asc' ? null : field, dir: nextDir });
  };

  // Generation browse only makes sense for the untouched default ordering.
  const genMode = !q && selectedType === 'all' && sortBy === 'id' && dir === 'asc';

  const flat = usePokemonList(
    {
      q: q || undefined,
      type: selectedType === 'all' ? undefined : (selectedType as PokemonTypeName),
      sort: sortBy,
      dir,
    },
    { enabled: !genMode },
  );
  const flatPokemon = flat.data?.pages.flatMap((page) => page.items) ?? [];

  const handleCatch = (target: PokemonSummary) => {
    if (!session) {
      toast({ title: 'Sign in to catch Pokémon', description: 'Your teams live on your trainer account.' });
      navigate('/login');
      return;
    }
    setCatching(target);
  };

  if (!genMode && flat.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error Loading Pokémon</h2>
          <p className="text-red-500">Something went wrong while loading the Pokédex.</p>
          <p className="text-muted-foreground mt-2">Is the API server running?</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">National Pokédex</h1>
          <p className="text-muted-foreground">Explore and discover Pokémon from all regions</p>
        </div>
        <DexViewToggle view={view} onChange={setView} />
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              patchParams({ q: searchInput.trim() || null });
            }}
            className="flex w-full"
          >
            <div className="relative flex-grow">
              <Input
                placeholder="Search Pokémon by name..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value === '') patchParams({ q: null });
                }}
                className="rounded-r-none"
              />
            </div>
            <Button type="submit" className="rounded-l-none">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="flex w-full items-center gap-1 md:w-52 flex-shrink-0">
          <HelpTip title="Sorting">
            Sorts every generation's list at once. “Total Stats” is the six base stats added
            up; Sp. Attack and Sp. Defense power and withstand special (non-physical) moves.
          </HelpTip>
          <Select
            value={sortBy}
            onValueChange={(value) => {
              const field = value as PokemonSortField;
              patchParams({
                sort: field === 'id' ? null : field,
                dir: null,
              });
            }}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                <SortDesc className="h-4 w-4" />
                <SelectValue placeholder="Sort by" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="id">Number</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="total">Total Stats</SelectItem>
              <SelectItem value="hp">HP</SelectItem>
              <SelectItem value="attack">Attack</SelectItem>
              <SelectItem value="defense">Defense</SelectItem>
              <SelectItem value="specialAttack">Sp. Attack</SelectItem>
              <SelectItem value="specialDefense">Sp. Defense</SelectItem>
              <SelectItem value="speed">Speed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-6">
        <TypeFilter
          selectedType={selectedType}
          setSelectedType={(type) => patchParams({ type: type === 'all' ? null : type })}
        />
      </div>

      {genMode ? (
        <>
          {GENERATIONS.slice(0, gensLoaded).map(({ gen, region }) => (
            <GenerationSection
              key={gen}
              gen={gen}
              region={region}
              view={view}
              sort={sortBy}
              dir={dir}
              onSort={handleSort}
              onCatch={handleCatch}
            />
          ))}
          {gensLoaded < GENERATIONS.length && (
            <div className="flex justify-center mt-2">
              <Button onClick={() => setGensLoaded((n) => n + 1)} variant="outline">
                Load Generation {gensLoaded + 1} — {GENERATIONS[gensLoaded].region}
              </Button>
            </div>
          )}
        </>
      ) : flat.isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Showing {flatPokemon.length} Pokémon{flat.hasNextPage ? ' — more below' : ''}
          </p>

          {view === 'sprites' ? (
            <DexSpritesGrid pokemon={flatPokemon} />
          ) : view === 'table' ? (
            <DexStatsTable pokemon={flatPokemon} sort={sortBy} dir={dir} onSort={handleSort} />
          ) : (
            <CardsGrid pokemon={flatPokemon} onCatch={handleCatch} />
          )}

          {flatPokemon.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-bold">No Pokémon Found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}

          {flat.hasNextPage && (
            <div className="flex justify-center mt-8">
              <Button
                onClick={() => flat.fetchNextPage()}
                disabled={flat.isFetchingNextPage}
                variant="outline"
              >
                {flat.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </>
      )}

      <CatchPokemonDialog pokemon={catching} onClose={() => setCatching(null)} />
    </div>
  );
};

export default PokemonList;
