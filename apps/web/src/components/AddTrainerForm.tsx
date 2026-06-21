
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { insertTrainer } from '../api/otherTrainersApi';
import { useToast } from '@/hooks/use-toast';
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

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  region: z.string().min(1, { message: "Please select a region." }),
  favoriteType: z.string().min(1, { message: "Please select a favorite type." }),
  badges: z.coerce.number().int().min(0).max(8),
  pokemonCaught: z.coerce.number().int().min(0),
});

const regions = ["Kanto", "Johto", "Hoenn", "Sinnoh", "Unova", "Kalos", "Alola", "Galar", "Paldea"];
const pokemonTypes = [
  "normal", "fire", "water", "grass", "electric", "ice", "fighting", "poison",
  "ground", "flying", "psychic", "bug", "rock", "ghost", "dark", "dragon", "steel", "fairy"
];

const AddTrainerForm = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      region: "Kanto",
      favoriteType: "normal",
      badges: 0,
      pokemonCaught: 0
    }
  });

  const insertTrainerMutation = useMutation({
    mutationFn: insertTrainer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['otherTrainers'] });
      toast({
        title: "Trainer added",
        description: "The new trainer has been added successfully."
      });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding trainer",
        description: error.message || "Failed to add trainer. Please try again.",
        variant: "destructive",
      });
    }
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Check if region is valid (simple validation)
    if (!regions.includes(values.region)) {
      toast({
        title: "Invalid region",
        description: `${values.region} is not a valid region.`,
        variant: "destructive",
      });
      return;
    }

    insertTrainerMutation.mutate({
      name: values.name,
      region: values.region,
      favoriteType: values.favoriteType,
      badges: values.badges,
      pokemonCaught: values.pokemonCaught,
      avatar: `/images/trainer-${values.name.toLowerCase()}.png`, // Generate a placeholder avatar path
      collectedPokemon: [],
      items: []
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
        
        <div className="pt-4 flex justify-end">
          <Button type="submit" disabled={insertTrainerMutation.isPending}>
            {insertTrainerMutation.isPending ? "Adding..." : "Add Trainer"}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddTrainerForm;
