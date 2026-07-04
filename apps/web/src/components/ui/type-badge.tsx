import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
import type { PokemonTypeName } from '@masterpokedex/shared';
import { TypeIcon } from './type-icon';

export type PokemonType = PokemonTypeName;

/**
 * Written-out literals on purpose: Tailwind only generates classes it can see
 * in source, so `bg-poketype-${type}` would silently produce nothing (the bug
 * this map replaces). These are the canonical poketype.* colors from
 * tailwind.config.ts — the app's single type palette.
 */
const TYPE_BG: Record<PokemonTypeName, string> = {
  normal: 'bg-poketype-normal',
  fire: 'bg-poketype-fire',
  water: 'bg-poketype-water',
  electric: 'bg-poketype-electric',
  grass: 'bg-poketype-grass',
  ice: 'bg-poketype-ice',
  fighting: 'bg-poketype-fighting',
  poison: 'bg-poketype-poison',
  ground: 'bg-poketype-ground',
  flying: 'bg-poketype-flying',
  psychic: 'bg-poketype-psychic',
  bug: 'bg-poketype-bug',
  rock: 'bg-poketype-rock',
  ghost: 'bg-poketype-ghost',
  dragon: 'bg-poketype-dragon',
  dark: 'bg-poketype-dark',
  steel: 'bg-poketype-steel',
  fairy: 'bg-poketype-fairy',
};

/** Border variants of the same palette, for cards accented by a type. */
export const TYPE_BORDER: Record<PokemonTypeName, string> = {
  normal: 'border-poketype-normal',
  fire: 'border-poketype-fire',
  water: 'border-poketype-water',
  electric: 'border-poketype-electric',
  grass: 'border-poketype-grass',
  ice: 'border-poketype-ice',
  fighting: 'border-poketype-fighting',
  poison: 'border-poketype-poison',
  ground: 'border-poketype-ground',
  flying: 'border-poketype-flying',
  psychic: 'border-poketype-psychic',
  bug: 'border-poketype-bug',
  rock: 'border-poketype-rock',
  ghost: 'border-poketype-ghost',
  dragon: 'border-poketype-dragon',
  dark: 'border-poketype-dark',
  steel: 'border-poketype-steel',
  fairy: 'border-poketype-fairy',
};

interface TypeBadgeProps {
  type: PokemonTypeName;
  /** Show the type's glyph before the label (leaf for grass, flame for fire…). */
  icon?: boolean;
  size?: 'sm' | 'md';
  /**
   * Make the badge a link to its type page. Opt-in because many badges
   * already sit inside a card's own Link (nested anchors are invalid HTML);
   * only free-standing badges should set it.
   */
  link?: boolean;
  className?: string;
}

const TypeBadge: React.FC<TypeBadgeProps> = ({ type, icon = false, size = 'md', link = false, className }) => {
  const badge = (
    <Badge
      className={cn(
        'capitalize rounded-full border-transparent text-white transition-[filter] hover:brightness-110',
        // The pale types need help for the white text to stay readable.
        '[text-shadow:0_1px_1px_rgba(0,0,0,0.35)]',
        TYPE_BG[type] ?? TYPE_BG.normal,
        size === 'sm' ? 'px-2 py-0 text-[0.6875rem]' : 'px-2.5 py-0.5 text-xs',
        icon && 'gap-1',
        className,
      )}
    >
      {icon && <TypeIcon type={type} className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      {type}
    </Badge>
  );
  if (!link) return badge;
  return (
    <Link
      to={`/types/${type}`}
      aria-label={`${type} type`}
      className="inline-flex"
      onClick={(e) => e.stopPropagation()}
    >
      {badge}
    </Link>
  );
};

export { TypeBadge };
