import { z } from 'zod';

/**
 * Cursor pagination. The cursor is an opaque, server-issued string; clients must
 * never construct or parse one. `nextCursor === null` means the end of the list.
 */
export const PageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().min(1).max(512).optional(),
});
export type PageQuery = z.infer<typeof PageQuerySchema>;

export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
    total: z.number().int().nonnegative().optional(),
  });
}

export type Page<T> = {
  items: T[];
  nextCursor: string | null;
  total?: number;
};

/**
 * Every non-2xx response from the API uses this envelope. The reference backend
 * returned `false` from every failed query and `{ success: false }` from every
 * route, so callers could not distinguish "not found" from "database is down".
 * `code` is a stable machine-readable string; `message` is for humans.
 */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const ERROR_CODES = [
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'unprocessable',
  'rate_limited',
  'internal',
  'upstream_unavailable',
  // domain-specific
  'team_full',
  'username_taken',
  'already_friends',
  'friend_request_exists',
  'cannot_friend_self',
  'insufficient_quantity',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export const SortDirSchema = z.enum(['asc', 'desc']).default('asc');
export type SortDir = z.infer<typeof SortDirSchema>;
