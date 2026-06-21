
import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { updateTrainerProfile } from '../api/trainerApi';
import { updateTrainer } from '../api/otherTrainersApi';
import { Trainer } from '../types/trainer';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { VALID_REGIONS } from '../api/otherTrainersApi';
import { useToast } from '@/hooks/use-toast';

interface UpdateTrainerFormProps {
  trainer: Trainer;
  onClose: () => void;
  isOtherTrainer?: boolean;
  trainerId?: string;
}

const UpdateTrainerForm: React.FC<UpdateTrainerFormProps> = ({ 
  trainer, 
  onClose, 
  isOtherTrainer = false,
  trainerId 
}) => {
  const [name, setName] = useState(trainer.name);
  const [avatar, setAvatar] = useState(trainer.avatar || '');
  const [favoriteType, setFavoriteType] = useState(trainer.favoriteType);
  const [region, setRegion] = useState(trainer.region);
  const [badges, setBadges] = useState(trainer.badges);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const updateMutation = useMutation({
    mutationFn: async (updatedTrainer: Partial<Trainer>) => {
      if (isOtherTrainer && trainerId) {
        // Update other trainer
        return updateTrainer(trainerId, updatedTrainer);
      } else {
        // Update main user's trainer
        return updateTrainerProfile(updatedTrainer);
      }
    },
    onSuccess: () => {
      if (isOtherTrainer && trainerId) {
        // Invalidate other trainer's cache
        queryClient.invalidateQueries({ queryKey: ['trainerProfile', trainerId] });
        queryClient.invalidateQueries({ queryKey: ['otherTrainers'] });
      } else {
        // Invalidate main trainer's cache
        queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
      }
      
      toast({
        title: "Profile updated",
        description: "Trainer profile has been successfully updated."
      });
      
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trainer profile. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Only include fields that have changed
    const updates: Partial<Trainer> = {};
    if (name !== trainer.name) updates.name = name;
    if (avatar !== trainer.avatar) updates.avatar = avatar;
    if (favoriteType !== trainer.favoriteType) updates.favoriteType = favoriteType;
    if (region !== trainer.region) updates.region = region;
    if (badges !== trainer.badges) updates.badges = badges;
    
    if (Object.keys(updates).length > 0) {
      updateMutation.mutate(updates);
    } else {
      onClose();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      <div className="space-y-2">
        <label htmlFor="name" className="block text-sm font-medium">
          Name
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Trainer name"
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="avatar" className="block text-sm font-medium">
          Avatar URL
        </label>
        <Input
          id="avatar"
          value={avatar}
          onChange={(e) => setAvatar(e.target.value)}
          placeholder="https://example.com/avatar.png"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="type" className="block text-sm font-medium">
            Favorite Type
          </label>
          <Select value={favoriteType} onValueChange={setFavoriteType}>
            <SelectTrigger id="type">
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground", 
                "flying", "psychic", "bug", "rock", "ghost", "dark", "dragon", "steel", "fairy"].map(type => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="region" className="block text-sm font-medium">
            Region
          </label>
          <Select value={region} onValueChange={setRegion}>
            <SelectTrigger id="region">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              {VALID_REGIONS.map(region => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <label htmlFor="badges" className="block text-sm font-medium">
          Badges
        </label>
        <Input
          id="badges"
          type="number"
          min={0}
          max={8}
          value={badges}
          onChange={(e) => setBadges(parseInt(e.target.value) || 0)}
        />
      </div>
      
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
};

export default UpdateTrainerForm;
