
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrainerProfile, removePokemonFromCollection as removePokemonFromCollectionApi } from '../api/trainerApi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';
import { PokemonCollection } from '@/types/trainer';

interface CollectionListProps {
  collectionId: string;
  onSelectPokemon: (pokemonId: number) => void;
}

const CollectionList: React.FC<CollectionListProps> = ({ collectionId, onSelectPokemon }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: trainer, isLoading } = useQuery({
    queryKey: ['trainer'],
    queryFn: fetchTrainerProfile
  });

  const removePokemonMutation = useMutation({
    mutationFn: async ({ collectionId, pokemonId }: { collectionId: string, pokemonId: number }) => {
      return removePokemonFromCollectionApi(collectionId, pokemonId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainer'] });
      toast({
        title: "Pokémon removed",
        description: "The Pokémon has been removed from this collection."
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to remove Pokémon from collection"
      });
    }
  });

  const handleRemove = (pokemonId: number) => {
    removePokemonMutation.mutate({ collectionId, pokemonId });
  };

  if (isLoading) {
    return <div>Loading collection...</div>;
  }

  const collection = trainer?.collections?.find(c => c.id === collectionId);
  
  if (!collection) {
    return <div>Collection not found</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle>{collection.name}</CardTitle>
        <CardDescription>{collection.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          {collection.pokemon.length === 0 ? (
            <p className="text-muted-foreground">No Pokémon in this collection yet.</p>
          ) : (
            <ul className="space-y-1">
              {collection.pokemon.map((pokemonId) => (
                <li key={pokemonId} className="flex items-center justify-between p-2 hover:bg-accent/50 rounded-md">
                  <button
                    onClick={() => onSelectPokemon(pokemonId)}
                    className="text-sm font-medium hover:underline"
                  >
                    Pokémon #{pokemonId}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(pokemonId)}
                    className="h-6 w-6"
                    disabled={removePokemonMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end pt-2">
        <div className="text-xs text-muted-foreground">
          {collection.pokemon.length} Pokémon
        </div>
      </CardFooter>
    </Card>
  );
};

export default CollectionList;
