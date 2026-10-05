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
      <footer className="bg-pokebrand-darkRed text-pokebrand-foreground py-6 text-sm">
        <div className="container mx-auto px-4 grid grid-cols-1 items-center gap-2 text-center sm:grid-cols-[1fr_auto] sm:text-left">
          <p className="text-pokebrand-foreground/70 text-xs">
            Pokémon data via{' '}
            <a href="https://pokeapi.co" target="_blank" rel="noreferrer" className="underline">
              PokeAPI
            </a>
            . Pokémon © Nintendo, Creatures Inc., GAME FREAK inc. — this is an unaffiliated fan
            project.
          </p>
          <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2 sm:justify-end">
            <Link to="/faq" className="hover:underline text-pokebrand-foreground/90">
              FAQ
            </Link>
            <Link to="/contact" className="hover:underline text-pokebrand-foreground/90">
              Contact
            </Link>
            <Link to="/privacy" className="hover:underline text-pokebrand-foreground/90">
              Privacy
            </Link>
            <Link to="/terms" className="hover:underline text-pokebrand-foreground/90">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
