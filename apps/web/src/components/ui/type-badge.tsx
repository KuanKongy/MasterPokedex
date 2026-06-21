
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

// Define type colors - now setting appropriate default colors
const typeColors: Record<PokemonType, { bg: string, hover: string, text: string }> = {
  normal: { bg: 'bg-gray-400', hover: 'hover:bg-gray-500', text: 'text-white' },
  fire: { bg: 'bg-orange-500', hover: 'hover:bg-orange-600', text: 'text-white' },
  water: { bg: 'bg-blue-500', hover: 'hover:bg-blue-600', text: 'text-white' },
  electric: { bg: 'bg-yellow-400', hover: 'hover:bg-yellow-500', text: 'text-white' },
  grass: { bg: 'bg-green-500', hover: 'hover:bg-green-600', text: 'text-white' },
  ice: { bg: 'bg-cyan-400', hover: 'hover:bg-cyan-500', text: 'text-white' },
  fighting: { bg: 'bg-red-700', hover: 'hover:bg-red-800', text: 'text-white' },
  poison: { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-white' },
  ground: { bg: 'bg-amber-600', hover: 'hover:bg-amber-700', text: 'text-white' },
  flying: { bg: 'bg-indigo-400', hover: 'hover:bg-indigo-500', text: 'text-white' },
  psychic: { bg: 'bg-pink-500', hover: 'hover:bg-pink-600', text: 'text-white' },
  bug: { bg: 'bg-lime-500', hover: 'hover:bg-lime-600', text: 'text-white' },
  rock: { bg: 'bg-stone-500', hover: 'hover:bg-stone-600', text: 'text-white' },
  ghost: { bg: 'bg-purple-800', hover: 'hover:bg-purple-900', text: 'text-white' },
  dark: { bg: 'bg-gray-700', hover: 'hover:bg-gray-800', text: 'text-white' },
  dragon: { bg: 'bg-indigo-600', hover: 'hover:bg-indigo-700', text: 'text-white' },
  steel: { bg: 'bg-slate-400', hover: 'hover:bg-slate-500', text: 'text-white' },
  fairy: { bg: 'bg-pink-300', hover: 'hover:bg-pink-400', text: 'text-white' }
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
