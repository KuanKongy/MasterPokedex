import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrainerCollections, createCollection, removeTrainerFromCollection, addTrainerToCollection } from '../api/trainerApi';
import { fetchOtherTrainers } from '../api/otherTrainersApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from './ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Avatar } from './ui/avatar';
import { Plus, UserPlus, UserMinus } from 'lucide-react';

const TrainerCollections: React.FC = () => {
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeCollection, setActiveCollection] = useState<string | null>(null);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: collections, isLoading: collectionsLoading } = useQuery({
    queryKey: ['trainerCollections'],
    queryFn: fetchTrainerCollections
  });
  
  useEffect(() => {
    if (collections?.length > 0 && !activeCollection) {
      setActiveCollection(collections[0].id);
    }
  }, [collections, activeCollection]);
  
  const { data: otherTrainers, isLoading: trainersLoading } = useQuery({
    queryKey: ['otherTrainers'],
    queryFn: fetchOtherTrainers
  });
  
  const createCollectionMutation = useMutation({
    mutationFn: createCollection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerCollections'] });
      toast({
        title: "Collection created",
        description: "Your new collection has been created successfully."
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
  
  const addTrainerToCollectionMutation = useMutation({
    mutationFn: ({collectionId, trainerId}: {collectionId: string, trainerId: string}) => 
      addTrainerToCollection(collectionId, trainerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerCollections'] });
      toast({
        title: "Trainer added",
        description: "Trainer has been added to collection."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add trainer to collection.",
        variant: "destructive"
      });
    }
  });
  
  const removeTrainerFromCollectionMutation = useMutation({
    mutationFn: ({collectionId, trainerId}: {collectionId: string, trainerId: string}) => 
      removeTrainerFromCollection(collectionId, trainerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerCollections'] });
      toast({
        title: "Trainer removed",
        description: "Trainer has been removed from collection."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove trainer from collection.",
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
      trainers: []
    });
  };
  
  const resetForm = () => {
    setNewCollectionName('');
    setNewCollectionDescription('');
  };
  
  const handleAddTrainer = (trainerId: string) => {
    if (!activeCollection) return;
    
    addTrainerToCollectionMutation.mutate({
      collectionId: activeCollection,
      trainerId
    });
  };
  
  const handleRemoveTrainer = (trainerId: string) => {
    if (!activeCollection) return;
    
    removeTrainerFromCollectionMutation.mutate({
      collectionId: activeCollection,
      trainerId
    });
  };
  
  const isTrainerInCollection = (trainerId: string) => {
    if (!activeCollection || !collections) return false;
    
    const collection = collections.find(c => c.id === activeCollection);
    return collection?.trainers.includes(trainerId) || false;
  };
  
  if (collectionsLoading || trainersLoading) {
    return <div className="flex justify-center p-8">Loading collections...</div>;
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Trainer Collections</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="flex items-center gap-1">
              <Plus className="h-4 w-4" /> New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Collection</DialogTitle>
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
          <Tabs 
            value={activeCollection || collections[0].id} 
            onValueChange={setActiveCollection}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 mb-4">
              {collections.map(collection => (
                <TabsTrigger key={collection.id} value={collection.id}>
                  {collection.name}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {collections.map(collection => (
              <TabsContent key={collection.id} value={collection.id}>
                <CardHeader>
                  <CardTitle>{collection.name}</CardTitle>
                  <CardDescription>{collection.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <h4 className="font-medium">Trainers in this collection:</h4>
                    {collection.trainers.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {collection.trainers.map(trainerId => {
                          const trainer = otherTrainers?.find(t => t.id === trainerId);
                          if (!trainer) return null;
                          
                          return (
                            <div key={trainer.id} className="flex items-center justify-between p-3 border rounded-md">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <img src={trainer.avatar} alt={trainer.name} />
                                </Avatar>
                                <div>
                                  <div className="font-medium">{trainer.name}</div>
                                  <div className="text-xs text-muted-foreground">{trainer.region}</div>
                                </div>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="flex items-center gap-1"
                                onClick={() => handleRemoveTrainer(trainer.id)}
                                disabled={removeTrainerFromCollectionMutation.isPending}
                              >
                                <UserMinus className="h-4 w-4" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center p-6 bg-muted/30 rounded-md">
                        <p className="text-muted-foreground">No trainers in this collection yet.</p>
                      </div>
                    )}
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-3">Add trainers to collection:</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {otherTrainers?.map(trainer => (
                          <div key={trainer.id} className="flex items-center justify-between p-3 border rounded-md">
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <img src={trainer.avatar} alt={trainer.name} />
                              </Avatar>
                              <div>
                                <div className="font-medium">{trainer.name}</div>
                                <div className="text-xs text-muted-foreground">{trainer.region}</div>
                              </div>
                            </div>
                            {isTrainerInCollection(trainer.id) ? (
                              <Badge>In Collection</Badge>
                            ) : (
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="flex items-center gap-1"
                                onClick={() => handleAddTrainer(trainer.id)}
                                disabled={addTrainerToCollectionMutation.isPending}
                              >
                                <UserPlus className="h-4 w-4" />
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

export default TrainerCollections;
