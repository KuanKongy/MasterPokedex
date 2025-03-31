
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchTrainerItems, useItem } from '../api/trainerApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ItemCategory, TrainerItem } from '../types/trainer';
import { Package, Search, Plus, Minus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const categoryIcons: Record<ItemCategory, React.ReactNode> = {
  pokeball: <span className="text-red-500">●</span>,
  medicine: <span className="text-green-500">+</span>,
  berry: <span className="text-pink-500">◆</span>,
  battle: <span className="text-orange-500">⚔️</span>,
  evolution: <span className="text-purple-500">↗</span>,
  machine: <span className="text-blue-500">⚙️</span>,
  key: <span className="text-yellow-500">🔑</span>
};

const ItemInventory: React.FC = () => {
  const [filter, setFilter] = useState<ItemCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  
  const { data: items, isLoading, error, refetch } = useQuery({
    queryKey: ['trainerItems'],
    queryFn: fetchTrainerItems
  });

  const handleUseItem = async (item: TrainerItem) => {
    try {
      if (item.quantity <= 0) {
        toast({
          title: "Cannot use item",
          description: "You don't have any more of this item.",
          variant: "destructive"
        });
        return;
      }
      
      await useItem(item.id);
      toast({
        title: "Item used",
        description: `You used 1 ${item.name}.`,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to use item",
        variant: "destructive"
      });
    }
  };
  
  if (isLoading) {
    return <div className="flex justify-center p-8">Loading items...</div>;
  }
  
  if (error || !items) {
    return <div className="text-red-500 p-4">Error loading inventory</div>;
  }
  
  // Filter items based on category and search term
  const filteredItems = items.filter(item => {
    const matchesCategory = filter === 'all' || item.category === filter;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Group items by category
  const itemsByCategory: Record<ItemCategory, TrainerItem[]> = {
    pokeball: [],
    medicine: [],
    berry: [],
    battle: [],
    evolution: [],
    machine: [],
    key: []
  };
  
  filteredItems.forEach(item => {
    if (itemsByCategory[item.category]) {
      itemsByCategory[item.category].push(item);
    }
  });
  
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" /> Item Inventory
            </CardTitle>
            <CardDescription>
              Manage your items and supplies
            </CardDescription>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              className="w-full pl-8 pr-4 py-2 text-sm border rounded-md"
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          {Object.keys(itemsByCategory).map((category) => (
            <Button
              key={category}
              variant={filter === category ? 'default' : 'outline'}
              size="sm"
              className="flex items-center gap-1"
              onClick={() => setFilter(category as ItemCategory)}
            >
              {categoryIcons[category as ItemCategory]}
              <span className="capitalize">{category}</span>
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(itemsByCategory).map(([category, categoryItems]) => {
            // Skip empty categories unless showing all
            if (categoryItems.length === 0) return null;
            // Skip categories that don't match the filter
            if (filter !== 'all' && filter !== category) return null;
            
            return (
              <div key={category}>
                <h3 className="text-lg font-medium flex items-center gap-2 mb-3">
                  {categoryIcons[category as ItemCategory]}
                  <span className="capitalize">{category}</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryItems.map((item) => (
                    <div key={item.id} className="flex items-center border rounded-md p-3 bg-card">
                      <div className="flex-shrink-0 mr-3">
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          {item.sprite ? (
                            <img src={item.sprite} alt={item.name} className="w-10 h-10 object-contain" />
                          ) : (
                            categoryIcons[item.category]
                          )}
                        </div>
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {item.description}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <Badge variant="outline" className="text-xs">
                            Qty: {item.quantity}
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled={item.quantity <= 0}
                            onClick={() => handleUseItem(item)}
                          >
                            Use
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <h3 className="font-medium text-lg mb-1">No items found</h3>
              <p className="text-muted-foreground text-sm">
                Try adjusting your search or filter
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ItemInventory;
