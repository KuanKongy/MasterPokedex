import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import type { SortDir } from '@masterpokedex/shared';
import { TableHead } from '@/components/ui/table';
import { HoverTip } from './HelpTip';
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
  /** HoverTip title when the abbreviated column label shouldn't be it. */
  helpTitle?: string;
  /** Width class(es) so columns keep their size across sort flips. */
  className?: string;
};

/**
 * A pokemondb-style clickable column header. Two parallel arrows render
 * always (constant width, no layout jump between sort states) with the
 * active direction bold. The help text, when given, rides a plain hover on
 * the whole header, arrows included; a question-mark glyph before the
 * arrows read as clutter.
 */
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
  const content = (
    <span className="inline-flex items-center gap-1">
      {label}
      <span className="flex items-center -space-x-0.5" aria-hidden="true">
        <ArrowUp
          className={cn(
            'h-3 w-3',
            sort === field && dir === 'asc' ? 'stroke-[3] text-foreground' : 'text-muted-foreground/40',
          )}
        />
        <ArrowDown
          className={cn(
            'h-3 w-3',
            sort === field && dir === 'desc' ? 'stroke-[3] text-foreground' : 'text-muted-foreground/40',
          )}
        />
      </span>
    </span>
  );

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
      {help ? (
        <HoverTip clickThrough title={helpTitle ?? label} trigger={content}>
          {help}
        </HoverTip>
      ) : (
        content
      )}
    </TableHead>
  );
}

export default SortableHead;
