
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrainerProfile, createPokemonCollection, addPokemonToCollection, removePokemonFromCollection } from '../api/trainerApi';
import { fetchPokemonList } from '../api/pokemonApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';
import { Plus, Check, X, PlusCircle } from 'lucide-react';
import { PokemonCollection } from '../types/trainer';
import { Checkbox } from './ui/checkbox';

const PokemonCollections: React.FC = () => {
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: trainer, isLoading: trainerLoading } = useQuery({
    queryKey: ['trainerProfile'],
    queryFn: fetchTrainerProfile
  });
  
  const collections = trainer?.collections || [];
  
  useEffect(() => {
    if (collections.length > 0 && !activeCollection) {
      setActiveCollection(collections[0].id);
    }
  }, [collections, activeCollection]);
  
  const { data: allPokemon, isLoading: pokemonLoading } = useQuery({
    queryKey: ['pokemonList'],
    queryFn: fetchPokemonList
  });
  
  const createCollectionMutation = useMutation({
    mutationFn: createPokemonCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
      toast({
        title: "Collection created",
        description: "Your new Pokémon collection has been created successfully."
      });
      setDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create collection. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  const addPokemonToCollectionMutation = useMutation({
    mutationFn: ({collectionId, pokemonId}: {collectionId: string, pokemonId: number}) => 
      addPokemonToCollection(collectionId, pokemonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
      toast({
        title: "Pokémon added",
        description: "Pokémon has been added to collection."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add Pokémon to collection.",
        variant: "destructive"
      });
    }
  });
  
  const removePokemonFromCollectionMutation = useMutation({
    mutationFn: ({collectionId, pokemonId}: {collectionId: string, pokemonId: number}) => 
      removePokemonFromCollection(collectionId, pokemonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
      toast({
        title: "Pokémon removed",
        description: "Pokémon has been removed from collection."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove Pokémon from collection.",
        variant: "destructive"
      });
    }
  });
  
  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) {
      toast({
        title: "Validation Error",
        description: "Collection name is required.",
        variant: "destructive"
      });
      return;
    }
    
    createCollectionMutation.mutate({
      name: newCollectionName,
      description: newCollectionDescription,
      pokemon: []
    });
  };
  
  const resetForm = () => {
    setNewCollectionName('');
    setNewCollectionDescription('');
  };
  
  const handleAddPokemon = (pokemonId: number) => {
    if (!activeCollection) return;
    
    addPokemonToCollectionMutation.mutate({
      collectionId: activeCollection,
      pokemonId
    });
  };
  
  const handleRemovePokemon = (pokemonId: number) => {
    if (!activeCollection) return;
    
    removePokemonFromCollectionMutation.mutate({
      collectionId: activeCollection,
      pokemonId
    });
  };
  
  const isPokemonInCollection = (pokemonId: number) => {
    if (!activeCollection || !collections) return false;
    
    const collection = collections.find(c => c.id === activeCollection);
    return collection?.pokemon.includes(pokemonId) || false;
  };
  
  if (trainerLoading || pokemonLoading) {
    return <div className="flex justify-center p-8">Loading collections...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Pokémon Collections</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Pokémon Collection</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateCollection} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <Input
                  id="name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Enter collection name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">Description</label>
                <Textarea
                  id="description"
                  value={newCollectionDescription}
                  onChange={(e) => setNewCollectionDescription(e.target.value)}
                  placeholder="Enter collection description"
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createCollectionMutation.isPending}>
                  Create Collection
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      
      {collections && collections.length > 0 ? (
        <Card>
          <ScrollArea className="h-[600px]">
            <Tabs 
              value={activeCollection || collections[0].id} 
              onValueChange={setActiveCollection}
              className="w-full"
            >
              <TabsList className="mb-4 w-full overflow-auto">
                <div className="flex space-x-2">
                  {collections.map(collection => (
                    <TabsTrigger key={collection.id} value={collection.id}>
                      {collection.name}
                    </TabsTrigger>
                  ))}
                </div>
              </TabsList>
              
              {collections.map(collection => (
                <TabsContent key={collection.id} value={collection.id}>
                  <CardHeader>
                    <CardTitle>{collection.name}</CardTitle>
                    <CardDescription>{collection.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <h4 className="font-medium">Pokémon in this collection:</h4>
                      {collection.pokemon.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                          {collection.pokemon.map(pokemonId => {
                            const pokemon = allPokemon?.find(p => p.id === pokemonId);
                            if (!pokemon) return null;
                            
                            return (
                              <div key={pokemon.id} className="flex flex-col items-center p-3 border rounded-md">
                                <img 
                                  src={pokemon.sprites.front_default} 
                                  alt={pokemon.name} 
                                  className="w-20 h-20"
                                />
                                <div className="text-center">
                                  <div className="font-medium capitalize">{pokemon.name}</div>
                                  <div className="text-xs text-muted-foreground">#{pokemon.id}</div>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  className="mt-2"
                                  onClick={() => handleRemovePokemon(pokemon.id)}
                                  disabled={removePokemonFromCollectionMutation.isPending}
                                >
                                  Remove
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center p-6 bg-muted/30 rounded-md">
                          <p className="text-muted-foreground">No Pokémon in this collection yet.</p>
                        </div>
                      )}
                      
                      <div className="pt-4 border-t">
                        <h4 className="font-medium mb-3">Add Pokémon to collection:</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {allPokemon?.slice(0, 20).map(pokemon => (
                            <div key={pokemon.id} className="flex flex-col items-center p-3 border rounded-md">
                              <img 
                                src={pokemon.sprites.front_default} 
                                alt={pokemon.name} 
                                className="w-16 h-16"
                              />
                              <div className="text-center mb-2">
                                <div className="font-medium capitalize">{pokemon.name}</div>
                                <div className="text-xs text-muted-foreground">#{pokemon.id}</div>
                              </div>
                              {isPokemonInCollection(pokemon.id) ? (
                                <Badge>In Collection</Badge>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="default" 
                                  className="flex items-center gap-1"
                                  onClick={() => handleAddPokemon(pokemon.id)}
                                  disabled={addPokemonToCollectionMutation.isPending}
                                >
                                  <PlusCircle className="h-4 w-4" />
                                  Add
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </TabsContent>
              ))}
            </Tabs>
          </ScrollArea>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-muted-foreground mb-4">No collections yet. Create your first collection!</p>
            <Button onClick={() => setDialogOpen(true)}>Create Collection</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PokemonCollections;
