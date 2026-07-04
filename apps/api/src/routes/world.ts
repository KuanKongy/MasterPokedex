import { Hono } from 'hono';
import { sql, type SQL } from 'drizzle-orm';
import { decodeLocationFilter, rarityFromChance, type LocationFilterCondition } from '@masterpokedex/shared';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';
import { decodeCursor, encodeCursor, keysetPredicate } from '../lib/pagination';

/** Same whitelist discipline as routes/pokemon.ts — see the comment there. */
const LOCATION_FILTER_COLUMNS: Record<string, SQL> = {
  name: sql`l.display_name`,
  region: sql`r.display_name`,
  kind: sql`lm.kind`,
  areaCount: sql`(SELECT count(*) FROM dex.location_areas la WHERE la.location_id = l.id)`,
};

/**
 * Sort whitelist for /locations/search; booleans sort as ints so the cursor
 * can carry the last row's value. Keys mirror LOCATION_SORT_FIELDS, and the
 * second map names the response field holding each row's sort value.
 */
const LOCATION_SORT_COLUMNS: Record<string, SQL> = {
  id: sql`l.id`,
  name: sql`l.display_name`,
  region: sql`r.display_name`,
  kind: sql`lm.kind`,
  areaCount: sql`(SELECT count(*) FROM dex.location_areas la WHERE la.location_id = l.id)`,
  hasEncounters: sql`(EXISTS(
    SELECT 1 FROM dex.location_areas la
    JOIN dex.encounters e ON e.location_area_id = la.id
    WHERE la.location_id = l.id
  ))::int`,
};
const LOCATION_SORT_VALUE_KEYS: Record<string, string> = {
  id: 'id',
  name: 'displayName',
  region: 'regionName',
  kind: 'kind',
  areaCount: 'areaCount',
  hasEncounters: 'hasEncounters',
};

