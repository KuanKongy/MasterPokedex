import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { usePokemonList } from '@/hooks/api/pokemon';
import { capitalize } from '../utils/helpers';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onSearch?: (value: string) => void;
}

/**
 * Typeahead backed by the API's `q` search instead of an in-memory copy of
 * the whole dex — which is also why it now finds all ~1300 Pokémon, not the
 * 151 the old mock loaded.
 */
const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, setSearchTerm, onSearch }) => {
  const isNumeric = /^\d+$/.test(searchTerm.trim());
  const searching = searchTerm.length > 1 && !isNumeric;
  const { data } = usePokemonList({ q: searchTerm, limit: 10 }, { enabled: searching });
  const results = searching ? (data?.pages[0]?.items ?? []) : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchTerm) {
      onSearch(searchTerm);
    }
  };

  return (
    <div className="relative">
      <form onSubmit={handleSearchSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search Pokémon by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button type="submit" className="w-full mt-2">
          Search
        </Button>
      </form>

      {results.length > 0 && (
        <div className="absolute w-full bg-popover mt-1 rounded-md border shadow-lg z-50">
          <ScrollArea className="max-h-60">
            {results.map((pokemon) => (
              <div
                key={pokemon.id}
                className="flex items-center gap-2 p-2 hover:bg-accent cursor-pointer"
                onClick={() => onSearch?.(pokemon.id.toString())}
              >
                {pokemon.sprite && <img src={pokemon.sprite} alt={pokemon.name} className="w-10 h-10" />}
                <div>
                  <div className="font-medium">{capitalize(pokemon.name)}</div>
                  <div className="text-xs text-muted-foreground">
                    #{pokemon.id.toString().padStart(3, '0')}
                  </div>
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default SearchBar;
