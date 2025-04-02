
import React from 'react';
import Header from './Header';
import { Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <footer className="bg-red-700 text-white py-4 text-center text-sm">
        <div className="container mx-auto">
          <p>Data provided by <a href="https://pokeapi.co/" target="_blank" rel="noopener noreferrer" className="underline">PokéAPI</a></p>
          <p className="mt-2">Pokémon and Pokémon character names are trademarks of Nintendo.</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
