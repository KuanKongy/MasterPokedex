import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrainerById, deleteTrainer, updateTrainer } from '../api/otherTrainersApi';
import { fetchPokemonList } from '../api/pokemonApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { User, Medal, Calendar, Edit, Trash2, AlertTriangle, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PokemonCard from './PokemonCard';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import UpdateTrainerForm from './UpdateTrainerForm';
import { Pokemon } from '../types/pokemon';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { TrainerItem } from '../types/trainer';

interface OtherTrainerProfileProps {
  trainerId: string;
}

const OtherTrainerProfile: React.FC<OtherTrainerProfileProps> = ({ trainerId }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAddPokemonDialogOpen, setIsAddPokemonDialogOpen] = useState(false);
  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [selectedPokemonId, setSelectedPokemonId] = useState<string>('');
  const [newItem, setNewItem] = useState<Partial<TrainerItem>>({
    name: '',
    description: '',
    category: 'pokeball',
    sprite: '',
    quantity: 1
  });
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { data: trainer, isLoading: trainerLoading } = useQuery({
    queryKey: ['trainerProfile', trainerId],
    queryFn: () => fetchTrainerById(trainerId)
  });

  const { data: allPokemon, isLoading: pokemonLoading } = useQuery({
    queryKey: ['pokemonList'],
    queryFn: fetchPokemonList
  });
  
  const deleteTrainerMutation = useMutation({
    mutationFn: () => deleteTrainer(trainerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherTrainers'] });
      toast({
        title: "Trainer deleted",
        description: "The trainer has been deleted successfully."
      });
      navigate('/trainer');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete the trainer. Please try again.",
        variant: "destructive",
      });
    }
  });

  const addPokemonMutation = useMutation({
    mutationFn: async () => {
      const pokemonId = parseInt(selectedPokemonId);
      if (!trainer || isNaN(pokemonId)) return;
      
      // Add Pokemon to trainer's collection
      return updateTrainer(trainerId, {
        collectedPokemon: [...(trainer.collectedPokemon || []), pokemonId],
        pokemonCaught: (trainer.pokemonCaught || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerProfile', trainerId] });
      toast({
        title: "Pokémon added",
        description: "Pokémon has been added to the trainer's collection."
      });
      setIsAddPokemonDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add Pokémon. Please try again.",
        variant: "destructive",
      });
    }
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!trainer) return;
      
      // Create new item with the next available ID
      const highestItemId = trainer.items.reduce(
        (max, item) => Math.max(max, item.id), 0
      );
      
      const newItemWithId = {
        ...newItem,
        id: highestItemId + 1
      } as TrainerItem;
      
      // Add item to trainer's inventory
      return updateTrainer(trainerId, {
        items: [...trainer.items, newItemWithId]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerProfile', trainerId] });
      toast({
        title: "Item added",
        description: "Item has been added to the trainer's inventory."
      });
      setIsAddItemDialogOpen(false);
      // Reset form
      setNewItem({
        name: '',
        description: '',
        category: 'pokeball',
        sprite: '',
        quantity: 1
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAddPokemon = () => {
    if (selectedPokemonId) {
      addPokemonMutation.mutate();
    }
  };

  const handleAddItem = () => {
    if (newItem.name && newItem.description) {
      addItemMutation.mutate();
    }
  };

  if (trainerLoading || pokemonLoading) {
    return <div className="flex justify-center p-8">Loading trainer data...</div>;
  }

  if (!trainer) {
    return <div className="text-red-500 p-4">Trainer not found</div>;
  }

  const collectedPokemonDetails = allPokemon?.filter(
    (pokemon) => trainer.collectedPokemon.includes(pokemon.id)
  ) || [];

  // Pokemon not in this trainer's collection
  const uncollectedPokemon = allPokemon?.filter(
    (pokemon) => !trainer.collectedPokemon.includes(pokemon.id)
  ) || [];

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">Trainer Profile</CardTitle>
              <CardDescription>View details about {trainer.name}'s journey</CardDescription>
            </div>
            <div className="flex gap-2">
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="flex gap-1">
                    <Edit className="h-4 w-4" /> Edit
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Update Trainer</DialogTitle>
                    <DialogDescription>
                      Update trainer information. Select which fields to modify.
                    </DialogDescription>
                  </DialogHeader>
                  <UpdateTrainerForm 
                    trainer={trainer} 
                    onClose={() => setIsEditDialogOpen(false)} 
                    isOtherTrainer={true}
                    trainerId={trainerId}
                  />
                </DialogContent>
              </Dialog>
              
              <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="flex gap-1">
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Trainer</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete this trainer? This will also delete all of their collections and data.
                      This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="bg-muted/50 p-4 rounded-md flex items-center gap-2 my-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" />
                    <p className="text-sm">This will permanently delete {trainer.name} and all associated data.</p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => deleteTrainerMutation.mutate()}
                      disabled={deleteTrainerMutation.isPending}
                    >
                      {deleteTrainerMutation.isPending ? "Deleting..." : "Delete Trainer"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="w-24 h-24 border-2 border-pokebrand-red">
              <img 
                src={trainer.avatar || "/placeholder.svg"} 
                alt={trainer.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = "/placeholder.svg";
                }}
              />
            </Avatar>

            <div className="space-y-4 flex-1">
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold">
                  <User className="h-5 w-5" /> 
                  {trainer.name}
                </h3>
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="collection">Collection</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
        </TabsList>
        
        <TabsContent value="collection">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Pokémon Collection</CardTitle>
                <CardDescription>Pokémon that {trainer.name} has caught</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddPokemonDialogOpen(true)}
                className="flex gap-1"
              >
                <Plus className="h-4 w-4" /> Add Pokémon
              </Button>
            </CardHeader>
            <CardContent>
              {collectedPokemonDetails.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {collectedPokemonDetails.map(pokemon => (
                    <PokemonCard key={pokemon.id} pokemon={pokemon} />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No Pokémon in collection yet.</p>
              )}
            </CardContent>
          </Card>

          <Dialog open={isAddPokemonDialogOpen} onOpenChange={setIsAddPokemonDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Pokémon to Collection</DialogTitle>
                <DialogDescription>
                  Select a Pokémon to add to {trainer.name}'s collection
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid gap-2">
                  <div className="grid gap-1">
                    <Select value={selectedPokemonId} onValueChange={setSelectedPokemonId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a Pokémon" />
                      </SelectTrigger>
                      <SelectContent>
                        {uncollectedPokemon.map(pokemon => (
                          <SelectItem key={pokemon.id} value={pokemon.id.toString()}>
                            #{pokemon.id.toString().padStart(3, '0')} - {pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddPokemonDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddPokemon} disabled={!selectedPokemonId || addPokemonMutation.isPending}>
                  {addPokemonMutation.isPending ? "Adding..." : "Add Pokémon"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
        
        <TabsContent value="items">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Item Inventory</CardTitle>
                <CardDescription>Items that {trainer.name} has collected</CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsAddItemDialogOpen(true)}
                className="flex gap-1"
              >
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {trainer.items.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {trainer.items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 p-3 border rounded-md">
                        <img 
                          src={item.sprite} 
                          alt={item.name} 
                          className="w-8 h-8"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.onerror = null;
                            target.src = "/placeholder.svg";
                          }}
                        />
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">Quantity: {item.quantity}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No items in inventory.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Item to Inventory</DialogTitle>
                <DialogDescription>
                  Add a new item to {trainer.name}'s inventory
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input 
                    placeholder="Item name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input 
                    placeholder="Item description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Category</label>
                    <Select 
                      value={newItem.category} 
                      onValueChange={(value: any) => setNewItem({...newItem, category: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pokeball">Poké Ball</SelectItem>
                        <SelectItem value="medicine">Medicine</SelectItem>
                        <SelectItem value="berry">Berry</SelectItem>
                        <SelectItem value="battle">Battle Item</SelectItem>
                        <SelectItem value="evolution">Evolution Item</SelectItem>
                        <SelectItem value="machine">TM/HM</SelectItem>
                        <SelectItem value="key">Key Item</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Quantity</label>
                    <Input 
                      type="number"
                      min={1}
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Sprite URL</label>
                  <Input 
                    placeholder="https://example.com/item.png"
                    value={newItem.sprite}
                    onChange={(e) => setNewItem({...newItem, sprite: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>Cancel</Button>
                <Button 
                  onClick={handleAddItem} 
                  disabled={!newItem.name || !newItem.description || addItemMutation.isPending}
                >
                  {addItemMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OtherTrainerProfile;
