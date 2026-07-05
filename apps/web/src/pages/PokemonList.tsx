import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
import SearchField from '../components/SearchField';
import SortPicker from '../components/SortPicker';
import { POKEMON_SORT_OPTIONS } from '../components/dex/sort-options';
import GenerationFilter, { GENERATIONS, GenHeading } from '../components/dex/GenerationFilter';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const VIEW_STORAGE_KEY = 'masterpokedex.dexView';

function readStoredView(): DexView {
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (raw === 'cards' || raw === 'sprites' || raw === 'table') return raw;
  } catch {
    // default below
  }
  return 'cards';
}

/** Cards get a catch button (always visible on phones, hover-revealed from
    sm up, where a pointer exists to hover with); the denser views link
    straight through. */
const CardsGrid: React.FC<{ pokemon: PokemonSummary[]; onCatch: (p: PokemonSummary) => void }> = ({
  pokemon,
  onCatch,
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
    {pokemon.map((p) => (
      <div key={p.id} className="relative group">
        <Button
          className="absolute top-1.5 right-1.5 z-10 h-8 w-8 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
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

  const heading = <GenHeading gen={gen} region={region} count={pokemon.length} />;

  return (
    <section className="mb-10" aria-label={`Generation ${gen}`}>
      {/* In table view the heading moves into the table's toolbar so it shares
          a row with the column picker instead of stacking above it. The row
          reserves the toolbar's height in every view (min-h 49px: the h-10
          Columns button + pb-2 + border-b, since border-box min-height
          counts all three), so switching
          views never shifts the page. */}
      {(view !== 'table' || isLoading) && (
        <div className="mb-3 flex min-h-[49px] items-center border-b pb-2">
          <div className="flex min-w-0 items-baseline gap-3">{heading}</div>
        </div>
      )}
      {isLoading ? (
        <LoadingSpinner />
      ) : view === 'sprites' ? (
        <DexSpritesGrid pokemon={pokemon} />
      ) : view === 'table' ? (
        <DexStatsTable pokemon={pokemon} sort={sort} dir={dir} onSort={onSort} heading={heading} />
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
  const location = useLocation();

  const q = params.get('q') ?? '';
  const selectedType = params.get('type') ?? 'all';
  const rawGenFilter = params.get('gen');
  const genFilter = rawGenFilter && /^[1-9]$/.test(rawGenFilter) ? rawGenFilter : 'all';
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

  // How many generations are open rides the URL, so Back doesn't fold the
  // dex back to Gen 1 after a detour through a Pokémon's page.
  const rawGens = Number(params.get('gens') ?? 1);
  const gensLoaded = Number.isInteger(rawGens) ? Math.min(Math.max(rawGens, 1), GENERATIONS.length) : 1;

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

  // Generation browse only makes sense for the untouched default ordering;
  // picking a generation filter switches to the flat list of just that gen.
  const genMode = !q && selectedType === 'all' && genFilter === 'all' && sortBy === 'id' && dir === 'asc';

  const flat = usePokemonList(
    {
      q: q || undefined,
      type: selectedType === 'all' ? undefined : (selectedType as PokemonTypeName),
      generation: genFilter === 'all' ? undefined : Number(genFilter),
      sort: sortBy,
      dir,
      // A chosen generation loads whole, like the browse sections (a gen is
      // <=165 rows); otherwise the flat list pages by 72.
      limit: genFilter === 'all' ? 72 : 200,
    },
    { enabled: !genMode },
  );
  const flatPokemon = flat.data?.pages.flatMap((page) => page.items) ?? [];

  const handleCatch = (target: PokemonSummary) => {
    if (!session) {
      toast({ title: 'Sign in to catch Pokémon', description: 'Your teams live on your trainer account.' });
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    setCatching(target);
  };

  // The corner writing: the generation heading whenever a specific gen is
  // chosen (the browse sections cover the all-gens, number-sorted case);
  // otherwise the plain running count.
  const genMeta = genFilter !== 'all' ? GENERATIONS[Number(genFilter) - 1] : null;
  const showing = genMeta ? (
    <GenHeading gen={genMeta.gen} region={genMeta.region} count={flatPokemon.length} />
  ) : (
    <p className="text-sm text-muted-foreground">
      Showing {flatPokemon.length} Pokémon{flat.hasNextPage ? ', more below' : ''}
    </p>
  );

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
        <SearchField
          value={searchInput}
          onChange={(value) => {
            setSearchInput(value);
            if (value === '') patchParams({ q: null });
          }}
          onSubmit={() => patchParams({ q: searchInput.trim() || null })}
          placeholder="Search Pokémon by name..."
          aria-label="Search Pokémon by name"
          className="flex-1"
        />

        <GenerationFilter
          value={genFilter}
          onChange={(next) => patchParams({ gen: next === 'all' ? null : next })}
          className="w-full md:w-44 flex-shrink-0"
        />

        <div className="w-full md:w-56 flex-shrink-0">
          <SortPicker
            options={POKEMON_SORT_OPTIONS}
            value={sortBy}
            dir={dir}
            onFieldChange={(field) =>
              patchParams({
                sort: field === 'id' ? null : field,
                dir: null,
              })
            }
            // Explicit only when it differs from the field's default, so a
            // plain ?sort= link keeps meaning the readable direction.
            onDirChange={(next) =>
              patchParams({ dir: next === (sortBy === 'id' || sortBy === 'name' ? 'asc' : 'desc') ? null : next })
            }
          />
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
              <Button onClick={() => patchParams({ gens: String(gensLoaded + 1) })} variant="outline">
                Load Generation {gensLoaded + 1} — {GENERATIONS[gensLoaded].region}
              </Button>
            </div>
          )}
        </>
      ) : flat.isLoading ? (
        <LoadingSpinner />
      ) : (
        // Re-sorts keep the previous rows on screen (placeholderData) and just
        // dim them until the new order lands, instead of blanking to a spinner.
        <div className={cn(flat.isFetching && !flat.isFetchingNextPage && 'opacity-60 transition-opacity')}>
          {/* In table view the count shares the table's toolbar row with the
              column picker instead of stacking above it; the same reserved
              height here keeps the view switch from shifting the page. */}
          {view !== 'table' && (
            <div className="mb-3 flex min-h-[49px] items-center border-b pb-2">
              <div className="flex min-w-0 items-baseline gap-3">{showing}</div>
            </div>
          )}

          {view === 'sprites' ? (
            <DexSpritesGrid pokemon={flatPokemon} />
          ) : view === 'table' ? (
            <DexStatsTable
              pokemon={flatPokemon}
              sort={sortBy}
              dir={dir}
              onSort={handleSort}
              heading={showing}
            />
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
                disabled={flat.isFetchingNextPage || flat.isPlaceholderData}
                variant="outline"
              >
                {flat.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}

      <CatchPokemonDialog pokemon={catching} onClose={() => setCatching(null)} />
    </div>
  );
};

export default PokemonList;
