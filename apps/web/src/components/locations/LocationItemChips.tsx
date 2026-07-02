import React from 'react';
import { Link } from 'react-router-dom';
import { EyeOff } from 'lucide-react';
import type { LocationItem } from '@masterpokedex/shared';
import ItemSprite from '../ItemSprite';
import { HoverTip } from '../HelpTip';
import { cn } from '@/lib/utils';

/**
 * The field pickups a location holds, as hoverable chips: the popover gives
 * the where-note ("on the ledge behind the Trainer Tips sign (hidden)") and,
 * when the label resolved to a dex item, a link to its page. Hidden items
 * wear a crossed eye, which is the whole point of surfacing them.
 */
const LocationItemChips: React.FC<{ items: LocationItem[]; compact?: boolean; limit?: number }> = ({
  items,
  compact,
  limit,
}) => {
  const shown = limit ? items.slice(0, limit) : items;
  const rest = items.length - shown.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((item) => (
        <HoverTip
          key={item.label}
          title={item.itemDisplayName ?? item.label}
          trigger={
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border py-1 transition-colors hover:border-pokebrand-extra/60',
                compact ? 'px-2 text-xs' : 'px-2.5 text-sm',
              )}
            >
              <ItemSprite
                src={item.sprite}
                itemName={item.itemName ?? undefined}
                alt=""
                className={compact ? 'h-4 w-4' : 'h-5 w-5'}
              />
              {item.itemDisplayName ?? item.label}
              {item.spots > 1 && <span className="text-muted-foreground">×{item.spots}</span>}
              {item.hidden && <EyeOff className="h-3 w-3 text-muted-foreground" />}
            </span>
          }
        >
          {item.note ?? `Found in ${item.spots} spot${item.spots === 1 ? '' : 's'} here.`}
          {item.hidden && (
            <span className="mt-1 block text-xs">
              At least one of them is a hidden item, invisible on the ground.
            </span>
          )}
          {item.itemName && (
            <Link
              to={`/items/${item.itemName}`}
              className="mt-2 inline-block text-xs font-medium underline"
            >
              Open {item.itemDisplayName ?? item.label} →
            </Link>
          )}
        </HoverTip>
      ))}
      {rest > 0 && <span className="self-center text-xs text-muted-foreground">+{rest} more</span>}
    </div>
  );
};

export default LocationItemChips;
