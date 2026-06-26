import React from 'react';
import { Link } from 'react-router-dom';
import type { PokemonSummary } from '@masterpokedex/shared';
import { capitalize } from '../../utils/helpers';
import { pokemonImage, spriteFallback } from '@/prefs/SpritePrefContext';

/**
 * The sprites-only browse: a tight wall of pixel sprites, always the classic
 * game rendition regardless of the image preference — that is the point of
 * this view.
 */
const DexSpritesGrid: React.FC<{ pokemon: PokemonSummary[] }> = ({ pokemon }) => (
  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1">
    {pokemon.map((p) => (
      <Link
        key={p.id}
        to={`/pokemon/${p.id}`}
        title={`#${p.id.toString().padStart(4, '0')} ${capitalize(p.name)}`}
        className="flex flex-col items-center rounded-md p-1 transition-colors hover:bg-muted"
      >
        <img
          src={pokemonImage(p.id, 'sprite')}
          alt={p.name}
          loading="lazy"
          onError={(e) => spriteFallback(e, p.id)}
          className="h-14 w-14 pixelated object-contain"
        />
        <span className="w-full truncate text-center text-[0.6875rem] text-muted-foreground">
          {capitalize(p.name)}
        </span>
      </Link>
    ))}
  </div>
);

export default DexSpritesGrid;
