
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrainerProfile, updateTrainerName } from '../api/trainerApi';
import { fetchPokemonList } from '../api/pokemonApi';
import { User, Medal, Calendar, Edit, Check, X } from 'lucide-react';
import CollectionList from './CollectionList';
import ItemInventory from './ItemInventory';
import PokemonCollections from './PokemonCollections';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const TrainerProfile: React.FC = () => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
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
    <div className="flex flex-col gap-6">
      <div
        className="border rounded-lg p-6 shadow-md bg-white"
      >
        <div className="flex flex-col gap-4">
          <div className="flex gap-6 items-start">
            <Avatar className="w-16 h-16">
              <AvatarImage src="/placeholder.svg" alt={trainer.name} />
              <AvatarFallback>{trainer.name.charAt(0)}</AvatarFallback>
            </Avatar>

            <div className="flex flex-col gap-4 flex-1">
              <div>
                {isEditingName ? (
                  <div className="flex gap-2">
                    <input 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                      className="max-w-xs px-3 py-1.5 border border-gray-300 rounded-md"
                      placeholder="Enter new name"
                    />
                    <button 
                      className="size-sm px-2 py-1 border border-gray-300 rounded-md"
                      onClick={handleSaveName}
                      disabled={updateNameMutation.isPending}
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button 
                      className="size-sm px-2 py-1 border border-gray-300 rounded-md"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <User className="h-5 w-5" />
                    <h2 className="text-2xl font-semibold">{trainer.name}</h2>
                    <button 
                      className="size-sm px-2 py-1 text-gray-500 hover:text-gray-700"
                      onClick={handleStartEditName}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <p className="text-gray-500">{trainer.region} Region</p>
              </div>

              <div className="flex flex-wrap gap-4">
                {[
                  { 
                    icon: Medal, 
                    color: "text-yellow-500", 
                    label: "Badges", 
                    value: trainer.badges 
                  },
                  { 
                    icon: User, 
                    color: "text-green-500", 
                    label: "Pokémon Caught", 
                    value: trainer.pokemonCaught 
                  },
                  { 
                    icon: Calendar, 
                    color: "text-blue-500", 
                    label: "Favorite Type", 
                    value: trainer.favoriteType 
                  },
                  { 
                    icon: Calendar, 
                    color: "text-purple-500", 
                    label: "Joined", 
                    value: new Date(trainer.joinDate).toLocaleDateString() 
                  }
                ].map((stat, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-100 p-3 rounded-md flex-1"
                  >
                    <p className="text-gray-500 text-sm">{stat.label}</p>
                    <div className="flex">
                      <stat.icon className={stat.color + " h-5 w-5"} />
                      <span className="font-semibold ml-1">{stat.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Tabs defaultIndex={tabIndex} onChange={setTabIndex}>
          <TabsList>
            <TabsTrigger value="collection">Collection</TabsTrigger>
            <TabsTrigger value="collections">Pokémon Collections</TabsTrigger>
            <TabsTrigger value="items">Items</TabsTrigger>
          </TabsList>
          
          <TabsContent value="collection">
            {trainer.collections && trainer.collections[0] && (
              <CollectionList 
                collectionId={trainer.collections[0].id}
                onSelectPokemon={handleSelectPokemon}
              />
            )}
          </TabsContent>
          
          <TabsContent value="collections">
            <PokemonCollections />
          </TabsContent>
          
          <TabsContent value="items">
            <ItemInventory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default TrainerProfile;
