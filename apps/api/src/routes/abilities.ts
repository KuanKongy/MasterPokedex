import { Hono } from 'hono';
import { sql, type SQL } from 'drizzle-orm';
import { AbilityListQuerySchema } from '@masterpokedex/shared';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';
import { decodeCursor, encodeCursor, type Cursor } from '../lib/pagination';

/**
 * `a.id < 10000` everywhere: PokeAPI ships 61 non-main-series abilities
 * (side games) above that id, none of which any main-series Pokémon carries.
 */
const MAIN_SERIES = sql`a.id < 10000`;

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
    const sortColumn = query.sort === 'name' ? sql`a.display_name` : sql`a.id`;
    const ascending = query.dir === 'asc';
    const cursor = decodeCursor(query.cursor);

    const predicates: SQL[] = [MAIN_SERIES];
    if (query.q) predicates.push(sql`(a.display_name ILIKE ${`%${query.q}%`} OR a.name ILIKE ${`%${query.q}%`})`);
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
      const sortValue = query.sort === 'name' ? last.displayName : last.id;
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
