import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { sql } from 'drizzle-orm';
import { createDb } from '@masterpokedex/db';
import { env } from './env';
import { errorHandler } from './lib/errors';
import type { AppBindings } from './types';
import { optionalAuth, requireAuth } from './lib/auth';
import { bagRoutes } from './routes/bag';
import { favoritesRoutes } from './routes/favorites';
import { friendsRoutes } from './routes/friends';
import { meRoutes } from './routes/me';
import { pokemonRoutes } from './routes/pokemon';
import { referenceRoutes } from './routes/reference';
import { statsRoutes } from './routes/stats';
import { caughtRoutes, teamsRoutes } from './routes/teams';
import { trainersRoutes } from './routes/trainers';
import { worldRoutes } from './routes/world';

export type { AppBindings };

const db = createDb();

const app = new Hono<AppBindings>()
  .use('*', logger())
  .use('*', secureHeaders())
  .use('*', async (c, next) => {
    c.set('db', db);
    await next();
  })
  .use(
    '/v1/*',
    cors({
      origin: env().CORS_ORIGINS,
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Authorization', 'Content-Type'],
      maxAge: 86400,
      credentials: false,
    }),
  )
  /**
   * Also the keep-alive target. Supabase pauses a free project after seven days
   * with no database activity, so this deliberately touches the database rather
   * than answering from memory — a cron that only pinged the process would let
   * the database sleep and the demo link die.
   */
  .get('/health', async (c) => {
    const started = Date.now();
    try {
      await c.var.db.execute(sql`select 1`);
      return c.json({ ok: true, db: 'up', latencyMs: Date.now() - started, env: env().NODE_ENV });
    } catch (err) {
      console.error('[health] database unreachable', err);
      return c.json({ ok: false, db: 'down', latencyMs: Date.now() - started }, 503);
    }
  })
  /**
   * Reference data is immutable between seeds, so let browsers and any CDN in
   * front of the API hold on to it. This is the other half of undoing the old
   * 152-request-per-page-load behaviour.
   */
  .use('/v1/pokemon/*', async (c, next) => {
    await next();
    if (c.res.ok) c.res.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  })
  /**
   * Everything under /v1/me requires a verified Supabase JWT; the trainer
   * directory verifies one when offered (it shapes friendshipStatus and what
   * a private profile shows) but stays public without it. Personal responses
   * must never land in a shared cache.
   */
  .use('/v1/me', requireAuth)
  .use('/v1/me/*', requireAuth)
  .use('/v1/me/*', async (c, next) => {
    await next();
    c.res.headers.set('Cache-Control', 'private, no-store');
  })
  .use('/v1/trainers', optionalAuth)
  .use('/v1/trainers/*', optionalAuth)
  .route('/v1/pokemon', pokemonRoutes)
  .route('/v1', referenceRoutes)
  .route('/v1', worldRoutes)
  .route('/v1/stats', statsRoutes)
  .route('/v1/me', meRoutes)
  .route('/v1/me/teams', teamsRoutes)
  .route('/v1/me/pokemon', caughtRoutes)
  .route('/v1/me/items', bagRoutes)
  .route('/v1/me/friends', friendsRoutes)
  .route('/v1/me/favorites', favoritesRoutes)
  .route('/v1/trainers', trainersRoutes);

app.onError(errorHandler);
app.notFound((c) => c.json({ error: { code: 'not_found', message: 'No such endpoint' } }, 404));

export type AppType = typeof app;
export default app;
