
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  fetchPokemonDetails, 
  fetchPokemonSpecies, 
  fetchEvolutionChain 
} from '../api/pokemonApi';
import LoadingSpinner from '../components/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  capitalize, 
  formatHeight, 
  formatWeight, 
  getStatColor,
  getEnglishDescription,
  formatStatName
} from '../utils/helpers';
import { cn } from '@/lib/utils';
import { EvolutionChainLink } from '../types/pokemon';

const PokemonDetail: React.FC = () => {
  const { id: pokemonId } = useParams<{ id: string }>();
  const [evolutionChain, setEvolutionChain] = useState<any[]>([]);
  
  // Fetch Pokemon details
  const { 
    data: pokemon, 
    isLoading: isLoadingPokemon, 
    error: pokemonError
  } = useQuery({
    queryKey: ['pokemon', pokemonId],
    queryFn: () => fetchPokemonDetails(pokemonId || '1'),
    enabled: !!pokemonId
  });
  
  // Fetch Pokemon species data (for evolution chain and description)
  const {
    data: species,
    isLoading: isLoadingSpecies,
    error: speciesError
  } = useQuery({
    queryKey: ['pokemonSpecies', pokemonId],
    queryFn: () => fetchPokemonSpecies(pokemonId || '1'),
    enabled: !!pokemonId
  });
  
  // Fetch evolution chain when species data is available
  const {
    data: evolutionData,
    isLoading: isLoadingEvolution,
    error: evolutionError
  } = useQuery({
    queryKey: ['evolutionChain', species?.evolution_chain?.url],
    queryFn: () => fetchEvolutionChain(species?.evolution_chain?.url),
    enabled: !!species?.evolution_chain?.url
  });
  
  // Process evolution chain data
  useEffect(() => {
    if (evolutionData) {
      const chain: any[] = [];
      
      // Function to extract evolution data recursively
      const processEvolutionChain = (chainLink: EvolutionChainLink) => {
        const speciesId = chainLink.species.url.split('/').slice(-2, -1)[0];
        
        chain.push({
          id: speciesId,
          name: chainLink.species.name,
          min_level: chainLink.evolution_details[0]?.min_level,
          trigger: chainLink.evolution_details[0]?.trigger?.name,
          item: chainLink.evolution_details[0]?.item?.name
        });
        
        if (chainLink.evolves_to.length > 0) {
          chainLink.evolves_to.forEach(processEvolutionChain);
        }
      };
      
      processEvolutionChain(evolutionData.chain);
      setEvolutionChain(chain);
    }
  }, [evolutionData]);
  
  // Loading state
  if (isLoadingPokemon || isLoadingSpecies || isLoadingEvolution) {
    return <LoadingSpinner />;
  }
  
  // Error state
  if (pokemonError || speciesError || evolutionError) {
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
  
  if (!pokemon) {
    return <div>Pokémon not found</div>;
  }
  
  const description = species ? getEnglishDescription(species.flavor_text_entries) : '';
  const primaryType = pokemon.types[0]?.type.name || 'normal';
  
  // Navigate to next/previous Pokemon
  const prevPokemonId = parseInt(pokemonId || '0') - 1;
  const nextPokemonId = parseInt(pokemonId || '0') + 1;
  
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
          {prevPokemonId > 0 && (
            <Link to={`/pokemon/${prevPokemonId}`}>
              <Button variant="outline">
                <ChevronLeft className="mr-2 h-4 w-4" />
                #{prevPokemonId.toString().padStart(3, '0')}
              </Button>
            </Link>
          )}
          
          <Link to={`/pokemon/${nextPokemonId}`}>
            <Button variant="outline">
              #{nextPokemonId.toString().padStart(3, '0')}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Pokemon header */}
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-muted-foreground">#{pokemon.id.toString().padStart(3, '0')}</p>
            <h1 className="text-3xl md:text-5xl font-extrabold">{capitalize(pokemon.name)}</h1>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column with image */}
        <Card className={cn(
          "overflow-hidden bg-gradient-to-b from-gray-100 to-white",
          `border-poketype-${primaryType} border-2`
        )}>
          <CardContent className="flex items-center justify-center p-8">
            {pokemon.sprites.other['official-artwork'].front_default ? (
              <img
                src={pokemon.sprites.other['official-artwork'].front_default}
                alt={pokemon.name}
                className="h-64 w-64 object-contain animate-fade-in"
              />
            ) : (
              <img
                src={pokemon.sprites.front_default}
                alt={pokemon.name}
                className="h-48 w-48 object-contain animate-fade-in pixelated"
              />
            )}
          </CardContent>
        </Card>
        
        {/* Middle column with info */}
        <Card>
          <CardContent className="p-6 space-y-4">
            {description && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-muted-foreground">{description}</p>
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
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Types</h3>
              <div className="flex gap-2 flex-wrap">
                {pokemon.types.map(({ type }) => (
                  <Badge 
                    key={type.name} 
                    className={`bg-poketype-${type.name} text-white px-3 py-1`}
                  >
                    {capitalize(type.name)}
                  </Badge>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Abilities</h3>
              <div className="flex gap-2 flex-wrap">
                {pokemon.abilities.map(({ ability, is_hidden }) => (
                  <Badge 
                    key={ability.name}
                    variant={is_hidden ? "outline" : "default"} 
                  >
                    {capitalize(ability.name.replace('-', ' '))}
                    {is_hidden && ' (Hidden)'}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Right column with stats */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Base Stats</h2>
            <div className="space-y-4">
              {pokemon.stats.map(({ stat, base_stat }) => (
                <div key={stat.name}>
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{formatStatName(stat.name)}</span>
                    <span>{base_stat}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full">
                    <div 
                      className={`h-full rounded-full ${getStatColor(base_stat)}`}
                      style={{ width: `${Math.min(100, (base_stat / 255) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Evolution chain */}
      {evolutionChain.length > 1 && (
        <Card className="mt-6">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Evolution Chain</h2>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {evolutionChain.map((evo, index) => (
                <React.Fragment key={evo.id}>
                  {/* Evolution info */}
                  {index > 0 && (
                    <div className="text-center px-2">
                      <ChevronRight className="h-6 w-6 text-muted-foreground mx-auto" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {evo.min_level ? `Lv. ${evo.min_level}` : ''}
                        {evo.trigger === 'use-item' && evo.item && capitalize(evo.item.replace('-', ' '))}
                        {!evo.min_level && !evo.item && 'Evolution'}
                      </div>
                    </div>
                  )}
                  
                  {/* Pokemon card */}
                  <Link to={`/pokemon/${evo.id}`}>
                    <div className={cn(
                      "p-4 border rounded-lg hover:border-pokebrand-red",
                      `${evo.id === pokemonId ? 'bg-gray-100' : 'bg-white'}`
                    )}>
                      <div className="w-24 h-24 flex items-center justify-center">
                        <img 
                          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png`}
                          alt={evo.name}
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${evo.id}.png`;
                          }}
                        />
                      </div>
                      <p className="text-center mt-2 text-sm font-medium">{capitalize(evo.name)}</p>
                      <p className="text-xs text-center text-muted-foreground">#{evo.id.padStart(3, '0')}</p>
                    </div>
                  </Link>
                </React.Fragment>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PokemonDetail;
