import React from 'react';
import { POKEMON_TYPES } from '@masterpokedex/shared';
import { cn } from '@/lib/utils';
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedType('all')}
          aria-pressed={selectedType === 'all'}
          className={cn(
            'inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted/70',
            selectedType === 'all' && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
          All Types
        </button>
        {POKEMON_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            aria-pressed={selectedType === type}
            className={cn(
              'rounded-full transition-shadow',
              selectedType === type && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
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
