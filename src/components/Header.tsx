
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
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

  const handleSearch = (pokemonName: string) => {
    const foundPokemon = pokemon?.find(p => 
      p.name.toLowerCase() === pokemonName.toLowerCase() ||
      p.id.toString() === pokemonName
    );
    
    if (foundPokemon) {
      navigate(`/pokemon/${foundPokemon.id}`);
      setIsSearchOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <header className="bg-pokebrand-red dark:bg-pokebrand-red border-b dark:border-gray-800">
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center">
              <div className="bg-pokebrand-red rounded-full w-4 h-4 border-2 border-black"></div>
            </div>
            <span className="text-xl font-bold text-white">Pokédex</span>
          </Link>
        </div>

        <div className="hidden sm:flex items-center space-x-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                location.pathname === item.href
                  ? 'bg-white/20 text-white'
                  : 'text-white/90 hover:bg-white/10'
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
            className="text-sm bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <span>Search</span>
          </Button>

          <Link to="/trainer">
            <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-white/50">
              <AvatarImage
                src={trainer?.avatar || "/placeholder.svg"}
                alt={trainer?.name || "User"}
              />
              <AvatarFallback>{trainer?.name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="sm:hidden border-t border-white/20">
        <div className="flex justify-around">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex flex-1 flex-col items-center py-2 px-1 text-xs ${
                location.pathname === item.href
                  ? 'text-white bg-white/20'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4 mb-1" />
              <span className="truncate">{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className={isMobile ? "max-w-full p-4 h-full" : ""}>
          <SearchBar 
            searchTerm={searchTerm} 
            setSearchTerm={setSearchTerm} 
            onSearch={handleSearch}
            pokemonData={pokemon || []}
          />
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
