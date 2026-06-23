import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { PackagePlus, Search } from 'lucide-react';
import { useItemCatalogue, useItemCategories, useAdjustItem } from '@/hooks/api/items';
import { useAuth } from '@/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { capitalize } from '../utils/helpers';
import LoadingSpinner from './LoadingSpinner';

const ALL = 'all';

/**
 * The full item catalogue from the dex (~2200 items) — public browsing, with
 * an add-to-bag shortcut that prompts sign-in when needed. Replaces the old
 * free-text "add item" form: items are reference data, not user input.
 */
const ItemCatalogue: React.FC = () => {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL);
  const { session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: categories } = useItemCategories();
  const { data: items, isLoading } = useItemCatalogue({
    category: category === ALL ? undefined : category,
    q: search || undefined,
  });
  const adjust = useAdjustItem();

  const addToBag = (itemId: number, name: string) => {
    if (!session) {
      toast({ title: 'Sign in to keep a bag', description: 'Your items live on your trainer account.' });
      navigate('/login');
      return;
    }
    adjust.mutate(
      { itemId, delta: 1 },
      { onSuccess: () => toast({ title: `${name} added to your bag` }) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <form
          className="flex flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchInput.trim());
          }}
        >
          <Input
            placeholder="Search items…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              if (e.target.value === '') setSearch('');
            }}
            className="rounded-r-none"
          />
          <Button type="submit" className="rounded-l-none">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.name}>
                {cat.displayName} ({cat.itemCount})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <LoadingSpinner />
        </div>
      ) : !items || items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No items match.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-3 flex items-center gap-3">
                {item.sprite && <img src={item.sprite} alt={item.displayName} loading="lazy" className="w-10 h-10 pixelated" />}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate flex items-center gap-2">
                    {item.displayName}
                    {item.cost !== null && item.cost > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        ₽{item.cost}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2">
                    {item.effect ?? capitalize(item.category.replace(/-/g, ' '))}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0"
                  aria-label={`Add ${item.displayName} to bag`}
                  disabled={adjust.isPending}
                  onClick={() => addToBag(item.id, item.displayName)}
                >
                  <PackagePlus className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ItemCatalogue;
