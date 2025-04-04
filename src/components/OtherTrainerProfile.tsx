
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrainerById, deleteTrainer } from '../api/otherTrainersApi';
import { fetchPokemonList } from '../api/pokemonApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { User, Medal, Calendar, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PokemonCard from './PokemonCard';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import UpdateTrainerForm from './UpdateTrainerForm';

interface OtherTrainerProfileProps {
  trainerId: string;
}

const OtherTrainerProfile: React.FC<OtherTrainerProfileProps> = ({ trainerId }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
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

  if (trainerLoading || pokemonLoading) {
    return <div className="flex justify-center p-8">Loading trainer data...</div>;
  }

  if (!trainer) {
    return <div className="text-red-500 p-4">Trainer not found</div>;
  }

  // Get collected Pokemon details
  const collectedPokemonDetails = allPokemon?.filter(
    (pokemon) => trainer.collectedPokemon.includes(pokemon.id)
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
                  <UpdateTrainerForm trainer={trainer} onClose={() => setIsEditDialogOpen(false)} />
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
              {/* Use placeholder if image is unavailable */}
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
            <CardHeader>
              <CardTitle>Pokémon Collection</CardTitle>
              <CardDescription>Pokémon that {trainer.name} has caught</CardDescription>
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
        </TabsContent>
        
        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Item Inventory</CardTitle>
              <CardDescription>Items that {trainer.name} has collected</CardDescription>
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
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OtherTrainerProfile;
