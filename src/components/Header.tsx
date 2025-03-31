
import React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CircleUser, MapPin, Map, Home, Users, PokeBall, Backpack } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { navigationMenuTriggerStyle } from "@/components/ui/navigation-menu";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-mobile";

const Header = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const isMobile = useMediaQuery("(max-width: 768px)");

  const navigationItems = [
    { name: "Home", path: "/", icon: <Home className="h-4 w-4 mr-1" /> },
    { name: "Pokédex", path: "/", icon: <PokeBall className="h-4 w-4 mr-1" /> },
    { name: "Map", path: "/map", icon: <Map className="h-4 w-4 mr-1" /> },
    { name: "Regions", path: "/regions", icon: <MapPin className="h-4 w-4 mr-1" /> },
    { name: "Trainers", path: "/trainers", icon: <Users className="h-4 w-4 mr-1" /> },
    { name: "My Items", path: "/items", icon: <Backpack className="h-4 w-4 mr-1" /> },
  ];

  const MobileMenu = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent side="left">
        <div className="flex flex-col gap-1 mt-8">
          {navigationItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "default" : "ghost"}
              className="justify-start"
              asChild
            >
              <NavLink to={item.path}>
                {item.icon}
                {item.name}
              </NavLink>
            </Button>
          ))}
          <hr className="my-2" />
          <Button
            variant={isActive("/trainer") ? "default" : "ghost"}
            className="justify-start"
            asChild
          >
            <NavLink to="/trainer">
              <CircleUser className="h-4 w-4 mr-1" />
              My Profile
            </NavLink>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );

  const DesktopMenu = () => (
    <NavigationMenu>
      <NavigationMenuList>
        {navigationItems.map((item) => (
          <NavigationMenuItem key={item.path}>
            <NavLink to={item.path}>
              <NavigationMenuLink
                className={navigationMenuTriggerStyle()}
                active={isActive(item.path)}
              >
                <span className="flex items-center">
                  {item.icon}
                  {item.name}
                </span>
              </NavigationMenuLink>
            </NavLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <Link to="/" className="flex items-center">
            <div className="rounded-full bg-gradient-to-r from-red-500 to-rose-600 p-1 mr-2">
              <div className="bg-white rounded-full h-6 w-6 flex items-center justify-center">
                <div className="bg-red-500 rounded-full h-2 w-2"></div>
              </div>
            </div>
            <span className="font-semibold text-lg hidden md:inline-block">
              PokéApp
            </span>
          </Link>
        </div>
        {isMobile ? <MobileMenu /> : <DesktopMenu />}
        <div className="ml-auto flex items-center">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/trainer">
              <Avatar className="h-8 w-8">
                <AvatarImage
                  src="/images/trainer-red.png"
                  alt="Trainer"
                />
                <AvatarFallback>TR</AvatarFallback>
              </Avatar>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
