import React from 'react';
import { ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react';
import type { SortDir } from '@masterpokedex/shared';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type SortPickerOption<F extends string> = {
  value: F;
  /** What the closed box and the open list show. */
  label: string;
  /** Optional second line in the open list, hidden in the closed trigger. */
  help?: string;
};

type SortPickerProps<F extends string> = {
  options: ReadonlyArray<SortPickerOption<F>>;
  value: F;
  dir: SortDir;
  /** A new column was picked; the page applies its own default direction. */
  onFieldChange: (field: F) => void;
  onDirChange: (dir: SortDir) => void;
  className?: string;
  ariaLabel?: string;
};

/**
 * The one sort control for list pages: a single bordered box in the old
 * Pokédex dropdown's look, with the direction arrow where its sort glyph
 * used to sit — on the left, past a hairline, and clickable to flip. It
 * replaces the Pokédex's bare dropdown (which had no direction control
 * outside the table headers) and the galleries' select-plus-button pair.
 * Help subtitles use the same .item-help convention as before: visible in
 * the open list, hidden in the closed trigger (Radix clones item children).
 */
function SortPicker<F extends string>({
  options,
  value,
  dir,
  onFieldChange,
  onDirChange,
  className,
  ariaLabel,
}: SortPickerProps<F>) {
  return (
    <div
      className={cn(
        'flex h-10 items-stretch overflow-hidden rounded-md border border-input bg-background',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onDirChange(dir === 'asc' ? 'desc' : 'asc')}
        aria-label={dir === 'asc' ? 'Sorted ascending; switch to descending' : 'Sorted descending; switch to ascending'}
        className="flex w-10 shrink-0 items-center justify-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {dir === 'asc' ? <ArrowUpNarrowWide className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
      </button>
      <div className="w-px self-stretch bg-border" aria-hidden="true" />
      <Select value={value} onValueChange={(next) => onFieldChange(next as F)}>
        <SelectTrigger
          aria-label={ariaLabel ?? 'Sort by'}
          className="h-full w-full rounded-none border-0 bg-transparent focus:ring-0 focus:ring-offset-0 [&_.item-help]:hidden"
        >
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.help ? (
                <span className="flex flex-col items-start">
                  {option.label}
                  <span className="item-help text-xs text-muted-foreground">{option.help}</span>
                </span>
              ) : (
                option.label
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default SortPicker;
