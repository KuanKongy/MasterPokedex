
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrainerProfile, updateTrainerName } from '../api/trainerApi';
import { fetchPokemonList } from '../api/pokemonApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Avatar } from '@/components/ui/avatar';
import { User, Medal, Calendar, Edit, Check, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import CollectionList from './CollectionList';
import ItemInventory from './ItemInventory';
import PokemonCollections from './PokemonCollections';
import { useToast } from '@/hooks/use-toast';

const TrainerProfile: React.FC = () => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: trainer, isLoading: trainerLoading } = useQuery({
    queryKey: ['trainerProfile'],
    queryFn: fetchTrainerProfile
  });

  const { data: allPokemon, isLoading: pokemonLoading } = useQuery({
    queryKey: ['pokemonList'],
    queryFn: fetchPokemonList
  });
  
  const updateNameMutation = useMutation({
    mutationFn: updateTrainerName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
      setIsEditingName(false);
      toast({
        title: "Name updated",
        description: "Your trainer name has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trainer name. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleStartEditName = () => {
    if (trainer) {
      setNewName(trainer.name);
      setIsEditingName(true);
    }
  };

  const handleSaveName = () => {
    if (newName.trim()) {
      updateNameMutation.mutate(newName);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
  };

  const handleSelectPokemon = (pokemonId: number) => {
    setSelectedPokemonId(pokemonId);
    // Additional logic for selected Pokémon can be added here
    toast({
      title: "Pokémon Selected",
      description: `You selected Pokémon #${pokemonId}`,
    });
  };

  if (trainerLoading || pokemonLoading) {
    return <div className="flex justify-center p-8">Loading trainer data...</div>;
  }

  if (!trainer) {
    return <div className="text-red-500 p-4">Error loading trainer profile</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Trainer Profile</CardTitle>
          <CardDescription>View and manage your Pokémon journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="w-24 h-24 border-2 border-pokebrand-red">
              <img src="/placeholder.svg" alt={trainer.name} />
            </Avatar>

            <div className="space-y-4 flex-1">
              <div>
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                      className="max-w-xs"
                      placeholder="Enter new name"
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleSaveName}
                      disabled={updateNameMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <h3 className="flex items-center gap-2 text-xl font-semibold">
                    <User className="h-5 w-5" /> 
                    {trainer.name}
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="ml-2" 
                      onClick={handleStartEditName}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </h3>
                )}
                <p className="text-muted-foreground">{trainer.region} Region</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Badges</div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Medal className="h-4 w-4 text-yellow-500" />
                    {trainer.badges}
                  </div>
                </div>

                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Pokémon Caught</div>
                  <div className="font-semibold">{trainer.pokemonCaught}</div>
                </div>

                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Favorite Type</div>
                  <div className="font-semibold capitalize">{trainer.favoriteType}</div>
                </div>
                
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-muted-foreground text-sm">Joined</div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Calendar className="h-4 w-4" />
                    {new Date(trainer.joinDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="collection" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="pokemon-collections">Pokémon Collections</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
        </TabsList>
        <TabsContent value="collection" className="space-y-4">
          {trainer.collections && trainer.collections[0] && (
            <CollectionList 
              collectionId={trainer.collections[0].id}
              onSelectPokemon={handleSelectPokemon}
            />
          )}
        </TabsContent>
        <TabsContent value="pokemon-collections">
          <PokemonCollections />
        </TabsContent>
        <TabsContent value="items">
          <ItemInventory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TrainerProfile;
