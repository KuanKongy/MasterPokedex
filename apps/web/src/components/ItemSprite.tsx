import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import pokespriteItems from '@/data/pokesprite-items.json';

/**
 * An item sprite that can never show the browser's broken-image glyph.
 * The dex generates a PokeAPI sprite URL for every item, but that repo is
 * missing a fair share of them — those fall back to msikma/pokesprite via
 * the vendored name→path map (built from the repo's items/ file tree, with
 * category transforms like ball/master → master-ball and nature mints keyed
 * by their raised stat). Numbered TMs/HMs use the generic disc art. Only
 * when everything misses (GO candies, star-named Dynamax crystals, gen 9
 * items no free sprite repo carries yet) does the package icon appear.
 */
const POKESPRITE_BASE = 'https://raw.githubusercontent.com/msikma/pokesprite/master/items';

const ITEM_MAP = pokespriteItems as Record<string, string>;

function pokespritePathFor(name: string | undefined): string | undefined {
  if (!name) return undefined;
  if (/^tm\d+$/.test(name) || /^tr\d+$/.test(name)) return ITEM_MAP.__tm__;
  if (/^hm\d+$/.test(name)) return ITEM_MAP.__hm__;
  return ITEM_MAP[name];
}

const ItemSprite: React.FC<{ src: string | null; itemName?: string; alt: string; className?: string }> = ({
  src,
  itemName,
  alt,
  className = 'w-10 h-10',
}) => {
  // 0 = primary (PokeAPI), 1 = pokesprite fallback, 2 = icon
  const [stage, setStage] = useState(0);

  const fallbackPath = pokespritePathFor(itemName);
  const url =
    stage === 0 && src ? src : stage <= 1 && fallbackPath ? `${POKESPRITE_BASE}/${fallbackPath}.png` : null;

  if (!url || stage >= 2) {
    return (
      <span className={cn('flex items-center justify-center rounded-md bg-muted text-muted-foreground', className)}>
        <Package className="h-1/2 w-1/2" aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setStage((s) => (s === 0 && fallbackPath ? 1 : 2))}
      className={cn('pixelated object-contain', className)}
    />
  );
};

export default ItemSprite;
