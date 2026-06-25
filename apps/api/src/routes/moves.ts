import { Hono } from 'hono';
import { sql, type SQL } from 'drizzle-orm';
import { MoveListQuerySchema, decodeMoveFilter, type MoveFilterCondition } from '@masterpokedex/shared';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';
import { decodeCursor, encodeCursor, type Cursor } from '../lib/pagination';

/**
 * Same whitelist discipline as routes/pokemon.ts: a Zod-validated field name is
 * looked up here to get a column, and the request string never reaches SQL.
 * If you add a field here, add it to MOVE_FILTER_FIELD_META in
 * packages/shared/src/moves.ts too.
 */
const MOVE_FILTER_COLUMNS: Record<string, SQL> = {
  name: sql`m.display_name`,
  power: sql`m.power`,
  pp: sql`m.pp`,
  accuracy: sql`m.accuracy`,
  priority: sql`m.priority`,
  generation: sql`m.generation_id`,
};

const MOVE_SORT_COLUMNS: Record<string, SQL> = {
  id: sql`m.id`,
  name: sql`m.display_name`,
  power: sql`m.power`,
  pp: sql`m.pp`,
  accuracy: sql`m.accuracy`,
  priority: sql`m.priority`,
};

const MOVE_COLUMNS = `
  m.id,
  m.name,
  m.display_name  AS "displayName",
  t.name          AS type,
  m.damage_class  AS "damageClass",
  m.power,
  m.pp,
  m.accuracy,
  m.priority,
  m.generation_id AS generation,
  m.short_effect  AS "shortEffect"
`;

function inList(column: SQL, values: readonly (string | number)[]): SQL {
  if (values.length === 0) return sql`false`;
  return sql`${column} IN (${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )})`;
}

function conditionToSql(condition: MoveFilterCondition): SQL {
  if (condition.field === 'type') {
    const values = condition.op === 'in' ? condition.value : [condition.value];
    const match = inList(sql`t.name`, values);
    return condition.op === 'neq' ? sql`NOT ${match}` : match;
  }
  if (condition.field === 'damageClass') {
    const values = condition.op === 'in' ? condition.value : [condition.value];
    const match = inList(sql`m.damage_class`, values);
    return condition.op === 'neq' ? sql`NOT ${match}` : match;
  }

  const column = MOVE_FILTER_COLUMNS[condition.field];
  if (!column) {
    // Unreachable while the shared enum and this map agree — thrown so drift
    // fails loudly instead of silently matching everything.
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

/** Keyset predicate, null-aware — power/accuracy are NULL on status moves. */
function cursorPredicate(cursor: Cursor, sortColumn: SQL, ascending: boolean): SQL {
  const cmp = ascending ? sql`>` : sql`<`;
  if (cursor.v === null) {
    return sql`(${sortColumn} IS NULL AND m.id ${cmp} ${cursor.id})`;
  }
  return sql`(${sortColumn} ${cmp} ${cursor.v} OR (${sortColumn} = ${cursor.v} AND m.id ${cmp} ${cursor.id}))`;
}

export const movesRoutes = new Hono<AppBindings>()
  /** GET /v1/moves — the sortable, filterable moves index. */
  .get('/', async (c) => {
    const query = MoveListQuerySchema.parse(c.req.query());
    const filter = decodeMoveFilter(query.filter);

    const sortColumn = MOVE_SORT_COLUMNS[query.sort] ?? MOVE_SORT_COLUMNS.id!;
    const ascending = query.dir === 'asc';
    const cursor = decodeCursor(query.cursor);

    const predicates: SQL[] = [sql`true`];
    if (query.q) predicates.push(sql`(m.display_name ILIKE ${`%${query.q}%`} OR m.name ILIKE ${`%${query.q}%`})`);
    if (query.type) predicates.push(sql`t.name = ${query.type}`);
    if (query.damageClass) predicates.push(sql`m.damage_class = ${query.damageClass}`);
    if (query.generation) predicates.push(sql`m.generation_id = ${query.generation}`);

    if (filter.conditions.length > 0) {
      const parts = filter.conditions.map(conditionToSql);
      const joiner = filter.match === 'any' ? sql` OR ` : sql` AND `;
      predicates.push(sql`(${sql.join(parts, joiner)})`);
    }

    if (cursor) predicates.push(cursorPredicate(cursor, sortColumn, ascending));

    const where = sql.join(predicates, sql` AND `);
    const direction = ascending ? sql`ASC` : sql`DESC`;

    const rows = (await c.var.db.execute(sql`
      SELECT ${sql.raw(MOVE_COLUMNS)}
      FROM dex.moves m
      JOIN dex.types t ON t.id = m.type_id
      WHERE ${where}
      ORDER BY ${sortColumn} ${direction} NULLS LAST, m.id ${direction}
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

  /** GET /v1/moves/:idOrName — the move plus every Pokémon that learns it. */
  .get('/:idOrName', async (c) => {
    const raw = c.req.param('idOrName');
    const asId = Number(raw);
    const match = Number.isInteger(asId) ? sql`m.id = ${asId}` : sql`m.name = ${raw.toLowerCase()}`;

    const [move] = (await c.var.db.execute(sql`
      SELECT ${sql.raw(MOVE_COLUMNS)}
      FROM dex.moves m
      JOIN dex.types t ON t.id = m.type_id
      WHERE ${match}
      LIMIT 1
    `)) as unknown as { id: number }[];

    if (!move) throw ApiError.notFound('Move');

    // Bounded (a few hundred rows at most) and cached for an hour — unpaged.
    const learners = await c.var.db.execute(sql`
      SELECT
        pm.pokemon_id    AS "pokemonId",
        p.name,
        COALESCE(s.display_name, s.name) AS "displayName",
        p.form_label     AS "formLabel",
        p.is_default     AS "isDefault",
        p.sprite,
        COALESCE((
          SELECT array_agg(t2.name ORDER BY pt.slot)
          FROM dex.pokemon_types pt
          JOIN dex.types t2 ON t2.id = pt.type_id
          WHERE pt.pokemon_id = p.id
        ), '{}')          AS types,
        pm.learn_method  AS "learnMethod",
        pm.level
      FROM dex.pokemon_moves pm
      JOIN dex.pokemon p ON p.id = pm.pokemon_id
      JOIN dex.species s ON s.id = p.species_id
      WHERE pm.move_id = ${move.id}
      ORDER BY
        CASE pm.learn_method WHEN 'level-up' THEN 0 WHEN 'machine' THEN 1 WHEN 'egg' THEN 2 ELSE 3 END,
        pm.level NULLS LAST,
        p.id
    `);

    return c.json({ ...move, learners: learners as unknown as unknown[] });
  });
