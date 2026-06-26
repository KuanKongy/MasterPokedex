import React, { useState } from 'react';
import { Package } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * An item sprite that can never show the browser's broken-image glyph. The
 * dex generates a sprite URL for every item, but the PokeAPI sprite repo has
 * no image for a large share of them — those get a neutral package icon of
 * the same footprint.
 */
const ItemSprite: React.FC<{ src: string | null; alt: string; className?: string }> = ({
  src,
  alt,
  className = 'w-10 h-10',
}) => {
  const [broken, setBroken] = useState(false);

  if (!src || broken) {
    return (
      <span className={cn('flex items-center justify-center rounded-md bg-muted text-muted-foreground', className)}>
        <Package className="h-1/2 w-1/2" aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setBroken(true)}
      className={cn('pixelated object-contain', className)}
    />
  );
};

export default ItemSprite;
