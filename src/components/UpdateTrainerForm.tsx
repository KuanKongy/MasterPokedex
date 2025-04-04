
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTrainer } from '../api/otherTrainersApi';
import { useToast } from '@/hooks/use-toast';
import { Trainer } from '../types/trainer';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';

interface UpdateTrainerFormProps {
  trainer: Trainer;
  onClose: () => void;
}

const regions = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea"];
const pokemonTypes = [
  "normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dark", "dragon", "steel", "fairy"
];

const UpdateTrainerForm: React.FC<UpdateTrainerFormProps> = ({ trainer, onClose }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFields, setSelectedFields] = useState<string[]>(['name']);
  
  // Define schema based on the trainer data
  const formSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters." }).optional(),
    region: z.string().min(1, { message: "Please select a region." }).optional(),
    favoriteType: z.string().min(1, { message: "Please select a favorite type." }).optional(),
    badges: z.coerce.number().int().min(0).max(8).optional(),
    pokemonCaught: z.coerce.number().int().min(0).optional(),
  });
  
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: trainer.name,
      region: trainer.region,
      favoriteType: trainer.favoriteType,
      badges: trainer.badges,
      pokemonCaught: trainer.pokemonCaught,
    }
  });

  const updateTrainerMutation = useMutation({
    mutationFn: (data: Partial<Trainer>) => updateTrainer(trainer.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherTrainers'] });
      queryClient.invalidateQueries({ queryKey: ['trainerProfile', trainer.id] });
      toast({
        title: "Trainer updated",
        description: "The trainer has been updated successfully."
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error updating trainer",
        description: error.message || "Failed to update trainer. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: FormValues) => {
    // Only include the selected fields in the update
    const updates: Partial<Trainer> = {};
    
    selectedFields.forEach(field => {
      if (field in values) {
        updates[field as keyof FormValues] = values[field as keyof FormValues];
      }
    });
    
    // Check if region is valid
    if (updates.region && !regions.includes(updates.region)) {
      toast({
        title: "Invalid region",
        description: `${updates.region} is not a valid region.`,
        variant: "destructive",
      });
      return;
    }

    updateTrainerMutation.mutate(updates);
  };

  const toggleField = (field: string) => {
    if (selectedFields.includes(field)) {
      setSelectedFields(selectedFields.filter(f => f !== field));
    } else {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const availableFields = [
    { name: 'name', label: 'Name' },
    { name: 'region', label: 'Region' },
    { name: 'favoriteType', label: 'Favorite Type' },
    { name: 'badges', label: 'Badges' },
    { name: 'pokemonCaught', label: 'Pokémon Caught' }
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Fields to update</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {availableFields.map(field => (
            <div key={field.name} className="flex items-center space-x-2">
              <Checkbox
                id={`field-${field.name}`}
                checked={selectedFields.includes(field.name)}
                onCheckedChange={() => toggleField(field.name)}
              />
              <label
                htmlFor={`field-${field.name}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {field.label}
              </label>
            </div>
          ))}
        </div>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {selectedFields.includes('name') && (
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter trainer name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {selectedFields.includes('region') && (
            <FormField
              control={form.control}
              name="region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Region</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a region" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {regions.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {selectedFields.includes('favoriteType') && (
            <FormField
              control={form.control}
              name="favoriteType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Favorite Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pokemonTypes.map(type => (
                        <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedFields.includes('badges') && (
              <FormField
                control={form.control}
                name="badges"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Badges (0-8)</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {selectedFields.includes('pokemonCaught') && (
              <FormField
                control={form.control}
                name="pokemonCaught"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pokémon Caught</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              type="submit" 
              disabled={updateTrainerMutation.isPending || selectedFields.length === 0}
            >
              {updateTrainerMutation.isPending ? "Updating..." : "Update Trainer"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default UpdateTrainerForm;
