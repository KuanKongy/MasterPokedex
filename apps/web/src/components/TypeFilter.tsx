import React from 'react';
import { POKEMON_TYPES } from '@masterpokedex/shared';
import { cn } from '@/lib/utils';
import { Badge } from './ui/badge';
import { TypeBadge } from './ui/type-badge';
import { LayoutGrid } from 'lucide-react';

interface TypeFilterProps {
  selectedType: string;
  setSelectedType: (type: string) => void;
}

/**
 * Every option is a real button with the same pill geometry — "All Types"
 * included, which used to be a taller, squarer shadcn Button that broke the
 * row's rhythm. Selection is one uniform ring across all options.
 */
const TypeFilter: React.FC<TypeFilterProps> = ({ selectedType, setSelectedType }) => {
  return (
    <div className="space-y-2">
      <h3 className="font-medium">Filter by Type</h3>
      <div className="flex flex-wrap items-center gap-2">
        {/* Structurally identical to the type options below (button wrapping a
            Badge), or line-height differences make it render a hair smaller. */}
        <button
          type="button"
          onClick={() => setSelectedType('all')}
          aria-pressed={selectedType === 'all'}
          className={cn(
            // inline-flex: an inline button inherits line-height and grows a
            // descender gap below the badge, which shifts the ring off-centre.
            'inline-flex rounded-full transition-shadow',
            selectedType === 'all' && 'ring-2 ring-primary',
          )}
        >
          <Badge className="gap-1 rounded-full border-transparent bg-muted text-foreground hover:bg-muted/70">
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            All Types
          </Badge>
        </button>
        {POKEMON_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            aria-pressed={selectedType === type}
            className={cn(
              'inline-flex rounded-full transition-shadow',
              selectedType === type && 'ring-2 ring-primary',
            )}
          >
            <TypeBadge type={type} icon />
          </button>
        ))}
      </div>
    </div>
  );
};

export default TypeFilter;
