
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPokemonList } from '../api/pokemonApi';
import PokemonCard from '../components/PokemonCard';
import SearchBar from '../components/SearchBar';
import TypeFilter from '../components/TypeFilter';
import LoadingSpinner from '../components/LoadingSpinner';
import { Pokemon } from '../types/pokemon';

const PokemonList: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [filteredPokemon, setFilteredPokemon] = useState<Pokemon[]>([]);
  
  const { data: allPokemon, isLoading, error } = useQuery({
    queryKey: ['pokemonList'],
    queryFn: fetchPokemonList
  });
  
  useEffect(() => {
    if (!allPokemon) return;
    
    setFilteredPokemon(
      allPokemon.filter((pokemon: Pokemon) => {
        const matchesSearch = 
          pokemon.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          pokemon.id.toString() === searchTerm;
          
        const matchesType = 
          selectedType === 'all' || 
          pokemon.types.some(typeInfo => typeInfo.type.name === selectedType);
          
        return matchesSearch && matchesType;
      })
    );
  }, [allPokemon, searchTerm, selectedType]);
  
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
      
      <div className="mb-6 space-y-4">
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
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
              <PokemonCard key={pokemon.id} pokemon={pokemon} />
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
