import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PokemonSortField, PokemonSummary, PokemonTypeName, SortDir } from '@masterpokedex/shared';
import { usePokemonList } from '@/hooks/api/pokemon';
import { useAuth } from '@/auth/AuthProvider';
import PokemonCard from '../components/PokemonCard';
import TypeFilter from '../components/TypeFilter';
import LoadingSpinner from '../components/LoadingSpinner';
import CatchPokemonDialog from '../components/CatchPokemonDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, SortDesc, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Server-driven list: search, type filter and sort are query parameters, and
 * paging is a cursor — the whole dex (~1300 species) is browsable without
 * ever loading it all, where the old version fetched 151 Pokémon up front.
 */
const PokemonList: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState<PokemonSortField>('id');
  const [catching, setCatching] = useState<PokemonSummary | null>(null);
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Number and name sort ascending; stat sorts show the strongest first,
  // matching how the old client-side sort behaved.
  const dir: SortDir = sortBy === 'id' || sortBy === 'name' ? 'asc' : 'desc';

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = usePokemonList({
    q: searchTerm || undefined,
    type: selectedType === 'all' ? undefined : (selectedType as PokemonTypeName),
    sort: sortBy,
    dir,
  });

  const pokemon = data?.pages.flatMap((page) => page.items) ?? [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
  };

  const handleCatch = (target: PokemonSummary) => {
    if (!session) {
      toast({
        title: 'Sign in to catch Pokémon',
        description: 'Your teams live on your trainer account.',
        action: undefined,
      });
      navigate('/login');
      return;
    }
    setCatching(target);
  };

  if (error) {
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
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">National Pokédex</h1>
      <p className="text-muted-foreground mb-8">Explore and discover Pokémon from all regions</p>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="flex w-full">
            <div className="relative flex-grow">
              <Input
                placeholder="Search Pokémon by name..."
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  if (e.target.value === '') setSearchTerm('');
                }}
                className="rounded-r-none"
              />
            </div>
            <Button type="submit" className="rounded-l-none">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        </div>

        <div className="w-full md:w-48 flex-shrink-0">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as PokemonSortField)}>
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
        <TypeFilter selectedType={selectedType} setSelectedType={setSelectedType} />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            Showing {pokemon.length} Pokémon{hasNextPage ? ' — more below' : ''}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {pokemon.map((p) => (
              <div key={p.id} className="relative group">
                <Button
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                  size="icon"
                  variant="outline"
                  aria-label={`Catch ${p.name}`}
                  onClick={() => handleCatch(p)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <PokemonCard pokemon={p} />
              </div>
            ))}
          </div>

          {pokemon.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-bold">No Pokémon Found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}

          {hasNextPage && (
            <div className="flex justify-center mt-8">
              <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage} variant="outline">
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
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
