
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchPokemonList } from '../api/pokemonApi';
import SearchBar from './SearchBar';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, User, ShoppingBag, Home, Filter } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { fetchTrainerProfile } from '../api/trainerApi';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Map', href: '/map', icon: MapPin },
  { name: 'Trainer', href: '/trainer', icon: User },
  { name: 'Items', href: '/items', icon: ShoppingBag },
  { name: 'Pokémon Filter', href: '/pokemon-filter', icon: Filter },
];

const Header: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();

  const { data: pokemon, isLoading } = useQuery({
    queryKey: ['pokemonList'],
    queryFn: fetchPokemonList,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { data: trainer } = useQuery({
    queryKey: ['trainerProfile'],
    queryFn: fetchTrainerProfile,
  });

  return (
    <header className="bg-white dark:bg-gray-900 border-b dark:border-gray-800">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-pokebrand-red rounded-full w-8 h-8 flex items-center justify-center">
              <div className="bg-white rounded-full w-4 h-4"></div>
            </div>
            <span className="text-xl font-bold">Pokédex</span>
          </Link>
        </div>

        <div className="hidden sm:flex items-center space-x-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                location.pathname === item.href
                  ? 'bg-pokebrand-red/10 text-pokebrand-red'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
            className="text-sm"
          >
            <span>Search</span>
          </Button>

          <Avatar className="h-8 w-8">
            <AvatarImage
              src={trainer?.avatar || "/placeholder.svg"}
              alt={trainer?.name || "User"}
            />
            <AvatarFallback>{trainer?.name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="sm:hidden border-t">
        <div className="flex justify-around">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-1 flex-col items-center py-2 px-1 text-xs ${
                location.pathname === item.href
                  ? 'text-pokebrand-red bg-pokebrand-red/10'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <item.icon className="h-4 w-4 mb-1" />
              <span className="truncate">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className={isMobile ? "max-w-full p-0 h-full" : ""}>
          <SearchBar />
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
