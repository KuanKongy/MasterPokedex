import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { Context, MiddlewareHandler } from 'hono';
import { env } from '../env';
import { ApiError } from './errors';
import type { AppBindings } from '../types';

/**
 * Supabase JWT verification.
 *
 * New projects publish asymmetric signing keys (ES256/RS256) at
 * `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`; verification is local and
 * needs no shared secret. `createRemoteJWKSet` handles fetching and caching
 * the keys, including refetching on an unknown `kid` after a rotation.
 *
 * `SUPABASE_JWT_SECRET` exists only for legacy HS256 projects. When it is set
 * we verify against it instead — but leave it unset on any project created
 * after the 2025 signing-keys rollout.
 *
 * The middleware only authenticates. Authorization happens in the routes:
 * every query is scoped by the verified user id, because the API's database
 * role bypasses RLS (the policies remain as defence in depth for any other
 * path to Postgres).
 */

export type AuthContext = { userId: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let remoteKeys: ReturnType<typeof createRemoteJWKSet> | null = null;

function jwks() {
  if (!remoteKeys) {
    remoteKeys = createRemoteJWKSet(new URL(`${env().SUPABASE_URL}/auth/v1/.well-known/jwks.json`));
  }
  return remoteKeys;
}

/**
 * Claim checks beyond the signature. `jose` already enforced `exp`/`nbf`,
 * issuer and audience; what is left is making sure this is a signed-in user
 * token (not `anon`, not a service key) carrying a usable user id.
 */
export function assertAuthClaims(payload: JWTPayload): AuthContext {
  if (payload.role !== 'authenticated') {
    throw ApiError.unauthorized('Token does not belong to an authenticated user');
  }
  if (typeof payload.sub !== 'string' || !UUID_RE.test(payload.sub)) {
    throw ApiError.unauthorized('Token is missing a valid subject');
  }
  return { userId: payload.sub };
}

export async function verifyToken(token: string): Promise<AuthContext> {
  const issuer = `${env().SUPABASE_URL}/auth/v1`;
  const secret = env().SUPABASE_JWT_SECRET;

  let payload: JWTPayload;
  try {
    ({ payload } = secret
      ? await jwtVerify(token, new TextEncoder().encode(secret), { issuer, audience: 'authenticated' })
      : await jwtVerify(token, jwks(), { issuer, audience: 'authenticated' }));
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized('Invalid or expired token');
  }

  return assertAuthClaims(payload);
}

async function fromHeader(header: string | undefined): Promise<AuthContext | null> {
  if (!header) return null;
  const [scheme, token, ...rest] = header.split(' ');
  if (scheme !== 'Bearer' || !token || rest.length > 0) {
    throw ApiError.unauthorized('Authorization header must be "Bearer <token>"');
  }
  return verifyToken(token);
}

/** 401s unless a valid token is presented; routes then read `getAuth(c)`. */
export const requireAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const auth = await fromHeader(c.req.header('Authorization'));
  if (!auth) throw ApiError.unauthorized();
  c.set('auth', auth);
  await next();
};

/**
 * Continues anonymously when no Authorization header is present, but an
 * invalid token still 401s — a caller who sent credentials deserves to know
 * they were rejected rather than silently seeing the logged-out view.
 */
export const optionalAuth: MiddlewareHandler<AppBindings> = async (c, next) => {
  const auth = await fromHeader(c.req.header('Authorization'));
  if (auth) c.set('auth', auth);
  await next();
};

/** For handlers behind `requireAuth`, where the context is guaranteed. */
export function getAuth(c: Context<AppBindings>): AuthContext {
  const auth = c.var.auth;
  if (!auth) throw ApiError.unauthorized();
  return auth;
}
