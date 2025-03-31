import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPokemonList } from '../api/pokemonApi';
import { addPokemonToTrainerCollection } from '../api/trainerApi';
import PokemonCard from '../components/PokemonCard';
import SearchBar from '../components/SearchBar';
import TypeFilter from '../components/TypeFilter';
import LoadingSpinner from '../components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, SortDesc } from 'lucide-react';
import { Pokemon } from '../types/pokemon';
import { useToast } from '@/hooks/use-toast';

type SortOption = 'id' | 'name' | 'hp' | 'attack' | 'defense' | 'special-attack' | 'special-defense' | 'speed' | 'total';

const PokemonList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('id');
  const [filteredPokemon, setFilteredPokemon] = useState<Pokemon[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: allPokemon, isLoading, error } = useQuery({
    queryKey: ['pokemonList'],
    queryFn: fetchPokemonList
  });

  const addPokemonMutation = useMutation({
    mutationFn: addPokemonToTrainerCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
      toast({
        title: "Pokémon added",
        description: "The Pokémon has been added to your collection.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add Pokémon to your collection.",
        variant: "destructive",
      });
    }
  });
  
  useEffect(() => {
    if (!allPokemon) return;
    
    let filtered = allPokemon.filter((pokemon: Pokemon) => {
      const matchesSearch = 
        pokemon.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        pokemon.id.toString() === searchTerm;
        
      const matchesType = 
        selectedType === 'all' || 
        pokemon.types.some(typeInfo => typeInfo.type.name === selectedType);
        
      return matchesSearch && matchesType;
    });
    
    const sorted = [...filtered].sort((a: Pokemon, b: Pokemon) => {
      if (sortBy === 'id') {
        return a.id - b.id;
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'total') {
        const totalA = a.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
        const totalB = b.stats.reduce((sum, stat) => sum + stat.base_stat, 0);
        return totalB - totalA; // Descending
      } else {
        const statA = a.stats.find(stat => stat.stat.name === sortBy)?.base_stat || 0;
        const statB = b.stats.find(stat => stat.stat.name === sortBy)?.base_stat || 0;
        return statB - statA; // Descending
      }
    });
    
    setFilteredPokemon(sorted);
  }, [allPokemon, searchTerm, selectedType, sortBy]);

  const handleAddToCollection = (pokemonId: number) => {
    addPokemonMutation.mutate(pokemonId);
  };
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Error Loading Pokémon</h2>
          <p className="text-red-500">Something went wrong while loading the Pokédex.</p>
          <p className="text-muted-foreground mt-2">Please try again later.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">National Pokédex</h1>
      <p className="text-muted-foreground mb-8">
        Explore and discover Pokémon from all regions
      </p>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
        
        <div className="flex gap-2">
          <div className="w-48">
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
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
                <SelectItem value="special-attack">Sp. Attack</SelectItem>
                <SelectItem value="special-defense">Sp. Defense</SelectItem>
                <SelectItem value="speed">Speed</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            Showing {filteredPokemon.length} Pokémon
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredPokemon.map((pokemon: Pokemon) => (
              <div key={pokemon.id} className="relative group">
                <Button
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                  size="icon"
                  variant="outline"
                  onClick={() => handleAddToCollection(pokemon.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <PokemonCard pokemon={pokemon} />
              </div>
            ))}
          </div>
          
          {filteredPokemon.length === 0 && (
            <div className="text-center py-12">
              <h3 className="text-xl font-bold">No Pokémon Found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PokemonList;
