
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
      <footer className="bg-pokebrand-darkRed text-white py-4 text-center text-sm">
        <div className="container mx-auto">
          <p className="mt-2">Made by Nam Le</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
