import type { SortDir } from '@masterpokedex/shared';

/**
 * Comparator matching the API's `ORDER BY column dir NULLS LAST, id dir`
 * exactly, so a list sorted in the browser lines up with what the server
 * would have returned: nulls sink to the bottom in BOTH directions, and the
 * id tiebreak follows the direction like the SQL's second ORDER BY key.
 */
export function makeComparator<T extends { id: number }>(
  get: (row: T) => string | number | null | undefined,
  dir: SortDir,
): (a: T, b: T) => number {
  const mul = dir === 'asc' ? 1 : -1;
  return (a, b) => {
    const av = get(a) ?? null;
    const bv = get(b) ?? null;
    if (av === null || bv === null) {
      if (av !== null) return -1;
      if (bv !== null) return 1;
    } else if (av !== bv) {
      return (
        (typeof av === 'string' ? av.localeCompare(bv as string) : av < (bv as number) ? -1 : 1) *
        mul
      );
    }
    return (a.id - b.id) * mul;
  };
}
