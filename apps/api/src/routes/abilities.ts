import { Hono } from 'hono';
import { sql, type SQL } from 'drizzle-orm';
import {
  AbilityListQuerySchema,
  decodeAbilityFilter,
  type AbilityFilterCondition,
} from '@masterpokedex/shared';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';
import { decodeCursor, encodeCursor, type Cursor } from '../lib/pagination';

/**
 * `a.id < 10000` everywhere: PokeAPI ships 61 non-main-series abilities
 * (side games) above that id, none of which any main-series Pokémon carries.
 */
const MAIN_SERIES = sql`a.id < 10000`;

/** Same whitelist discipline as routes/pokemon.ts — see the comment there. */
const ABILITY_FILTER_COLUMNS: Record<string, SQL> = {
  name: sql`a.display_name`,
  generation: sql`a.generation_id`,
  pokemonCount: sql`(SELECT count(*) FROM dex.pokemon_abilities pa WHERE pa.ability_id = a.id)`,
};

function conditionToSql(condition: AbilityFilterCondition): SQL {
  const column = ABILITY_FILTER_COLUMNS[condition.field];
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

/** Sortable columns; pokemonCount reuses the filter map's correlated count. */
const ABILITY_SORT_COLUMNS: Record<string, SQL> = {
  id: sql`a.id`,
  name: sql`a.display_name`,
  generation: sql`a.generation_id`,
  pokemonCount: sql`(SELECT count(*) FROM dex.pokemon_abilities pa WHERE pa.ability_id = a.id)`,
};

const ABILITY_COLUMNS = `
  a.id,
  a.name,
  COALESCE(a.display_name, a.name) AS "displayName",
  a.short_effect  AS "shortEffect",
  a.generation_id AS generation,
  (SELECT count(*)::int FROM dex.pokemon_abilities pa WHERE pa.ability_id = a.id) AS "pokemonCount"
`;

function cursorPredicate(cursor: Cursor, sortColumn: SQL, ascending: boolean): SQL {
  const cmp = ascending ? sql`>` : sql`<`;
  if (cursor.v === null) {
    return sql`(${sortColumn} IS NULL AND a.id ${cmp} ${cursor.id})`;
  }
  return sql`(${sortColumn} ${cmp} ${cursor.v} OR (${sortColumn} = ${cursor.v} AND a.id ${cmp} ${cursor.id}))`;
}

export const abilitiesRoutes = new Hono<AppBindings>()
  /** GET /v1/abilities — main-series abilities with holder counts. */
  .get('/', async (c) => {
    const query = AbilityListQuerySchema.parse(c.req.query());
    const filter = decodeAbilityFilter(query.filter);
    const sortColumn = ABILITY_SORT_COLUMNS[query.sort] ?? ABILITY_SORT_COLUMNS.id!;
    const ascending = query.dir === 'asc';
    const cursor = decodeCursor(query.cursor);

    const predicates: SQL[] = [MAIN_SERIES];
    if (query.q) predicates.push(sql`(a.display_name ILIKE ${`%${query.q}%`} OR a.name ILIKE ${`%${query.q}%`})`);

    if (filter.conditions.length > 0) {
      const parts = filter.conditions.map(conditionToSql);
      const joiner = filter.match === 'any' ? sql` OR ` : sql` AND `;
      predicates.push(sql`(${sql.join(parts, joiner)})`);
    }

    if (cursor) predicates.push(cursorPredicate(cursor, sortColumn, ascending));

    const where = sql.join(predicates, sql` AND `);
    const direction = ascending ? sql`ASC` : sql`DESC`;

    const rows = (await c.var.db.execute(sql`
      SELECT ${sql.raw(ABILITY_COLUMNS)}
      FROM dex.abilities a
      WHERE ${where}
      ORDER BY ${sortColumn} ${direction} NULLS LAST, a.id ${direction}
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

  /** GET /v1/abilities/:idOrName — the ability plus every Pokémon that has it. */
  .get('/:idOrName', async (c) => {
    const raw = c.req.param('idOrName');
    const asId = Number(raw);
    const match = Number.isInteger(asId) ? sql`a.id = ${asId}` : sql`a.name = ${raw.toLowerCase()}`;

    const [ability] = (await c.var.db.execute(sql`
      SELECT ${sql.raw(ABILITY_COLUMNS)}
      FROM dex.abilities a
      WHERE ${match} AND ${MAIN_SERIES}
      LIMIT 1
    `)) as unknown as { id: number }[];

    if (!ability) throw ApiError.notFound('Ability');

    const pokemon = await c.var.db.execute(sql`
      SELECT
        pa.pokemon_id AS "pokemonId",
        p.name,
        COALESCE(s.display_name, s.name) AS "displayName",
        p.form_label  AS "formLabel",
        p.is_default  AS "isDefault",
        p.sprite,
        COALESCE((
          SELECT array_agg(t.name ORDER BY pt.slot)
          FROM dex.pokemon_types pt
          JOIN dex.types t ON t.id = pt.type_id
          WHERE pt.pokemon_id = p.id
        ), '{}')      AS types,
        pa.is_hidden  AS "isHidden",
        pa.slot
      FROM dex.pokemon_abilities pa
      JOIN dex.pokemon p ON p.id = pa.pokemon_id
      JOIN dex.species s ON s.id = p.species_id
      WHERE pa.ability_id = ${ability.id}
      ORDER BY pa.is_hidden, p.id
    `);

    return c.json({ ...ability, pokemon: pokemon as unknown as unknown[] });
  });
