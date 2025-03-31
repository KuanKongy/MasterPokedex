
import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { addItem } from '../api/trainerApi';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { ItemCategory } from '../types/trainer';
import { useToast } from '@/hooks/use-toast';
import { Plus } from 'lucide-react';

const ITEM_CATEGORIES: { value: ItemCategory; label: string }[] = [
  { value: 'pokeball', label: 'Poké Balls' },
  { value: 'medicine', label: 'Medicine' },
  { value: 'berry', label: 'Berries' },
  { value: 'battle', label: 'Battle Items' },
  { value: 'evolution', label: 'Evolution Items' },
  { value: 'machine', label: 'Machines' },
  { value: 'key', label: 'Key Items' },
];

const DEFAULT_SPRITES = {
  'pokeball': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png',
  'medicine': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/potion.png',
  'berry': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/cheri-berry.png',
  'battle': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/x-attack.png',
  'evolution': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/fire-stone.png',
  'machine': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png',
  'key': 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/bicycle.png'
};

const AddItemForm: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ItemCategory>('pokeball');
  const [sprite, setSprite] = useState(DEFAULT_SPRITES['pokeball']);
  const [quantity, setQuantity] = useState(1);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const addItemMutation = useMutation({
    mutationFn: addItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerItems'] });
      toast({
        title: "Item added",
        description: `${name} has been added to your inventory.`,
      });
      resetForm();
      setOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !description.trim() || quantity < 1) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields and ensure quantity is at least 1.",
        variant: "destructive",
      });
      return;
    }
    
    addItemMutation.mutate({
      name,
      description,
      category,
      sprite,
      quantity
    });
  };
  
  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('pokeball');
    setSprite(DEFAULT_SPRITES['pokeball']);
    setQuantity(1);
  };
  
  const handleCategoryChange = (value: ItemCategory) => {
    setCategory(value);
    setSprite(DEFAULT_SPRITES[value]);
  };
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="mb-4 flex items-center gap-2">
          <Plus size={16} />
          Add New Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Item to Inventory</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Item Name</Label>
            <Input 
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter item name"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter item description"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="category">Category</Label>
            <Select 
              value={category} 
              onValueChange={(value) => handleCategoryChange(value as ItemCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {ITEM_CATEGORIES.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="sprite">Sprite URL</Label>
            <div className="flex gap-2 items-center">
              <Input 
                id="sprite"
                value={sprite}
                onChange={(e) => setSprite(e.target.value)}
                placeholder="Enter sprite URL"
                required
              />
              {sprite && (
                <div className="bg-muted p-1 rounded-md">
                  <img src={sprite} alt="Item preview" className="w-8 h-8 object-contain" />
                </div>
              )}
            </div>
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input 
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
              required
            />
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={addItemMutation.isPending}
            >
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddItemForm;
