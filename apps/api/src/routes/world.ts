import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { rarityFromChance } from '@masterpokedex/shared';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';

export const worldRoutes = new Hono<AppBindings>()
  /** GET /v1/regions */
  .get('/regions', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT
        r.id,
        r.name,
        r.display_name AS "displayName",
        r.description,
        r.map_image    AS "mapImage",
        (SELECT count(*) FROM dex.locations l WHERE l.region_id = r.id)::int AS "locationCount"
      FROM dex.regions r
      ORDER BY r.id
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /**
   * GET /v1/regions/:id/locations
   *
   * `mapX`/`mapY` come from dex.location_meta — our own curated table, since
   * PokeAPI carries no coordinates. Locations without them still return, with
   * nulls, so the list stays complete even where the map pins do not.
   */
  .get('/regions/:id/locations', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) throw ApiError.badRequest('Region id must be an integer');

    const rows = await c.var.db.execute(sql`
      SELECT
        l.id,
        l.name,
        l.display_name  AS "displayName",
        l.region_id     AS "regionId",
        r.display_name  AS "regionName",
        lm.map_x        AS "mapX",
        lm.map_y        AS "mapY",
        lm.image,
        lm.description,
        lm.kind,
        (SELECT count(*) FROM dex.location_areas la WHERE la.location_id = l.id)::int AS "areaCount"
      FROM dex.locations l
      JOIN dex.regions r ON r.id = l.region_id
      LEFT JOIN dex.location_meta lm ON lm.location_id = l.id
      WHERE l.region_id = ${id}
      ORDER BY (lm.map_x IS NULL), l.display_name
    `);

    return c.json({ items: rows as unknown as unknown[] });
  })

  /** GET /v1/locations/:id — areas, their encounter tables, and map neighbours. */
  .get('/locations/:id', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) throw ApiError.badRequest('Location id must be an integer');

    const [location] = (await c.var.db.execute(sql`
      SELECT
        l.id,
        l.name,
        l.display_name AS "displayName",
        l.region_id    AS "regionId",
        r.display_name AS "regionName",
        lm.map_x       AS "mapX",
        lm.map_y       AS "mapY",
        lm.image,
        lm.description,
        lm.kind,
        COALESCE(lm.neighbor_ids, '{}') AS "neighborIds"
      FROM dex.locations l
      LEFT JOIN dex.regions r ON r.id = l.region_id
      LEFT JOIN dex.location_meta lm ON lm.location_id = l.id
      WHERE l.id = ${id}
    `)) as unknown as { id: number; neighborIds: number[] }[];

    if (!location) throw ApiError.notFound('Location');

    const [areaRows, neighbours] = await Promise.all([
      c.var.db.execute(sql`
        SELECT
          la.id            AS "areaId",
          la.name          AS "areaName",
          la.display_name  AS "areaDisplayName",
          e.pokemon_id     AS "pokemonId",
          p.name           AS "pokemonName",
          p.sprite,
          COALESCE((
            SELECT array_agg(t.name ORDER BY pt.slot)
            FROM dex.pokemon_types pt
            JOIN dex.types t ON t.id = pt.type_id
            WHERE pt.pokemon_id = p.id
          ), '{}')         AS types,
          em.name          AS method,
          e.rarity         AS chance,
          e.min_level      AS "minLevel",
          e.max_level      AS "maxLevel",
          e.conditions,
          e.versions
        FROM dex.location_areas la
        LEFT JOIN dex.encounters e ON e.location_area_id = la.id
        LEFT JOIN dex.pokemon p ON p.id = e.pokemon_id
        LEFT JOIN dex.encounter_methods em ON em.id = e.method_id
        WHERE la.location_id = ${id}
        ORDER BY la.display_name, e.rarity DESC NULLS LAST
      `),
      // Same array-binding caveat as the pokemon filter: Drizzle expands a JS
      // array into separate placeholders, so an explicit IN-list is required
      // (and the empty case has to short-circuit — `IN ()` is a syntax error).
      (location.neighborIds ?? []).length === 0
        ? Promise.resolve([])
        : c.var.db.execute(sql`
            SELECT id, name, display_name AS "displayName"
            FROM dex.locations
            WHERE id IN (${sql.join(
              location.neighborIds.map((neighborId) => sql`${neighborId}`),
              sql`, `,
            )})
            ORDER BY display_name
          `),
    ]);

    // One flat join, grouped here rather than issuing a query per area.
    type AreaRow = Record<string, unknown> & {
      areaId: number;
      areaDisplayName: string;
      areaName: string;
      pokemonId: number | null;
      chance: number | null;
    };
    const areas = new Map<number, { id: number; name: string; displayName: string; encounters: unknown[] }>();
    for (const row of areaRows as unknown as AreaRow[]) {
      let area = areas.get(row.areaId);
      if (!area) {
        area = { id: row.areaId, name: row.areaName, displayName: row.areaDisplayName, encounters: [] };
        areas.set(row.areaId, area);
      }
      if (row.pokemonId === null) continue;
      const { areaId: _a, areaName: _n, areaDisplayName: _d, ...encounter } = row;
      area.encounters.push({ ...encounter, rarity: rarityFromChance(row.chance ?? 0) });
    }

    return c.json({ ...location, areas: [...areas.values()], neighbors: neighbours as unknown as unknown[] });
  });
