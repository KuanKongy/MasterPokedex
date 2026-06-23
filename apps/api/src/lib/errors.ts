import type { Context } from 'hono';
import type { ErrorCode } from '@masterpokedex/shared';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  bad_request: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  unprocessable: 422,
  rate_limited: 429,
  internal: 500,
  upstream_unavailable: 503,
  team_full: 409,
  username_taken: 409,
  already_friends: 409,
  friend_request_exists: 409,
  cannot_friend_self: 400,
  insufficient_quantity: 409,
};

/**
 * Every failure path in the reference backend ended `.catch(() => false)` and
 * every route answered `{ success: false }` with HTTP 500, so a caller could
 * not tell a missing row from a dropped connection. Errors here carry a stable
 * code, the right status, and optional structured details.
 */
export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  get status(): number {
    return STATUS_BY_CODE[this.code] ?? 500;
  }

  static notFound(what: string) {
    return new ApiError('not_found', `${what} not found`);
  }

  static unauthorized(message = 'Authentication required') {
    return new ApiError('unauthorized', message);
  }

  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError('forbidden', message);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError('bad_request', message, details);
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Route params that reach a uuid column must be shaped like one, or Postgres
 * answers 22P02 and the client sees an opaque 500 instead of a 400.
 */
export function assertUuid(value: string, what: string): string {
  if (!UUID_RE.test(value)) throw ApiError.badRequest(`${what} must be a UUID`);
  return value;
}

/** Postgres error codes raised by the constraints and triggers in the schema. */
const PG_CONSTRAINT_ERRORS: Record<string, { code: ErrorCode; message: string }> = {
  trainers_username_idx: { code: 'username_taken', message: 'That username is already taken' },
  teams_trainer_name_idx: { code: 'conflict', message: 'You already have a team with that name' },
  friendships_pair_idx: {
    code: 'friend_request_exists',
    message: 'A friendship or request already exists between these trainers',
  },
  trainer_items_quantity_nonneg: {
    code: 'insufficient_quantity',
    message: 'You do not have enough of that item',
  },
};

function fromDatabaseError(err: unknown): ApiError | null {
  if (typeof err !== 'object' || err === null) return null;

  // Drizzle wraps the driver error in DrizzleQueryError; the Postgres error
  // code and constraint live on the innermost `cause`.
  let e = err as { code?: string; constraint_name?: string; constraint?: string; message?: string; cause?: unknown };
  for (let depth = 0; depth < 4 && !e.code && typeof e.cause === 'object' && e.cause !== null; depth += 1) {
    e = e.cause as typeof e;
  }

  // Raised by the team-capacity trigger via RAISE EXCEPTION ... ERRCODE.
  if (e.code === 'P0001' && e.message?.includes('team_full')) {
    return new ApiError('team_full', 'That team is already at capacity');
  }

  const constraint = e.constraint_name ?? e.constraint;
  if ((e.code === '23505' || e.code === '23514') && constraint) {
    const known = PG_CONSTRAINT_ERRORS[constraint];
    if (known) return new ApiError(known.code, known.message);
  }

  if (e.code === '23503') {
    return new ApiError('bad_request', 'Referenced record does not exist');
  }

  return null;
}

export function errorHandler(err: Error, c: Context) {
  if (err instanceof ApiError) {
    return c.json({ error: { code: err.code, message: err.message, details: err.details } }, err.status as 400);
  }

  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: 'bad_request' satisfies ErrorCode,
          message: 'Request validation failed',
          details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
        },
      },
      400,
    );
  }

  const mapped = fromDatabaseError(err);
  if (mapped) {
    return c.json({ error: { code: mapped.code, message: mapped.message } }, mapped.status as 400);
  }

  if (err instanceof HTTPException) {
    return c.json({ error: { code: 'bad_request' satisfies ErrorCode, message: err.message } }, err.status);
  }

  // Genuinely unexpected: log the detail server-side, tell the client nothing.
  console.error('[unhandled]', err);
  return c.json(
    { error: { code: 'internal' satisfies ErrorCode, message: 'Something went wrong on our end' } },
    500,
  );
}
