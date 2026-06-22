import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';
import { getAuth } from '../lib/auth';
import { POKEMON_COLUMNS, toPokemonSummary, type PokemonRow } from '../lib/serialize';

function pokemonIdParam(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw ApiError.badRequest('pokemonId must be a positive integer');
  return id;
}

export const favoritesRoutes = new Hono<AppBindings>()
  /**
   * GET /v1/me/favorites — newest first. Unpaginated on purpose: a favourites
   * list is bounded by human attention, not by the size of the dex.
   */
  .get('/', async (c) => {
    const { userId } = getAuth(c);
    const rows = (await c.var.db.execute(sql`
      SELECT ${sql.raw(POKEMON_COLUMNS)}
      FROM public.favorites fav
      JOIN dex.pokemon p ON p.id = fav.pokemon_id
      WHERE fav.trainer_id = ${userId}
      ORDER BY fav.created_at DESC
    `)) as unknown as PokemonRow[];
    return c.json({ items: rows.map(toPokemonSummary), nextCursor: null });
  })

  /** PUT /v1/me/favorites/:pokemonId — idempotent. */
  .put('/:pokemonId', async (c) => {
    const { userId } = getAuth(c);
    const pokemonId = pokemonIdParam(c.req.param('pokemonId'));
    await c.var.db.execute(sql`
      INSERT INTO public.favorites (trainer_id, pokemon_id)
      VALUES (${userId}, ${pokemonId})
      ON CONFLICT (trainer_id, pokemon_id) DO NOTHING
    `);
    return c.body(null, 204);
  })

  /** DELETE /v1/me/favorites/:pokemonId — idempotent. */
  .delete('/:pokemonId', async (c) => {
    const { userId } = getAuth(c);
    const pokemonId = pokemonIdParam(c.req.param('pokemonId'));
    await c.var.db.execute(sql`
      DELETE FROM public.favorites WHERE trainer_id = ${userId} AND pokemon_id = ${pokemonId}
    `);
    return c.body(null, 204);
  });
