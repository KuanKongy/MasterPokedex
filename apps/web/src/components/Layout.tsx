import React from 'react';
import Header from './Header';
import { Link, Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="bg-pokebrand-darkRed text-white py-6 text-center text-sm">
        <div className="container mx-auto space-y-2">
          <nav className="flex justify-center gap-4">
            <Link to="/faq" className="hover:underline text-white/90">
              FAQ
            </Link>
            <span className="text-white/40">·</span>
            <Link to="/privacy" className="hover:underline text-white/90">
              Privacy
            </Link>
            <span className="text-white/40">·</span>
            <Link to="/terms" className="hover:underline text-white/90">
              Terms
            </Link>
            <span className="text-white/40">·</span>
            <Link to="/settings" className="hover:underline text-white/90">
              Settings
            </Link>
          </nav>
          <p className="text-white/70 text-xs">
            Pokémon data via{' '}
            <a href="https://pokeapi.co" target="_blank" rel="noreferrer" className="underline">
              PokeAPI
            </a>
            . Pokémon © Nintendo, Creatures Inc., GAME FREAK inc. — this is an unaffiliated fan
            project.
          </p>
          <p className="text-white/90">Made by Nam Le</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
