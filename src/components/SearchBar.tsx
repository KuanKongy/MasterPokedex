
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Pokemon } from '../types/pokemon';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface SearchBarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  onSearch?: (value: string) => void;
  pokemonData?: Pokemon[];
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  searchTerm, 
  setSearchTerm, 
  onSearch,
  pokemonData = [] 
}) => {
  const [filteredResults, setFilteredResults] = useState<Pokemon[]>([]);

  useEffect(() => {
    if (searchTerm.length > 1 && pokemonData.length > 0) {
      const filtered = pokemonData.filter(pokemon => {
        const term = searchTerm.toLowerCase();
        return (
          pokemon.name.toLowerCase().includes(term) ||
          pokemon.id.toString().includes(term)
        );
      }).slice(0, 10); // Limit to 10 results
      
      setFilteredResults(filtered);
    } else {
      setFilteredResults([]);
    }
  }, [searchTerm, pokemonData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch && searchTerm) {
      onSearch(searchTerm);
    }
  };

  const handleResultClick = (pokemon: Pokemon) => {
    if (onSearch) {
      onSearch(pokemon.id.toString());
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
        <Button type="submit" className="w-full mt-2">Search</Button>
      </form>

      {filteredResults.length > 0 && (
        <div className="absolute w-full bg-white dark:bg-gray-800 mt-1 rounded-md border shadow-lg z-50">
          <ScrollArea className="max-h-60">
            {filteredResults.map(pokemon => (
              <div 
                key={pokemon.id}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => handleResultClick(pokemon)}
              >
                <img 
                  src={pokemon.sprites.front_default} 
                  alt={pokemon.name}
                  className="w-10 h-10"
                />
                <div>
                  <div className="font-medium">
                    {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
                  </div>
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
