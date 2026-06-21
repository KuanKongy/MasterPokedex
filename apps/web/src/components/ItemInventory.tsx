
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrainerItems, removeItem, useItem } from '../api/trainerApi';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Trash } from 'lucide-react';
import { ItemCategory } from '../types/trainer';
import { useToast } from '@/hooks/use-toast';
import AddItemForm from './AddItemForm';

const ItemInventory: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: items, isLoading } = useQuery({
    queryKey: ['trainerItems'],
    queryFn: fetchTrainerItems,
  });

  const useItemMutation = useMutation({
    mutationFn: useItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerItems'] });
      toast({
        title: "Item used",
        description: "You've successfully used the item.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to use item",
        variant: "destructive",
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: removeItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerItems'] });
      toast({
        title: "Item removed",
        description: "Item has been removed from your inventory.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove item",
        variant: "destructive",
      });
    },
  });

  const handleUseItem = (itemId: number) => {
    useItemMutation.mutate(itemId);
  };

  const handleRemoveItem = (itemId: number) => {
    removeItemMutation.mutate(itemId);
  };
  
  const categories: { value: ItemCategory | 'all'; label: string }[] = [
    { value: 'all', label: 'All Items' },
    { value: 'pokeball', label: 'Poké Balls' },
    { value: 'medicine', label: 'Medicine' },
    { value: 'berry', label: 'Berries' },
    { value: 'battle', label: 'Battle Items' },
    { value: 'evolution', label: 'Evolution Items' },
    { value: 'machine', label: 'Machines' },
    { value: 'key', label: 'Key Items' },
  ];

  const filteredItems = items
    ? selectedCategory === 'all'
      ? items
      : items.filter(item => item.category === selectedCategory)
    : [];

  if (isLoading) {
    return <div className="flex justify-center p-8">Loading items...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl">Item Inventory</CardTitle>
        <AddItemForm />
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map(category => (
            <Badge
              key={category.value}
              variant={selectedCategory === category.value ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory(category.value)}
            >
              {category.label}
            </Badge>
          ))}
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredItems.length > 0 ? (
              filteredItems.map(item => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <img 
                        src={item.sprite} 
                        alt={item.name} 
                        className="w-8 h-8 object-contain" 
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {item.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleUseItem(item.id)}
                        disabled={useItemMutation.isPending || item.quantity <= 0}
                      >
                        Use
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="icon" 
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={removeItemMutation.isPending}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  No items in this category
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ItemInventory;
