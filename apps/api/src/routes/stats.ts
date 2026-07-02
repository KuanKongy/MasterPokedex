import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import type { AppBindings } from '../types';

/**
 * The analytics the reference project built its whole assignment around, kept
 * because they are genuinely interesting, but as real GET endpoints with real
 * names instead of `POST /pokemonavg-bytype` returning `{data: ...}`.
 *
 * Where it used Oracle-only syntax, the Postgres equivalent is noted inline.
 */
export const statsRoutes = new Hono<AppBindings>()
  /** Average base stats per type. (was `GET /pokemonavg-bytype`) */
  .get('/types', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT
        t.name                              AS type,
        count(*)::int                       AS "pokemonCount",
        round(avg(p.hp))::int               AS "avgHp",
        round(avg(p.attack))::int           AS "avgAttack",
        round(avg(p.defense))::int          AS "avgDefense",
        round(avg(p.special_attack))::int   AS "avgSpecialAttack",
        round(avg(p.special_defense))::int  AS "avgSpecialDefense",
        round(avg(p.speed))::int            AS "avgSpeed",
        round(avg(p.total))::int            AS "avgTotal"
      FROM dex.pokemon_types pt
      JOIN dex.types t ON t.id = pt.type_id
      JOIN dex.pokemon p ON p.id = pt.pokemon_id AND p.is_default
      GROUP BY t.name
      ORDER BY avg(p.total) DESC
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /**
   * Types whose average total is at or below the global average — the
   * "weakest types" list. (was `GET /type-byweakpokemon`)
   */
  .get('/weak-types', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT t.name AS type, round(avg(p.total))::int AS "avgTotal", count(*)::int AS "pokemonCount"
      FROM dex.pokemon_types pt
      JOIN dex.types t ON t.id = pt.type_id
      JOIN dex.pokemon p ON p.id = pt.pokemon_id AND p.is_default
      GROUP BY t.name
      HAVING avg(p.total) <= (SELECT avg(total) FROM dex.pokemon WHERE is_default)
      ORDER BY avg(p.total) ASC
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /** Pokémon and encounter counts per region. (was `GET /pokemoncount-byregion`) */
  .get('/regions', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT
        r.id,
        r.display_name                       AS region,
        count(DISTINCT e.pokemon_id)::int    AS "uniquePokemon",
        count(e.id)::int                     AS "encounterCount",
        count(DISTINCT l.id)::int            AS "locationCount"
      FROM dex.regions r
      LEFT JOIN dex.locations l ON l.region_id = r.id
      LEFT JOIN dex.location_areas la ON la.location_id = l.id
      LEFT JOIN dex.encounters e ON e.location_area_id = la.id
      GROUP BY r.id, r.display_name
      ORDER BY count(DISTINCT e.pokemon_id) DESC
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /**
   * Pokémon findable in more than one location. (was `GET /pokemon-byoneroute`)
   * The reference version compared against 1 because it only had 12 encounter
   * rows in total; with 55k real rows the interesting threshold is a parameter.
   */
  .get('/multi-location', async (c) => {
    const min = Math.max(2, Math.min(Number(c.req.query('min') ?? 20) || 20, 200));
    const rows = await c.var.db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.sprite,
        count(DISTINCT l.id)::int AS "locationCount"
      FROM dex.encounters e
      JOIN dex.pokemon p ON p.id = e.pokemon_id
      JOIN dex.location_areas la ON la.id = e.location_area_id
      JOIN dex.locations l ON l.id = la.location_id
      GROUP BY p.id, p.name, p.sprite
      HAVING count(DISTINCT l.id) >= ${min}
      ORDER BY count(DISTINCT l.id) DESC, p.id
      LIMIT 100
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /**
   * Pokémon that can learn a move of every damage class.
   * (was `GET /pokemon-byallmovecategory`)
   *
   * This is relational division. Oracle spelled the set difference `MINUS`;
   * Postgres uses `EXCEPT`, and the shape is otherwise identical.
   */
  .get('/all-damage-classes', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT p.id, p.name, p.sprite, p.total
      FROM dex.pokemon p
      WHERE p.is_default
        AND NOT EXISTS (
          SELECT DISTINCT m.damage_class FROM dex.moves m
          EXCEPT
          SELECT DISTINCT m2.damage_class
          FROM dex.pokemon_moves pm
          JOIN dex.moves m2 ON m2.id = pm.move_id
          WHERE pm.pokemon_id = p.id
        )
      ORDER BY p.total DESC
      LIMIT 100
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /** Trainer count per region. (was `GET /trainercount-byregion`) */
  .get('/trainers-by-region', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT
        r.id,
        r.display_name AS region,
        count(tr.id)::int AS "trainerCount"
      FROM dex.regions r
      LEFT JOIN public.trainers tr ON tr.region_id = r.id AND tr.is_public
      GROUP BY r.id, r.display_name
      ORDER BY count(tr.id) DESC, r.id
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /**
   * Trainers owning a Pokémon of every growth rate.
   * (was `GET /trainer-byalllevelgroup` — division via MINUS, now EXCEPT)
   */
  .get('/all-growth-rates', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT
        tr.id,
        tr.username,
        tr.display_name AS "displayName",
        tr.avatar_url   AS "avatarUrl",
        (SELECT count(*) FROM public.caught_pokemon cp WHERE cp.trainer_id = tr.id)::int AS "caughtCount"
      FROM public.trainers tr
      WHERE tr.is_public
        AND tr.show_teams
        AND NOT EXISTS (
          SELECT gr.id FROM dex.growth_rates gr
          EXCEPT
          SELECT s.growth_rate_id
          FROM public.caught_pokemon cp
          JOIN dex.pokemon p ON p.id = cp.pokemon_id
          JOIN dex.species s ON s.id = p.species_id
          WHERE cp.trainer_id = tr.id
        )
      ORDER BY tr.username
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /**
   * Trainers with a team in every category — party, box and showcase.
   * (was `GET /trainer-byallcollectioncategory`)
   */
  .get('/all-team-categories', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT
        tr.id,
        tr.username,
        tr.display_name AS "displayName",
        tr.avatar_url   AS "avatarUrl",
        (SELECT count(*) FROM public.teams tm WHERE tm.trainer_id = tr.id)::int AS "teamCount"
      FROM public.trainers tr
      WHERE tr.is_public
        AND tr.show_teams
        AND NOT EXISTS (
          SELECT tc.slug FROM public.team_categories tc
          EXCEPT
          SELECT tm.category FROM public.teams tm WHERE tm.trainer_id = tr.id
        )
      ORDER BY tr.username
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /**
   * Trainers holding an item from every bag pocket.
   * (was `GET /trainer-byallitemcategory`, over the far coarser Oracle
   * `item_category`; pockets are the closest modern equivalent)
   */
  .get('/all-item-pockets', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT
        tr.id,
        tr.username,
        tr.display_name AS "displayName",
        tr.avatar_url   AS "avatarUrl",
        (SELECT count(*) FROM public.trainer_items ti WHERE ti.trainer_id = tr.id)::int AS "itemCount"
      FROM public.trainers tr
      WHERE tr.is_public
        AND tr.show_bag
        AND NOT EXISTS (
          SELECT DISTINCT ic.pocket FROM dex.item_categories ic WHERE ic.pocket IS NOT NULL
          EXCEPT
          SELECT DISTINCT ic2.pocket
          FROM public.trainer_items ti
          JOIN dex.items i ON i.id = ti.item_id
          JOIN dex.item_categories ic2 ON ic2.id = i.category_id
          WHERE ti.trainer_id = tr.id
        )
      ORDER BY tr.username
    `);
    return c.json({ items: rows as unknown as unknown[] });
  });
