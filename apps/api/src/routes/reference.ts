import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { PokemonTypeSchema } from '@masterpokedex/shared';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';

export const referenceRoutes = new Hono<AppBindings>()
  .get('/types', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT
        t.id,
        t.name,
        (SELECT count(*) FROM dex.pokemon_types pt
         JOIN dex.pokemon p ON p.id = pt.pokemon_id AND p.is_default
         WHERE pt.type_id = t.id)::int AS "pokemonCount"
      FROM dex.types t
      ORDER BY t.id
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /** Full offensive and defensive profile for one type, from the 324-row chart. */
  .get('/types/:name', async (c) => {
    const parsed = PokemonTypeSchema.safeParse(c.req.param('name').toLowerCase());
    if (!parsed.success) throw ApiError.notFound('Type');
    const name = parsed.data;

    const [row] = (await c.var.db.execute(sql`
      SELECT
        t.id,
        t.name,
        (SELECT count(*) FROM dex.pokemon_types pt
         JOIN dex.pokemon p ON p.id = pt.pokemon_id AND p.is_default
         WHERE pt.type_id = t.id)::int AS "pokemonCount",
        ARRAY(SELECT tgt.name FROM dex.type_efficacy te JOIN dex.types tgt ON tgt.id = te.target_type_id
              WHERE te.damage_type_id = t.id AND te.damage_factor = 200 ORDER BY tgt.name) AS "doubleDamageTo",
        ARRAY(SELECT tgt.name FROM dex.type_efficacy te JOIN dex.types tgt ON tgt.id = te.target_type_id
              WHERE te.damage_type_id = t.id AND te.damage_factor = 50 ORDER BY tgt.name) AS "halfDamageTo",
        ARRAY(SELECT tgt.name FROM dex.type_efficacy te JOIN dex.types tgt ON tgt.id = te.target_type_id
              WHERE te.damage_type_id = t.id AND te.damage_factor = 0 ORDER BY tgt.name) AS "noDamageTo",
        ARRAY(SELECT atk.name FROM dex.type_efficacy te JOIN dex.types atk ON atk.id = te.damage_type_id
              WHERE te.target_type_id = t.id AND te.damage_factor = 200 ORDER BY atk.name) AS "doubleDamageFrom",
        ARRAY(SELECT atk.name FROM dex.type_efficacy te JOIN dex.types atk ON atk.id = te.damage_type_id
              WHERE te.target_type_id = t.id AND te.damage_factor = 50 ORDER BY atk.name) AS "halfDamageFrom",
        ARRAY(SELECT atk.name FROM dex.type_efficacy te JOIN dex.types atk ON atk.id = te.damage_type_id
              WHERE te.target_type_id = t.id AND te.damage_factor = 0 ORDER BY atk.name) AS "noDamageFrom"
      FROM dex.types t
      WHERE t.name = ${name}
    `)) as unknown as unknown[];

    if (!row) throw ApiError.notFound('Type');
    return c.json(row);
  })

  /** GET /v1/items?category=&q= — backs the trainer inventory item picker. */
  .get('/items', async (c) => {
    const category = c.req.query('category');
    const q = c.req.query('q');
    const limit = Math.min(Number(c.req.query('limit') ?? 200) || 200, 500);

    const predicates = [sql`true`];
    if (category) predicates.push(sql`ic.name = ${category}`);
    if (q) predicates.push(sql`i.display_name ILIKE ${`%${q}%`}`);

    const rows = await c.var.db.execute(sql`
      SELECT
        i.id,
        i.name,
        i.display_name AS "displayName",
        ic.name        AS category,
        i.short_effect AS effect,
        i.sprite,
        i.cost
      FROM dex.items i
      JOIN dex.item_categories ic ON ic.id = i.category_id
      WHERE ${sql.join(predicates, sql` AND `)}
      ORDER BY i.display_name
      LIMIT ${limit}
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  .get('/item-categories', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT ic.id, ic.name, ic.display_name AS "displayName", ic.pocket,
             (SELECT count(*) FROM dex.items i WHERE i.category_id = ic.id)::int AS "itemCount"
      FROM dex.item_categories ic
      ORDER BY ic.display_name
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /** GET /v1/pokemon/:id/moves lives here to keep the pokemon router focused. */
  .get('/pokemon/:id/moves', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) throw ApiError.badRequest('Pokémon id must be an integer');

    const rows = await c.var.db.execute(sql`
      SELECT
        m.display_name  AS name,
        t.name          AS type,
        m.damage_class  AS "damageClass",
        m.power,
        m.pp,
        m.accuracy,
        m.priority,
        pm.learn_method AS "learnMethod",
        pm.level        AS "levelLearnedAt"
      FROM dex.pokemon_moves pm
      JOIN dex.moves m ON m.id = pm.move_id
      JOIN dex.types t ON t.id = m.type_id
      WHERE pm.pokemon_id = ${id}
      ORDER BY
        CASE pm.learn_method WHEN 'level-up' THEN 0 WHEN 'machine' THEN 1 WHEN 'egg' THEN 2 ELSE 3 END,
        pm.level NULLS LAST,
        m.display_name
    `);
    return c.json({ items: rows as unknown as unknown[] });
  });
