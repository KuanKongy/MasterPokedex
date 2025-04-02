
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTrainerById } from '../api/otherTrainersApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { User, Medal, Calendar, MapPin } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OtherTrainerProfileProps {
  trainerId: string;
}

const OtherTrainerProfile: React.FC<OtherTrainerProfileProps> = ({ trainerId }) => {
  const [activeTab, setActiveTab] = useState('collection');
  
  const { data: trainer, isLoading } = useQuery({
    queryKey: ['trainerProfile', trainerId],
    queryFn: () => fetchTrainerById(trainerId)
  });

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading trainer data...</div>;
  }

  if (!trainer) {
    return <div className="text-red-500 p-4">Trainer not found</div>;
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl">Trainer Profile</CardTitle>
          <CardDescription>View details about {trainer.name}'s journey</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="w-24 h-24 border-2 border-pokebrand-red">
              <img src={trainer.avatar} alt={trainer.name} />
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
              <div className="flex flex-wrap gap-2">
                {trainer.collectedPokemon.map(pokemonId => (
                  <Badge key={pokemonId} variant="outline">
                    #{pokemonId}
                  </Badge>
                ))}
              </div>
              {trainer.collectedPokemon.length === 0 && (
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
                        <img src={item.sprite} alt={item.name} className="w-8 h-8" />
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