function locationConditionToSql(condition: LocationFilterCondition): SQL {
  if (condition.field === 'hasEncounters') {
    const exists = sql`EXISTS (
      SELECT 1 FROM dex.location_areas la
      JOIN dex.encounters e ON e.location_area_id = la.id
      WHERE la.location_id = l.id
    )`;
    return condition.value ? exists : sql`NOT ${exists}`;
  }
  const column = LOCATION_FILTER_COLUMNS[condition.field];
  if (!column) {
    throw ApiError.badRequest(`Field "${condition.field}" is not filterable`);
  }
  switch (condition.op) {
    case 'eq':
      return sql`${column} = ${condition.value}`;
    case 'neq':
      return sql`${column} IS DISTINCT FROM ${condition.value}`;
    case 'gt':
      return sql`${column} > ${condition.value}`;
    case 'gte':
      return sql`${column} >= ${condition.value}`;
    case 'lt':
      return sql`${column} < ${condition.value}`;
    case 'lte':
      return sql`${column} <= ${condition.value}`;
    case 'contains':
      return sql`${column} ILIKE ${`%${condition.value}%`}`;
    case 'startsWith':
      return sql`${column} ILIKE ${`${condition.value}%`}`;
    case 'endsWith':
      return sql`${column} ILIKE ${`%${condition.value}`}`;
    default: {
      const exhaustive: never = condition;
      throw ApiError.badRequest(`Unsupported operator on ${JSON.stringify(exhaustive)}`);
    }
  }
}

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
        (SELECT count(*) FROM dex.locations l WHERE l.region_id = r.id)::int AS "locationCount",
        (
          SELECT count(*) FROM dex.location_areas la
          JOIN dex.locations l ON l.id = la.location_id
          WHERE l.region_id = r.id
        )::int AS "areaCount",
        (
          SELECT count(DISTINCT e.pokemon_id) FROM dex.encounters e
          JOIN dex.location_areas la ON la.id = e.location_area_id
          JOIN dex.locations l ON l.id = la.location_id
          WHERE l.region_id = r.id
        )::int AS "speciesCount"
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
        COALESCE(lm.notable, false) AS notable,
        COALESCE(lm.notable_trainers, '{}') AS "notableTrainers",
        (SELECT count(*) FROM dex.location_areas la WHERE la.location_id = l.id)::int AS "areaCount"
      FROM dex.locations l
      JOIN dex.regions r ON r.id = l.region_id
      LEFT JOIN dex.location_meta lm ON lm.location_id = l.id
      WHERE l.region_id = ${id}
      ORDER BY (lm.map_x IS NULL), l.display_name
    `);

    return c.json({ items: rows as unknown as unknown[] });
  })

  /**
   * GET /v1/locations — the global catalog, every region's locations grouped.
   * ~1,100 locations in one response, cached an hour; the catalog page renders
   * it whole, so paging would only complicate the client.
   */
  .get('/locations', async (c) => {
    const rows = (await c.var.db.execute(sql`
      SELECT
        COALESCE(r.id, 0)      AS "regionId",
        COALESCE(r.name, 'other') AS "regionName",
        COALESCE(r.display_name, r.name, 'Other & event locations') AS "regionDisplayName",
        l.id,
        l.name,
        l.display_name  AS "displayName",
        lm.kind,
        (SELECT count(*) FROM dex.location_areas la WHERE la.location_id = l.id)::int AS "areaCount",
        EXISTS(
          SELECT 1 FROM dex.location_areas la
          JOIN dex.encounters e ON e.location_area_id = la.id
          WHERE la.location_id = l.id
        ) AS "hasEncounters"
      FROM dex.locations l
      -- LEFT, not INNER: 91 rows have no region (link-trade meeting points,
      -- event distributions, side games). Joining them away made them
      -- unreachable from the catalog while still being reachable by id.
      LEFT JOIN dex.regions r ON r.id = l.region_id
      LEFT JOIN dex.location_meta lm ON lm.location_id = l.id
      ORDER BY (l.region_id IS NULL), r.id, l.display_name
    `)) as unknown as {
      regionId: number;
      regionName: string;
      regionDisplayName: string;
      id: number;
      name: string;
      displayName: string;
      kind: string | null;
      areaCount: number;
      hasEncounters: boolean;
    }[];

    const regions = new Map<number, { id: number; name: string; displayName: string; locations: unknown[] }>();
    for (const row of rows) {
      let region = regions.get(row.regionId);
      if (!region) {
        region = { id: row.regionId, name: row.regionName, displayName: row.regionDisplayName, locations: [] };
        regions.set(row.regionId, region);
      }
      region.locations.push({
        id: row.id,
        name: row.name,
        displayName: row.displayName,
        kind: row.kind,
        areaCount: row.areaCount,
        hasEncounters: row.hasEncounters,
      });
    }

    return c.json({ items: [...regions.values()] });
  })

  /**
   * GET /v1/locations/search — the advanced-search entity: flat, filterable,
   * sortable rows on the shared opaque keyset cursor. Registered before
   * /locations/:id so "search" never resolves as an id.
   */
  .get('/locations/search', async (c) => {
    const limit = Math.min(Math.max(Number(c.req.query('limit') ?? 50) || 50, 1), 200);
    const sort = c.req.query('sort') ?? 'id';
    const sortColumn = LOCATION_SORT_COLUMNS[sort];
    if (!sortColumn) throw ApiError.badRequest(`Cannot sort locations by "${sort}"`);
    const ascending = c.req.query('dir') !== 'desc';
    const cursor = decodeCursor(c.req.query('cursor'));
    const filter = decodeLocationFilter(c.req.query('filter'));

    const predicates: SQL[] = [sql`true`];
    if (filter.conditions.length > 0) {
      const parts = filter.conditions.map(locationConditionToSql);
      const joiner = filter.match === 'any' ? sql` OR ` : sql` AND `;
      predicates.push(sql`(${sql.join(parts, joiner)})`);
    }
    if (cursor) predicates.push(keysetPredicate(cursor, sortColumn, sql`l.id`, ascending));

    const direction = ascending ? sql`ASC` : sql`DESC`;

    const rows = (await c.var.db.execute(sql`
      SELECT
        l.id,
        l.name,
        l.display_name AS "displayName",
        r.display_name AS "regionName",
        lm.kind,
        (SELECT count(*) FROM dex.location_areas la WHERE la.location_id = l.id)::int AS "areaCount",
        EXISTS(
          SELECT 1 FROM dex.location_areas la
          JOIN dex.encounters e ON e.location_area_id = la.id
          WHERE la.location_id = l.id
        ) AS "hasEncounters"
      FROM dex.locations l
      LEFT JOIN dex.regions r ON r.id = l.region_id
      LEFT JOIN dex.location_meta lm ON lm.location_id = l.id
      WHERE ${sql.join(predicates, sql` AND `)}
      ORDER BY ${sortColumn} ${direction} NULLS LAST, l.id ${direction}
      LIMIT ${limit + 1}
    `)) as unknown as ({ id: number } & Record<string, unknown>)[];

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page.at(-1);

    let nextCursor: string | null = null;
    if (hasMore && last) {
      const sortValue = last[LOCATION_SORT_VALUE_KEYS[sort]!];
      nextCursor = encodeCursor({
        // Booleans ride as the same 0/1 the ::int sort column compares.
        v:
          typeof sortValue === 'boolean'
            ? Number(sortValue)
            : typeof sortValue === 'string' || typeof sortValue === 'number'
              ? sortValue
              : null,
        id: last.id,
      });
    }

    return c.json({ items: page, nextCursor });
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
        COALESCE(lm.notable_trainers, '{}') AS "notableTrainers",
        COALESCE(lm.neighbor_ids, '{}') AS "neighborIds"
      FROM dex.locations l
      LEFT JOIN dex.regions r ON r.id = l.region_id
      LEFT JOIN dex.location_meta lm ON lm.location_id = l.id
      WHERE l.id = ${id}
    `)) as unknown as { id: number; neighborIds: number[] }[];

    if (!location) throw ApiError.notFound('Location');

    const [areaRows, neighbours, itemRows] = await Promise.all([
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
      c.var.db.execute(sql`
        SELECT
          li.label,
          li.note,
          li.hidden,
          li.spots,
          i.name         AS "itemName",
          i.display_name AS "itemDisplayName",
          i.sprite
        FROM dex.location_items li
        LEFT JOIN dex.items i ON i.id = li.item_id
        WHERE li.location_id = ${id}
        ORDER BY li.label
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

    return c.json({
      ...location,
      areas: [...areas.values()],
      neighbors: neighbours as unknown as unknown[],
      items: itemRows as unknown as unknown[],
    });
  });
