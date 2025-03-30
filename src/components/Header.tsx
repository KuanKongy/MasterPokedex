
import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="bg-pokebrand-red text-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-pokebrand-red border border-gray-300"></div>
            </div>
            <span className="text-xl font-bold">National Pokédex</span>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
