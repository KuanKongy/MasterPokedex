import React from 'react';
import {
  Bug,
  Circle,
  Cog,
  Droplet,
  Eye,
  Feather,
  Flame,
  Gem,
  Ghost,
  Leaf,
  Moon,
  Mountain,
  Skull,
  Snowflake,
  Sparkles,
  Swords,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import type { PokemonTypeName } from '@masterpokedex/shared';

/**
 * One small glyph per battle type, the way the games mark them — a leaf for
 * grass, a flame for fire. Everything inherits `currentColor`, so the icon
 * reads correctly inside a colored pill or as a bare header icon.
 * Dragon has no lucide equivalent, so it gets a hand-drawn fang.
 */
const LUCIDE_BY_TYPE: Partial<Record<PokemonTypeName, LucideIcon>> = {
  normal: Circle,
  fire: Flame,
  water: Droplet,
  electric: Zap,
  grass: Leaf,
  ice: Snowflake,
  fighting: Swords,
  poison: Skull,
  ground: Mountain,
  flying: Feather,
  psychic: Eye,
  bug: Bug,
  rock: Gem,
  ghost: Ghost,
  dark: Moon,
  steel: Cog,
  fairy: Sparkles,
};

const DragonFang: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M5 3c1.2 2.4 4 3.6 7 3.6S17.8 5.4 19 3c.6 6.4-1.8 12.8-7 18C6.8 15.8 4.4 9.4 5 3Zm7 6.2c-1.1 0-2.2-.2-3.2-.6.5 3 1.6 5.9 3.2 8.4 1.6-2.5 2.7-5.4 3.2-8.4-1 .4-2.1.6-3.2.6Z" />
  </svg>
);

export const TypeIcon: React.FC<{ type: PokemonTypeName; className?: string }> = ({ type, className }) => {
  if (type === 'dragon') return <DragonFang className={className} />;
  const Icon = LUCIDE_BY_TYPE[type] ?? Circle;
  return <Icon className={className} aria-hidden="true" />;
};

export default TypeIcon;
