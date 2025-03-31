
import React from 'react';
import PokemonMap from '../components/PokemonMap';

const Map = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Pokémon Map</h1>
      <p className="text-muted-foreground mb-8">
        Explore locations and discover which Pokémon can be found in different areas
      </p>
      
      <PokemonMap />
    </div>
  );
};

export default Map;
