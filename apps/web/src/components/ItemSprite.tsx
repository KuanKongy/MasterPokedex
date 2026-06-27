import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { resolveAsset } from '@/lib/assets';
import { cn } from '@/lib/utils';
import itemSprites from '@/data/item-sprites.json';
import pokespriteItems from '@/data/pokesprite-items.json';

/**
 * An item sprite that can never show the browser's broken-image glyph.
 *
 * Four sources, tried in order, because no single one covers the dex:
 *
 *  0. PokeAPI — what `dex.items.sprite` generates from the identifier. Covers
 *     862 of 2,221 items and is the look the catalogue already has.
 *  1. Our own, self-hosted under public/items: Bulbapedia's bag icons for
 *     everything PokeAPI is missing, plus the species artwork standing in for
 *     Legends: Arceus crafting materials — "Aipom Hair" wears an Aipom,
 *     because no free repository draws the hair. Built by
 *     `scripts/fetch-item-sprites.mjs`.
 *  2. msikma/pokesprite, which still owns the generic TM/HM discs.
 *  3. The package icon — down to seven items, all of them LGPE bag *pockets*
 *     rather than things you can hold.
 */
const POKESPRITE_BASE = 'https://raw.githubusercontent.com/msikma/pokesprite/master/items';

const ITEM_MAP = pokespriteItems as Record<string, string>;
const LOCAL_MAP = itemSprites as Record<string, string>;

/** Entries are either a public/ path or, for the materials, an absolute URL. */
function localFor(name: string | undefined): string | undefined {
  if (!name) return undefined;
  const path = LOCAL_MAP[name];
  return path ? resolveAsset(path) : undefined;
}

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
  const [stage, setStage] = useState(0);

  const local = localFor(itemName);
  const pokesprite = pokespritePathFor(itemName);
  // `stage` is the first source still worth trying; the chain is sparse, so
  // resolve forward to the next one that exists. A 404 advances past whatever
  // is on screen rather than re-requesting it.
  const chain = [src, local, pokesprite && `${POKESPRITE_BASE}/${pokesprite}.png`];
  const index = chain.findIndex((entry, i) => i >= stage && Boolean(entry));
  const url = index === -1 ? null : chain[index];

  if (!url) {
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
      onError={() => setStage(index + 1)}
      className={cn('pixelated object-contain', className)}
    />
  );
};

export default ItemSprite;
