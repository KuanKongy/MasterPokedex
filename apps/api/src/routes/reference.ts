import { Hono } from 'hono';
import { sql, type SQL } from 'drizzle-orm';
import {
  ItemListQuerySchema,
  PokemonTypeSchema,
  decodeEvolutionFilter,
  decodeItemFilter,
  type EvolutionChain,
  type EvolutionFilterCondition,
  type ItemFilterCondition,
} from '@masterpokedex/shared';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';
import { evolutionMethods } from '../lib/evolution';
import { decodeCursor, encodeCursor, type Cursor } from '../lib/pagination';

/** Same whitelist discipline as routes/pokemon.ts — see the comment there. */
const ITEM_FILTER_COLUMNS: Record<string, SQL> = {
  name: sql`i.display_name`,
  category: sql`ic.name`,
  cost: sql`i.cost`,
  flingPower: sql`i.fling_power`,
};

const ITEM_SORT_COLUMNS: Record<string, SQL> = {
  id: sql`i.id`,
  name: sql`i.display_name`,
  cost: sql`i.cost`,
  category: sql`ic.name`,
};

function itemConditionToSql(condition: ItemFilterCondition): SQL {
  const column = ITEM_FILTER_COLUMNS[condition.field];
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

/**
 * One row per evolution edge. `pokemon` is the species the edge evolves
 * INTO (dex.evolution hangs off the evolved species); `from` is its parent
 * via species.evolves_from_species_id. Friendship is not a trigger of its
 * own upstream, so `needsFriendship` reads minimum_happiness instead.
 */
const EVOLUTION_FILTER_COLUMNS: Record<string, SQL> = {
  pokemon: sql`COALESCE(s.display_name, s.name)`,
  from: sql`COALESCE(p.display_name, p.name)`,
  trigger: sql`e.trigger`,
  item: sql`e.trigger_item`,
  heldItem: sql`e.held_item`,
  timeOfDay: sql`e.time_of_day`,
  minLevel: sql`e.minimum_level`,
  minHappiness: sql`e.minimum_happiness`,
  needsFriendship: sql`(e.minimum_happiness IS NOT NULL)`,
};

function evolutionConditionToSql(condition: EvolutionFilterCondition): SQL {
  const column = EVOLUTION_FILTER_COLUMNS[condition.field];
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

function itemCursorPredicate(cursor: Cursor, sortColumn: SQL, ascending: boolean): SQL {
  const cmp = ascending ? sql`>` : sql`<`;
  if (cursor.v === null) {
    return sql`(${sortColumn} IS NULL AND i.id ${cmp} ${cursor.id})`;
  }
  return sql`(${sortColumn} ${cmp} ${cursor.v} OR (${sortColumn} = ${cursor.v} AND i.id ${cmp} ${cursor.id}))`;
}

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

  /**
   * GET /v1/items?category=&q= — backs the trainer inventory item picker and,
   * with the additive cursor/sort/filter params, the advanced-search Items
   * entity. Callers that ignore `nextCursor` behave exactly as before.
   */
  .get('/items', async (c) => {
    const query = ItemListQuerySchema.parse(c.req.query());
    const filter = decodeItemFilter(query.filter);

    const sortColumn = ITEM_SORT_COLUMNS[query.sort] ?? ITEM_SORT_COLUMNS.name!;
    const ascending = query.dir === 'asc';
    const cursor = decodeCursor(query.cursor);

    const predicates: SQL[] = [sql`true`];
    if (query.category) predicates.push(sql`ic.name = ${query.category}`);
    if (query.q) predicates.push(sql`i.display_name ILIKE ${`%${query.q}%`}`);

    if (filter.conditions.length > 0) {
      const parts = filter.conditions.map(itemConditionToSql);
      const joiner = filter.match === 'any' ? sql` OR ` : sql` AND `;
      predicates.push(sql`(${sql.join(parts, joiner)})`);
    }

    if (cursor) predicates.push(itemCursorPredicate(cursor, sortColumn, ascending));

    const direction = ascending ? sql`ASC` : sql`DESC`;

    const rows = (await c.var.db.execute(sql`
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
      ORDER BY ${sortColumn} ${direction} NULLS LAST, i.id ${direction}
      LIMIT ${query.limit + 1}
    `)) as unknown as ({ id: number } & Record<string, unknown>)[];

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    let nextCursor: string | null = null;
    if (hasMore && last) {
      const sortValue = last[query.sort === 'name' ? 'displayName' : query.sort];
      nextCursor = encodeCursor({
        v: typeof sortValue === 'string' || typeof sortValue === 'number' ? sortValue : null,
        id: last.id,
      });
    }

    return c.json({ items: page, nextCursor });
  })

  /** GET /v1/items/:idOrName — one item, plus every place it can be picked up. */
  .get('/items/:idOrName', async (c) => {
    const raw = c.req.param('idOrName');
    const byId = /^\d+$/.test(raw);
    const rows = (await c.var.db.execute(sql`
      SELECT
        i.id,
        i.name,
        i.display_name  AS "displayName",
        ic.name         AS category,
        ic.display_name AS "categoryName",
        ic.pocket,
        i.short_effect  AS effect,
        i.sprite,
        i.cost,
        i.fling_power   AS "flingPower"
      FROM dex.items i
      JOIN dex.item_categories ic ON ic.id = i.category_id
      WHERE ${byId ? sql`i.id = ${Number(raw)}` : sql`i.name = ${raw.toLowerCase()}`}
      LIMIT 1
    `)) as unknown as Record<string, unknown>[];
    const item = rows[0];
    if (!item) return c.json({ error: { code: 'not_found', message: 'No such item' } }, 404);

    const locations = (await c.var.db.execute(sql`
      SELECT
        l.id           AS "locationId",
        l.display_name AS "locationName",
        r.display_name AS "regionName",
        li.note,
        li.hidden,
        li.spots
      FROM dex.location_items li
      JOIN dex.locations l ON l.id = li.location_id
      LEFT JOIN dex.regions r ON r.id = l.region_id
      WHERE li.item_id = ${item.id as number}
      ORDER BY r.display_name NULLS LAST, l.display_name
      LIMIT 120
    `)) as unknown as unknown[];

    return c.json({ ...item, locations });
  })

  /** GET /v1/typechart — the whole 18×18 efficacy matrix in one query. */
  .get('/typechart', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT atk.name AS attack, def.name AS defend, te.damage_factor AS factor
      FROM dex.type_efficacy te
      JOIN dex.types atk ON atk.id = te.damage_type_id
      JOIN dex.types def ON def.id = te.target_type_id
      ORDER BY atk.id, def.id
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /**
   * GET /v1/evolutions/search — the advanced search's Evolutions entity:
   * one row per evolution edge, keyset-paged by the edge's own id.
   */
  .get('/evolutions/search', async (c) => {
    const limit = Math.min(Math.max(Number(c.req.query('limit') ?? 50) || 50, 1), 200);
    const after = Number(c.req.query('cursor') ?? 0) || 0;
    const filter = decodeEvolutionFilter(c.req.query('filter'));

    const predicates: SQL[] = [sql`e.id > ${after}`];
    if (filter.conditions.length > 0) {
      const parts = filter.conditions.map(evolutionConditionToSql);
      const joiner = filter.match === 'any' ? sql` OR ` : sql` AND `;
      predicates.push(sql`(${sql.join(parts, joiner)})`);
    }

    const rows = (await c.var.db.execute(sql`
      SELECT
        e.id,
        s.evolution_chain_id AS "chainId",
        p.id AS "fromId",
        COALESCE(p.display_name, p.name) AS "fromName",
        s.id AS "toId",
        COALESCE(s.display_name, s.name) AS "toName",
        dp.sprite,
        e.trigger,
        e.trigger_item      AS item,
        e.held_item         AS "heldItem",
        e.minimum_level     AS "minLevel",
        e.minimum_happiness AS "minHappiness",
        e.time_of_day       AS "timeOfDay"
      FROM dex.evolution e
      JOIN dex.species s ON s.id = e.evolved_species_id
      LEFT JOIN dex.species p ON p.id = s.evolves_from_species_id
      LEFT JOIN LATERAL (
        SELECT dp.sprite FROM dex.pokemon dp
        WHERE dp.species_id = s.id AND dp.is_default
        LIMIT 1
      ) dp ON true
      WHERE ${sql.join(predicates, sql` AND `)}
      ORDER BY e.id
      LIMIT ${limit + 1}
    `)) as unknown as ({ id: number } & Record<string, unknown>)[];

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore && page.length > 0 ? String(page.at(-1)!.id) : null;
    return c.json({ items: page, nextCursor });
  })

  /**
   * GET /v1/evolution-chains — the chains index, paged by chain id (a plain
   * integer keyset: chain ids are stable and strictly ordered, so no
   * sort-value blob is needed). `q` keeps chains where ANY member matches.
   */
  .get('/evolution-chains', async (c) => {
    // 200 cap so the Evolutions page can load all 541 chains in three
    // requests and filter/sort them client-side.
    const limit = Math.min(Math.max(Number(c.req.query('limit') ?? 20) || 20, 1), 200);
    const after = Number(c.req.query('cursor') ?? 0) || 0;
    const q = c.req.query('q');

    const chainFilter = q
      ? sql`AND EXISTS (
          SELECT 1 FROM dex.species sq
          WHERE sq.evolution_chain_id = s.evolution_chain_id
            AND (sq.display_name ILIKE ${`%${q}%`} OR sq.name ILIKE ${`%${q}%`})
        )`
      : sql``;

    const chainRows = (await c.var.db.execute(sql`
      SELECT DISTINCT s.evolution_chain_id AS cid
      FROM dex.species s
      WHERE s.evolution_chain_id IS NOT NULL AND s.evolution_chain_id > ${after} ${chainFilter}
      ORDER BY cid
      LIMIT ${limit + 1}
    `)) as unknown as { cid: number }[];

    const hasMore = chainRows.length > limit;
    const chainIds = (hasMore ? chainRows.slice(0, limit) : chainRows).map((r) => r.cid);
    if (chainIds.length === 0) return c.json({ items: [], nextCursor: null });

    const nodes = (await c.var.db.execute(sql`
      SELECT
        s.evolution_chain_id AS "chainId",
        s.id,
        COALESCE(s.display_name, s.name) AS name,
        s.evolves_from_species_id AS "from",
        pk.sprite,
        pk.artwork,
        COALESCE((
          SELECT array_agg(t.name ORDER BY pt.slot)
          FROM dex.pokemon_types pt JOIN dex.types t ON t.id = pt.type_id
          WHERE pt.pokemon_id = pk.id
        ), '{}') AS types,
        ev.trigger,
        ev.minimum_level     AS "minLevel",
        ev.trigger_item      AS item,
        ev.held_item         AS "heldItem",
        ev.minimum_happiness AS "minHappiness",
        ev.time_of_day       AS "timeOfDay",
        ev.known_move        AS "knownMove",
        ${evolutionMethods(sql`s.id`)} AS methods
      FROM dex.species s
      LEFT JOIN LATERAL (
        SELECT * FROM dex.pokemon dp
        WHERE dp.species_id = s.id AND dp.is_default
        LIMIT 1
      ) pk ON true
      LEFT JOIN LATERAL (
        SELECT * FROM dex.evolution e
        WHERE e.evolved_species_id = s.id
        ORDER BY e.id
        LIMIT 1
      ) ev ON true
      WHERE s.evolution_chain_id IN (${sql.join(
        chainIds.map((id) => sql`${id}`),
        sql`, `,
      )})
      ORDER BY s.evolution_chain_id, s.id
    `)) as unknown as ({ chainId: number; id: number; from: number | null } & Record<string, unknown>)[];

    // Depth from parent links, in TS — the recursive CTE is overkill here
    // because every chain member is already present in the result set.
    const byChain = new Map<number, typeof nodes>();
    for (const node of nodes) {
      const bucket = byChain.get(node.chainId) ?? [];
      bucket.push(node);
      byChain.set(node.chainId, bucket);
    }

    const items: EvolutionChain[] = chainIds
      .filter((cid) => byChain.has(cid))
      .map((cid) => {
        const members = byChain.get(cid)!;
        const depthOf = new Map<number, number>();
        const depth = (node: (typeof members)[number]): number => {
          const id = node.id as number;
          const cached = depthOf.get(id);
          if (cached !== undefined) return cached;
          depthOf.set(id, 0); // cycle guard
          const parent = node.from === null ? null : members.find((m) => m.id === node.from);
          const value = parent ? depth(parent) + 1 : 0;
          depthOf.set(id, value);
          return value;
        };
        return {
          chainId: cid,
          nodes: members
            .map((m) => ({ ...m, depth: depth(m) }))
            .sort((a, b) => a.depth - b.depth || (a.id as number) - (b.id as number)),
        } as unknown as EvolutionChain;
      });

    return c.json({ items, nextCursor: hasMore ? String(chainIds.at(-1)) : null });
  })

  .get('/item-categories', async (c) => {
    const rows = await c.var.db.execute(sql`
      SELECT ic.id, ic.name, ic.display_name AS "displayName", ic.pocket,
             (SELECT count(*) FROM dex.items i WHERE i.category_id = ic.id)::int AS "itemCount"
      FROM dex.item_categories ic
      WHERE EXISTS (SELECT 1 FROM dex.items i WHERE i.category_id = ic.id)
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
        m.name          AS slug,
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
