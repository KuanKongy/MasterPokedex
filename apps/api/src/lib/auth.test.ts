import { beforeAll, describe, expect, it } from 'vitest';
import { SignJWT } from 'jose';

/**
 * Exercises the HS256 verification path and the claim assertions without any
 * network: SUPABASE_JWT_SECRET is injected before the module (and its cached
 * env) is first imported. The JWKS path differs only in key material — the
 * claim checks after signature verification are identical and covered here.
 */

const SECRET = 'test-secret-key-for-auth-unit-tests-only';
const SUPABASE_URL = 'https://testproject.supabase.co';
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const USER_ID = '11111111-2222-4333-8444-555555555555';

type AuthModule = typeof import('./auth');
let auth: AuthModule;

beforeAll(async () => {
  process.env.SUPABASE_URL = SUPABASE_URL;
  process.env.SUPABASE_JWT_SECRET = SECRET;
  process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:55432/postgres';
  auth = await import('./auth');
});

function baseToken() {
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience('authenticated')
    .setSubject(USER_ID)
    .setIssuedAt()
    .setExpirationTime('5m');
}

const key = (secret: string) => new TextEncoder().encode(secret);

describe('verifyToken', () => {
  it('accepts a valid token and returns the user id', async () => {
    const token = await baseToken().sign(key(SECRET));
    await expect(auth.verifyToken(token)).resolves.toEqual({ userId: USER_ID });
  });

  it('rejects a token signed with a different key', async () => {
    const token = await baseToken().sign(key('some-other-secret-entirely'));
    await expect(auth.verifyToken(token)).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('rejects an expired token', async () => {
    const token = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setSubject(USER_ID)
      .setIssuedAt(Math.floor(Date.now() / 1000) - 600)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 300)
      .sign(key(SECRET));
    await expect(auth.verifyToken(token)).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('rejects the wrong issuer', async () => {
    const token = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('https://evil.example.com/auth/v1')
      .setAudience('authenticated')
      .setSubject(USER_ID)
      .setExpirationTime('5m')
      .sign(key(SECRET));
    await expect(auth.verifyToken(token)).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('rejects the wrong audience', async () => {
    const token = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer(ISSUER)
      .setAudience('anon')
      .setSubject(USER_ID)
      .setExpirationTime('5m')
      .sign(key(SECRET));
    await expect(auth.verifyToken(token)).rejects.toMatchObject({ code: 'unauthorized' });
  });

  it('rejects garbage', async () => {
    await expect(auth.verifyToken('not-a-jwt')).rejects.toMatchObject({ code: 'unauthorized' });
  });
});

describe('assertAuthClaims', () => {
  it('rejects the anon role even with a valid subject', () => {
    expect(() => auth.assertAuthClaims({ role: 'anon', sub: USER_ID })).toThrowError(
      /authenticated user/,
    );
  });

  it('rejects a service token with no subject', () => {
    expect(() => auth.assertAuthClaims({ role: 'authenticated' })).toThrowError(/subject/);
  });

  it('rejects a non-UUID subject', () => {
    expect(() => auth.assertAuthClaims({ role: 'authenticated', sub: 'admin' })).toThrowError(
      /subject/,
    );
  });

  it('accepts authenticated + UUID subject', () => {
    expect(auth.assertAuthClaims({ role: 'authenticated', sub: USER_ID })).toEqual({
      userId: USER_ID,
    });
  });
});
