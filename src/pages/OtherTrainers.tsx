
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOtherTrainers, fetchTrainerById } from '../api/otherTrainersApi';
import { Trainer } from '../types/trainer';
import OtherTrainerProfile from '../components/OtherTrainerProfile';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getPokemonTypeColor } from '@/utils/helpers';

const OtherTrainers: React.FC = () => {
  const [selectedTrainerId, setSelectedTrainerId] = useState<string | null>(null);
  
  const { data: trainers, isLoading: isLoadingTrainers } = useQuery({
    queryKey: ['otherTrainers'],
    queryFn: fetchOtherTrainers
  });
  
  const { data: selectedTrainer, isLoading: isLoadingTrainer } = useQuery({
    queryKey: ['trainer', selectedTrainerId],
    queryFn: () => selectedTrainerId ? fetchTrainerById(selectedTrainerId) : null,
    enabled: !!selectedTrainerId
  });
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Pokémon Trainers</h1>
      <p className="text-muted-foreground mb-8">
        Connect with other trainers from around the Pokémon world
      </p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-lg">Trainer Directory</h2>
            </div>
            <div className="divide-y max-h-[calc(100vh-350px)] overflow-y-auto">
              {isLoadingTrainers ? (
                <div className="p-4 text-center">Loading trainers...</div>
              ) : trainers?.map((trainer: Trainer) => (
                <div 
                  key={trainer.id}
                  className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                    selectedTrainerId === trainer.id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedTrainerId(trainer.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={trainer.avatar} alt={trainer.name} />
                      <AvatarFallback>{trainer.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{trainer.name}</h3>
                      <div className="text-sm text-muted-foreground">
                        {trainer.region} • {trainer.pokemonCaught} Pokémon
                      </div>
                      <div className="mt-1">
                        <Badge 
                          className="text-xs text-white"
                          style={{ backgroundColor: getPokemonTypeColor(trainer.favoriteType) }}
                        >
                          {trainer.favoriteType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          {selectedTrainer ? (
            <OtherTrainerProfile trainerId={selectedTrainer.id} />
          ) : (
            <Card className="h-full flex flex-col items-center justify-center p-8 text-center">
              <Avatar className="w-20 h-20 mb-4">
                <AvatarFallback className="text-3xl">?</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-medium mb-2">Select a Trainer</h3>
              <p className="text-muted-foreground max-w-md">
                Choose a trainer from the list to view their profile, Pokémon collection, and stats
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtherTrainers;
