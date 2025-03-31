
import React from 'react';
import { Link } from 'react-router-dom';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from './ui/navigation-menu';
import { cn } from '@/lib/utils';
import { ChevronDown, Map, User, Package, List } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-pokebrand-red text-white py-4 px-4 sticky top-0 z-10 shadow-md">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold">
          Pokédex
        </Link>

        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <Link to="/" className="flex items-center h-10 px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-md transition-colors">
                <List className="mr-2 h-4 w-4" />
                Pokémon List
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/map" className="flex items-center h-10 px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-md transition-colors">
                <Map className="mr-2 h-4 w-4" />
                Map
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/trainer" className="flex items-center h-10 px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-md transition-colors">
                <User className="mr-2 h-4 w-4" />
                Trainer
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/items" className="flex items-center h-10 px-4 py-2 text-sm font-medium hover:bg-white/10 rounded-md transition-colors">
                <Package className="mr-2 h-4 w-4" />
                Items
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
};

export default Header;
