
import React from 'react';
import ItemInventory from '../components/ItemInventory';

const Items = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Item Inventory</h1>
      <p className="text-muted-foreground mb-8">
        Manage your Pokémon items and supplies
      </p>
      
      <ItemInventory />
    </div>
  );
};

export default Items;
