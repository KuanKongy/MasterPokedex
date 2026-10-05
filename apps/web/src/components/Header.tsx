
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
  Menu,
  Moon,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sun,
  User,
  UserPlus,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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

/** One row in the phone menu: same target size and active treatment throughout. */
const sheetRow =
  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted';

const Header: React.FC = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { session, signOut } = useAuth();
  const { data: me } = useMe();
  const { resolvedTheme, setTheme } = useTheme();
  const { ballStyle, ballArt } = useBallPref();

  const dataActive = dataMenu.some((item) => isNavActive(location.pathname, item.href));

  /** Phone menu entries navigate and close in one gesture. */
  const go = (href: string) => {
    setIsMenuOpen(false);
    navigate(href);
  };

  return (
    <header className="bg-pokebrand-band border-b dark:border-gray-800">
      <div className="container mx-auto px-4 flex h-16 items-center gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={ballSprite(ballStyle, ballArt)} alt="" className="h-9 w-9 pixelated" />
          <span className="text-lg sm:text-xl font-bold text-pokebrand-foreground">MasterPokédex</span>
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

        {/* …theme, search and one account control on the right. Everything
            else that used to sit here (settings, sign-in) now hangs off the
            account menu on a desktop and off the sheet on a phone, so the bar
            never carries four competing controls. */}
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="shrink-0 text-pokebrand-foreground/80 hover:text-pokebrand-foreground p-1.5 rounded-md hover:bg-pokebrand-foreground/10 transition-colors"
          >
            <Sun className="h-5 w-5 hidden dark:block" />
            <Moon className="h-5 w-5 dark:hidden" />
          </button>

          <OmniSearch variant="header" className="hidden md:block w-56 lg:w-64 xl:w-80" />

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Search"
            className="md:hidden bg-pokebrand-foreground/10 border-pokebrand-foreground/20 text-pokebrand-foreground hover:bg-pokebrand-foreground/20"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Desktop account control. */}
          <div className="hidden lg:block">
            {session ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1" aria-label="Account menu">
                    <Avatar className="h-8 w-8 cursor-pointer hover:ring-2 hover:ring-pokebrand-foreground/50">
                      <AvatarImage
                        src={me?.avatarUrl ? resolveAsset(me.avatarUrl) : undefined}
                        alt={me?.displayName || 'Trainer'}
                      />
                      <AvatarFallback>
                        {(me?.displayName || session.user.email || 'T').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-3 w-3 text-pokebrand-foreground/70" />
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
                  {/* The nav's Items entry is the catalogue; the bag lives on
                      the trainer page's Bag tab. */}
                  <DropdownMenuItem onClick={() => navigate('/trainer?tab=bag')}>
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    My bag
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/customisation')}>
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Customisation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="bg-pokebrand-foreground/10 border-pokebrand-foreground/20 text-pokebrand-foreground hover:bg-pokebrand-foreground/20 hover:text-pokebrand-foreground"
                  >
                    <LogIn className="mr-1 h-4 w-4" />
                    Sign in
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => navigate('/login')}>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign in
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/login?mode=signup')}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create account
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/customisation')}>
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    Customisation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Phone and tablet: the nav row that used to sit under the bar. */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label="Menu"
                className="lg:hidden bg-pokebrand-foreground/10 border-pokebrand-foreground/20 text-pokebrand-foreground hover:bg-pokebrand-foreground/20"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 max-w-[85vw] overflow-y-auto p-0">
              <SheetTitle className="px-6 pt-6 text-left text-base">Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Pages, data tables and your account
              </SheetDescription>

              <nav className="flex flex-col gap-1 p-3">
                {navigation.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => go(item.href)}
                    className={cn(
                      sheetRow,
                      isNavActive(location.pathname, item.href) && 'bg-muted text-pokebrand-red',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </button>
                ))}

                {/* Data is a group, not a page — the chevron says so, and it
                    opens already expanded when you are inside one of its pages. */}
                <Collapsible defaultOpen={dataActive}>
                  <CollapsibleTrigger
                    className={cn(
                      sheetRow,
                      'justify-between [&[data-state=open]>svg:last-child]:rotate-180',
                      dataActive && 'text-pokebrand-red',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <Database className="h-4 w-4" />
                      Data
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="flex flex-col gap-1 pt-1">
                    {dataMenu.map((item) => (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => go(item.href)}
                        className={cn(
                          sheetRow,
                          'py-2 pl-10 text-sm font-normal text-muted-foreground',
                          isNavActive(location.pathname, item.href) && 'bg-muted text-pokebrand-red',
                        )}
                      >
                        {item.name}
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>

                <Separator className="my-2" />

                <button type="button" onClick={() => go('/customisation')} className={sheetRow}>
                  <SlidersHorizontal className="h-4 w-4" />
                  Customisation
                </button>

                {session ? (
                  <>
                    <button type="button" onClick={() => go('/trainer')} className={sheetRow}>
                      <User className="h-4 w-4" />
                      {me ? `@${me.username}` : 'My profile'}
                    </button>
                    <button type="button" onClick={() => go('/trainer?tab=bag')} className={sheetRow}>
                      <ShoppingBag className="h-4 w-4" />
                      My bag
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        void signOut();
                      }}
                      className={sheetRow}
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => go('/login')} className={sheetRow}>
                      <LogIn className="h-4 w-4" />
                      Sign in
                    </button>
                    <button type="button" onClick={() => go('/login?mode=signup')} className={sheetRow}>
                      <UserPlus className="h-4 w-4" />
                      Create account
                    </button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
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
