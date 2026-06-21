
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import TrainerProfile from '../components/TrainerProfile';
import { fetchOtherTrainers } from '../api/otherTrainersApi';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { User, Medal, Plus } from 'lucide-react';
import OtherTrainerProfile from '../components/OtherTrainerProfile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AddTrainerForm from '../components/AddTrainerForm';

const Trainer = () => {
  const [activeTab, setActiveTab] = useState('my-profile');
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  
  const { data: otherTrainers, isLoading } = useQuery({
    queryKey: ['otherTrainers'],
    queryFn: fetchOtherTrainers,
    enabled: activeTab === 'other-trainers'
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Trainer Profile</h1>
      <p className="text-muted-foreground mb-8">
        Manage your collection and items
      </p>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="my-profile">My Profile</TabsTrigger>
          <TabsTrigger value="other-trainers">Other Trainers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="my-profile">
          <TrainerProfile />
        </TabsContent>
        
        <TabsContent value="other-trainers">
          {isLoading ? (
            <div className="flex justify-center p-8">Loading trainers...</div>
          ) : selectedTrainerId ? (
            <div>
              <button
                onClick={() => setSelectedTrainerId(null)}
                className="mb-6 text-sm flex items-center text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Back to trainer list
              </button>
              <OtherTrainerProfile trainerId={selectedTrainerId} />
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Other Trainers</h2>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="flex gap-2">
                      <Plus className="h-4 w-4" /> Add Trainer
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Trainer</DialogTitle>
                    </DialogHeader>
                    <AddTrainerForm />
                  </DialogContent>
                </Dialog>
              </div>
              
              <ScrollArea className="h-[600px]">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-4">
                  {otherTrainers?.map((trainer) => (
                    <Card 
                      key={trainer.id} 
                      className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => setSelectedTrainerId(trainer.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-16 h-16 rounded-md border-2 border-pokebrand-red">
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
                          
                          <div className="space-y-2">
                            <div>
                              <h3 className="font-semibold text-lg flex items-center gap-1">
                                <User className="h-4 w-4" /> {trainer.name}
                              </h3>
                              <p className="text-muted-foreground text-sm">{trainer.region} Region</p>
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Medal className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm">{trainer.badges} Badges</span>
                            </div>
                            
                            <div className="text-sm">
                              <span className="text-muted-foreground">Favorite Type:</span>{' '}
                              <span className="capitalize">{trainer.favoriteType}</span>
                            </div>
                            
                            <div className="text-sm">
                              <span className="text-muted-foreground">Pokémon Caught:</span>{' '}
                              <span>{trainer.pokemonCaught}</span>
                            </div>
                            
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">Collection Preview:</div>
                              <div className="flex flex-wrap gap-1">
                                {trainer.collectedPokemon.slice(0, 3).map(id => (
                                  <Badge key={id} variant="outline">#{id}</Badge>
                                ))}
                                {trainer.collectedPokemon.length > 3 && (
                                  <Badge variant="outline">+{trainer.collectedPokemon.length - 3} more</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Trainer;
