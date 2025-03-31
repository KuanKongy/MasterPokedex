
import React from 'react';
import { Link } from 'react-router-dom';
import { Pokemon } from '../types/pokemon';
import { Card, CardContent } from './ui/card';
import { getPokemonTypeColor } from '../utils/helpers';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Trash } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removePokemonFromCollection } from '../api/trainerApi';
import { useToast } from '@/hooks/use-toast';

interface CollectionListProps {
  collection: Pokemon[];
}

const CollectionList: React.FC<CollectionListProps> = ({ collection }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const removePokemonMutation = useMutation({
    mutationFn: removePokemonFromCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['pokemonList'] });
      toast({
        title: "Pokémon removed",
        description: "The Pokémon has been removed from your collection.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove the Pokémon. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleRemovePokemon = (pokemonId: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    removePokemonMutation.mutate(pokemonId);
  };

  if (collection.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/30 rounded-lg">
        <h3 className="text-xl font-semibold mb-2">No Pokémon in collection yet</h3>
        <p className="text-muted-foreground">
          Start your journey by adding Pokémon to your collection
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">My Collection ({collection.length})</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {collection.map((pokemon) => (
          <Link key={pokemon.id} to={`/pokemon/${pokemon.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full relative group">
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                onClick={(e) => handleRemovePokemon(pokemon.id, e)}
              >
                <Trash className="h-4 w-4" />
              </Button>
              <CardContent className="p-3 flex flex-col items-center text-center">
                <img
                  src={pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}
                  alt={pokemon.name}
                  className="w-28 h-28 object-contain"
                />
                <div className="mt-2">
                  <div className="text-sm font-medium capitalize">{pokemon.name}</div>
                  <div className="text-xs text-muted-foreground">#{pokemon.id.toString().padStart(3, '0')}</div>
                  <div className="flex justify-center gap-1 mt-2">
                    {pokemon.types.map((typeInfo) => (
                      <Badge
                        key={typeInfo.type.name}
                        className="text-xs text-white"
                        style={{ backgroundColor: getPokemonTypeColor(typeInfo.type.name) }}
                      >
                        {typeInfo.type.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CollectionList;
