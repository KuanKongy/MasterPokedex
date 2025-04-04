
import React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';

type PokemonType = 
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' 
  | 'ice' | 'fighting' | 'poison' | 'ground' | 'flying' 
  | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dark' 
  | 'dragon' | 'steel' | 'fairy';

interface TypeBadgeProps {
  type: PokemonType;
  className?: string;
}

// Define type colors
const typeColors: Record<PokemonType, { bg: string, hover: string, text: string }> = {
  normal: { bg: 'bg-gray-500', hover: 'hover:bg-gray-400', text: 'text-white' },
  fire: { bg: 'bg-gray-800', hover: 'hover:bg-orange-500', text: 'text-white' },
  water: { bg: 'bg-gray-800', hover: 'hover:bg-blue-500', text: 'text-white' },
  electric: { bg: 'bg-gray-800', hover: 'hover:bg-yellow-400', text: 'text-white' },
  grass: { bg: 'bg-gray-800', hover: 'hover:bg-green-500', text: 'text-white' },
  ice: { bg: 'bg-gray-800', hover: 'hover:bg-cyan-400', text: 'text-white' },
  fighting: { bg: 'bg-gray-800', hover: 'hover:bg-red-700', text: 'text-white' },
  poison: { bg: 'bg-gray-800', hover: 'hover:bg-purple-600', text: 'text-white' },
  ground: { bg: 'bg-gray-800', hover: 'hover:bg-amber-600', text: 'text-white' },
  flying: { bg: 'bg-gray-800', hover: 'hover:bg-indigo-400', text: 'text-white' },
  psychic: { bg: 'bg-gray-800', hover: 'hover:bg-pink-500', text: 'text-white' },
  bug: { bg: 'bg-gray-800', hover: 'hover:bg-lime-500', text: 'text-white' },
  rock: { bg: 'bg-gray-800', hover: 'hover:bg-stone-500', text: 'text-white' },
  ghost: { bg: 'bg-gray-800', hover: 'hover:bg-purple-800', text: 'text-white' },
  dark: { bg: 'bg-gray-800', hover: 'hover:bg-gray-700', text: 'text-white' },
  dragon: { bg: 'bg-gray-800', hover: 'hover:bg-indigo-600', text: 'text-white' },
  steel: { bg: 'bg-gray-800', hover: 'hover:bg-slate-400', text: 'text-white' },
  fairy: { bg: 'bg-gray-800', hover: 'hover:bg-pink-300', text: 'text-white' }
};

const TypeBadge: React.FC<TypeBadgeProps> = ({ type, className }) => {
  const typeColor = typeColors[type] || typeColors.normal;
  
  return (
    <Badge 
      className={cn(
        'capitalize transition-colors',
        typeColor.bg,
        typeColor.hover,
        typeColor.text,
        className
      )}
    >
      {type}
    </Badge>
  );
};

export { TypeBadge };
