
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import OmniSearch from './OmniSearch';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  ChevronDown,
  Database,
  LogIn,
  LogOut,
  MapPin,
  Moon,
  Search,
  Settings,
  ShoppingBag,
  Sun,
  User,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/auth/AuthProvider';
import { useMe } from '@/hooks/api/trainer';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from 'next-themes';
import { resolveAsset } from '@/lib/assets';
import { cn } from '@/lib/utils';
import { ballSprite, useBallPref } from '@/prefs/BallPrefContext';

const navigation = [
  { name: 'Pokédex', href: '/', icon: BookOpen },
  { name: 'Map', href: '/map', icon: MapPin },
  { name: 'Trainer', href: '/trainer', icon: User },
  { name: 'Items', href: '/items', icon: ShoppingBag },
];

const dataMenu = [
  { name: 'All locations', href: '/locations' },
  { name: 'Moves', href: '/moves' },
  { name: 'Abilities', href: '/abilities' },
  { name: 'Type chart', href: '/types' },
  { name: 'Evolution chains', href: '/evolutions' },
  { name: 'Mega Evolutions', href: '/mega-evolutions' },
  { name: 'Gigantamax', href: '/gigantamax' },
  { name: 'Advanced search', href: '/pokemon-filter' },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/pokemon/');
  return pathname === href || pathname.startsWith(`${href}/`);
}

const Header: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { session, signOut } = useAuth();
  const { data: me } = useMe();
  const { resolvedTheme, setTheme } = useTheme();
  const { ballStyle, ballArt } = useBallPref();

  const dataActive = dataMenu.some((item) => isNavActive(location.pathname, item.href));

  return (
    <header className="bg-pokebrand-band border-b dark:border-gray-800">
      <div className="container mx-auto px-4 flex h-16 items-center gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={ballSprite(ballStyle, ballArt)} alt="" className="h-9 w-9 pixelated" />
          <span className="text-xl font-bold text-pokebrand-foreground">MasterPokédex</span>
        </Link>

        {/* Pages on the left… */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                isNavActive(location.pathname, item.href)
                  ? 'bg-pokebrand-foreground/20 text-pokebrand-foreground'
                  : 'text-pokebrand-foreground/90 hover:bg-pokebrand-foreground/10',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1',
                  dataActive ? 'bg-pokebrand-foreground/20 text-pokebrand-foreground' : 'text-pokebrand-foreground/90 hover:bg-pokebrand-foreground/10',
                )}
              >
                <Database className="h-4 w-4" />
                Data
                <ChevronDown className="h-3 w-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              {dataMenu.map((item) => (
                <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)}>
                  {item.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* …search and account on the right. */}
        <div className="ml-auto flex items-center gap-3">
          <OmniSearch variant="header" className="hidden md:block w-64 xl:w-80" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
            className="md:hidden bg-pokebrand-foreground/10 border-pokebrand-foreground/20 text-pokebrand-foreground hover:bg-pokebrand-foreground/20"
          >
            <Search className="h-4 w-4" />
          </Button>

          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="text-pokebrand-foreground/80 hover:text-pokebrand-foreground p-1.5 rounded-md hover:bg-pokebrand-foreground/10 transition-colors"
          >
            <Sun className="h-5 w-5 hidden dark:block" />
            <Moon className="h-5 w-5 dark:hidden" />
          </button>

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button aria-label="Account menu">
                  <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-pokebrand-foreground/50">
                    <AvatarImage
                      src={me?.avatarUrl ? resolveAsset(me.avatarUrl) : undefined}
                      alt={me?.displayName || 'Trainer'}
                    />
                    <AvatarFallback>
                      {(me?.displayName || session.user.email || 'T').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {me ? `@${me.username}` : session.user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/trainer')}>
                  <User className="mr-2 h-4 w-4" />
                  My profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/items')}>
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  My bag
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/login')}
                className="bg-pokebrand-foreground/10 border-pokebrand-foreground/20 text-pokebrand-foreground hover:bg-pokebrand-foreground/20 hover:text-pokebrand-foreground"
              >
                <LogIn className="mr-1 h-4 w-4" />
                Sign in
              </Button>
              <Link
                to="/settings"
                aria-label="Settings"
                className="text-pokebrand-foreground/80 hover:text-pokebrand-foreground p-1.5 rounded-md hover:bg-pokebrand-foreground/10 transition-colors"
              >
                <Settings className="h-5 w-5" />
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="lg:hidden border-t border-pokebrand-foreground/20">
        <div className="flex justify-around">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex flex-1 flex-col items-center py-2 px-1 text-xs',
                isNavActive(location.pathname, item.href)
                  ? 'text-pokebrand-foreground bg-pokebrand-foreground/20'
                  : 'text-pokebrand-foreground/80 hover:text-pokebrand-foreground',
              )}
            >
              <item.icon className="h-4 w-4 mb-1" />
              <span className="truncate">{item.name}</span>
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'flex flex-1 flex-col items-center py-2 px-1 text-xs',
                  dataActive ? 'text-pokebrand-foreground bg-pokebrand-foreground/20' : 'text-pokebrand-foreground/80 hover:text-pokebrand-foreground',
                )}
              >
                <Database className="h-4 w-4 mb-1" />
                <span className="truncate">Data</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {dataMenu.map((item) => (
                <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)}>
                  {item.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className={isMobile ? 'max-w-full p-4 h-full' : ''}>
          <DialogTitle className="sr-only">Search</DialogTitle>
          <OmniSearch variant="page" autoFocus onNavigated={() => setIsSearchOpen(false)} />
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
