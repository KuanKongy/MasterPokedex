import { ApiError } from './errors';

/**
 * Keyset (not OFFSET) pagination. The cursor is an opaque base64url blob
 * holding the last row's sort value and id, so paging stays correct and cheap
 * even deep into a 1,300-row list with an arbitrary sort column.
 *
 * Opaque matters: clients must not be able to hand-craft one, because the
 * contents are interpolated into a WHERE clause as bound parameters and the
 * shape is an implementation detail we want to stay free to change.
 */
export type Cursor = {
  /** Value of the sort column on the last returned row. */
  v: string | number | null;
  /** Tie-breaker; always the primary key. */
  id: number;
};

export function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as Cursor).id !== 'number' ||
      !['string', 'number', 'object'].includes(typeof (parsed as Cursor).v)
    ) {
      throw new Error('shape');
    }
    return parsed as Cursor;
  } catch {
    throw ApiError.badRequest('Invalid cursor');
  }
}

/**
 * Fetches limit+1 rows so we can tell "there is a next page" from "this page
 * happened to be exactly full" without a second COUNT query.
 */
export function takePage<T>(rows: T[], limit: number, toCursor: (row: T) => Cursor) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const last = items.at(-1);
  return {
    items,
    nextCursor: hasMore && last ? encodeCursor(toCursor(last)) : null,
  };
}
