
import React from 'react';
import { Link } from 'react-router-dom';
import { Pokemon } from '../types/pokemon';
import { Card, CardContent } from './ui/card';
import { getPokemonTypeColor } from '../utils/helpers';
import { Badge } from './ui/badge';

interface CollectionListProps {
  collection: Pokemon[];
}

const CollectionList: React.FC<CollectionListProps> = ({ collection }) => {
  if (collection.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/30 rounded-lg">
        <h3 className="text-xl font-semibold mb-2">No Pokémon in collection yet</h3>
        <p className="text-muted-foreground">
          Start your journey by adding Pokémon to your collection
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">My Collection ({collection.length})</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {collection.map((pokemon) => (
          <Link key={pokemon.id} to={`/pokemon/${pokemon.id}`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-3 flex flex-col items-center text-center">
                <img
                  src={pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}
                  alt={pokemon.name}
                  className="w-28 h-28 object-contain"
                />
                <div className="mt-2">
                  <div className="text-sm font-medium capitalize">{pokemon.name}</div>
                  <div className="text-xs text-muted-foreground">#{pokemon.id.toString().padStart(3, '0')}</div>
                  <div className="flex justify-center gap-1 mt-2">
                    {pokemon.types.map((typeInfo) => (
                      <Badge
                        key={typeInfo.type.name}
                        className="text-xs text-white"
                        style={{ backgroundColor: getPokemonTypeColor(typeInfo.type.name) }}
                      >
                        {typeInfo.type.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CollectionList;
