import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SortDir } from '@masterpokedex/shared';
import { TableHead } from '@/components/ui/table';
import HelpTip from './HelpTip';
import { cn } from '@/lib/utils';

type SortableHeadProps<F extends string> = {
  field: F;
  label: string;
  /** The column currently sorted on, or anything else when this one is idle. */
  sort: string | null;
  dir: SortDir;
  onSort: (field: F) => void;
  alignRight?: boolean;
  help?: React.ReactNode;
  /** HelpTip title when the abbreviated column label shouldn't be it. */
  helpTitle?: string;
  /** Width class(es) so columns keep their size across sort flips. */
  className?: string;
};

/** A pokemondb-style clickable column header: click sorts, the arrow shows direction. */
function SortableHead<F extends string>({
  field,
  label,
  sort,
  dir,
  onSort,
  alignRight,
  help,
  helpTitle,
  className,
}: SortableHeadProps<F>) {
  return (
    <TableHead
      onClick={() => onSort(field)}
      aria-sort={sort === field ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
      className={cn(
        'cursor-pointer select-none whitespace-nowrap hover:text-foreground',
        alignRight && 'text-right',
        className,
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {help && <HelpTip title={helpTitle ?? label}>{help}</HelpTip>}
        {/* Both arrows render always (constant width, no layout jump between
            sort states); the active direction is the bold, full-colour one. */}
        <span className="flex flex-col" aria-hidden="true">
          <ChevronUp
            className={cn(
              '-mb-1 h-3 w-3',
              sort === field && dir === 'asc' ? 'stroke-[3] text-foreground' : 'text-muted-foreground/40',
            )}
          />
          <ChevronDown
            className={cn(
              '-mt-1 h-3 w-3',
              sort === field && dir === 'desc' ? 'stroke-[3] text-foreground' : 'text-muted-foreground/40',
            )}
          />
        </span>
      </span>
    </TableHead>
  );
}

export default SortableHead;
