import { Hono } from 'hono';
import { sql, type SQL } from 'drizzle-orm';
import {
  PokemonListQuerySchema,
  decodeFilter,
  rarityFromChance,
  type PokemonFilterCondition,
} from '@masterpokedex/shared';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';
import { evolutionMethods } from '../lib/evolution';
import { decodeCursor, encodeCursor, type Cursor } from '../lib/pagination';
import { POKEMON_COLUMNS, buildMatchups, toPokemonSummary, type PokemonRow } from '../lib/serialize';

/**
 * ─── The whitelist ───────────────────────────────────────────────────────────
 *
 * This map is the entire reason the filter feature is safe. A validated field
 * name from the shared Zod enum is looked up here to get a column; the request
 * string itself never reaches SQL. Compare the reference implementation
 * (appService.js:741), which did:
 *
 *     whereClauses.push(`${attribute} ${operator} :${paramName}`)
 *
 * binding only the value and concatenating the caller's `attribute` and
 * `operator` straight into the statement.
 *
 * If you add a field here, add it to POKEMON_FILTER_FIELDS in
 * packages/shared/src/filters.ts too — Zod rejects anything not in that enum
 * before it ever gets here.
 */
const FILTER_COLUMNS: Record<string, SQL> = {
  name: sql`p.name`,
  color: sql`s.color`,
  habitat: sql`s.habitat`,
  generation: sql`p.generation_id`,
  hp: sql`p.hp`,
  attack: sql`p.attack`,
  defense: sql`p.defense`,
  specialAttack: sql`p.special_attack`,
  specialDefense: sql`p.special_defense`,
  speed: sql`p.speed`,
  total: sql`p.total`,
  height: sql`p.height`,
  weight: sql`p.weight`,
  baseExperience: sql`p.base_experience`,
  captureRate: sql`s.capture_rate`,
  growthRate: sql`gr.name`,
  isLegendary: sql`s.is_legendary`,
  isMythical: sql`s.is_mythical`,
  isMega: sql`p.is_mega`,
  isGmax: sql`p.is_gmax`,
  isRegional: sql`p.is_regional`,
};

const SORT_COLUMNS: Record<string, SQL> = {
  id: sql`p.id`,
  name: sql`p.name`,
  generation: sql`p.generation_id`,
  total: sql`p.total`,
  hp: sql`p.hp`,
  attack: sql`p.attack`,
  defense: sql`p.defense`,
  specialAttack: sql`p.special_attack`,
  specialDefense: sql`p.special_defense`,
  speed: sql`p.speed`,
  height: sql`p.height`,
  weight: sql`p.weight`,
  baseExperience: sql`p.base_experience`,
};

/**
 * Builds `col IN ($1, $2, …)` with one bound parameter per value.
 *
 * Not `col = ANY(${array})`: Drizzle's sql template expands a JavaScript array
 * into separate placeholders rather than binding it as a single array
 * parameter, so `ANY(${['dragon']})` becomes `ANY($1)` with $1 = 'dragon' and
 * Postgres rejects it with "malformed array literal". Every value is still a
 * bound parameter here — nothing is concatenated.
 */
function inList(column: SQL, values: readonly (string | number)[]): SQL {
  if (values.length === 0) return sql`false`;
  return sql`${column} IN (${sql.join(
    values.map((value) => sql`${value}`),
    sql`, `,
  )})`;
}

function conditionToSql(condition: PokemonFilterCondition): SQL {
  // `type` is a relation, not a column, so it cannot come from FILTER_COLUMNS.
  if (condition.field === 'type') {
    const values = condition.op === 'in' ? condition.value : [condition.value];
    const exists = sql`EXISTS (
      SELECT 1 FROM dex.pokemon_types pt
      JOIN dex.types t ON t.id = pt.type_id
      WHERE pt.pokemon_id = p.id AND ${inList(sql`t.name`, values)}
    )`;
    return condition.op === 'neq' ? sql`NOT ${exists}` : exists;
  }

  // Ability is a relation too: match either the identifier or the pretty name.
  if (condition.field === 'ability') {
    const value = condition.value as string;
    const pattern =
      condition.op === 'contains'
        ? `%${value}%`
        : condition.op === 'startsWith'
          ? `${value}%`
          : condition.op === 'endsWith'
            ? `%${value}`
            : value;
    const exists = sql`EXISTS (
      SELECT 1 FROM dex.pokemon_abilities pa
      JOIN dex.abilities ab ON ab.id = pa.ability_id
      WHERE pa.pokemon_id = p.id
        AND (ab.name ILIKE ${pattern} OR ab.display_name ILIKE ${pattern})
    )`;
    return condition.op === 'neq' ? sql`NOT ${exists}` : exists;
  }

  // "How does this species evolve (from its parent)": matches dex.evolution
  // for the species itself. Base forms have no evolution row, so `eq` never
  // matches them and `neq` includes them.
  if (condition.field === 'evolutionTrigger') {
    const exists = sql`EXISTS (
      SELECT 1 FROM dex.evolution ev
      WHERE ev.evolved_species_id = p.species_id AND ev.trigger = ${condition.value}
    )`;
    return condition.op === 'neq' ? sql`NOT ${exists}` : exists;
  }

  // Species-level facts about siblings and children.
  if (condition.field === 'hasMega' || condition.field === 'hasGmax') {
    const flag = condition.field === 'hasMega' ? sql`sib.is_mega` : sql`sib.is_gmax`;
    const exists = sql`EXISTS (
      SELECT 1 FROM dex.pokemon sib WHERE sib.species_id = p.species_id AND ${flag}
    )`;
    return condition.value ? exists : sql`NOT ${exists}`;
  }
  if (condition.field === 'isFullyEvolved') {
    const hasChild = sql`EXISTS (
      SELECT 1 FROM dex.species child WHERE child.evolves_from_species_id = p.species_id
    )`;
    return condition.value ? sql`NOT ${hasChild}` : hasChild;
  }

  const column = FILTER_COLUMNS[condition.field];
  if (!column) {
    // Unreachable: Zod validated `field` against the same whitelist. Thrown
    // rather than ignored so a future field added to the enum but not here
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
    case 'in':
      return inList(column, condition.value);
    default: {
      const exhaustive: never = condition;
      throw ApiError.badRequest(`Unsupported operator on ${JSON.stringify(exhaustive)}`);
    }
  }
}

/** Keyset predicate: rows strictly after (sortValue, id) in the current order. */
function cursorPredicate(cursor: Cursor, sortColumn: SQL, ascending: boolean): SQL {
  const cmp = ascending ? sql`>` : sql`<`;
  if (cursor.v === null) {
    return sql`(${sortColumn} IS NULL AND p.id ${cmp} ${cursor.id})`;
  }
  return sql`(${sortColumn} ${cmp} ${cursor.v} OR (${sortColumn} = ${cursor.v} AND p.id ${cmp} ${cursor.id}))`;
}

export const pokemonRoutes = new Hono<AppBindings>()
  /**
   * GET /v1/pokemon
   *
   * Replaces the web app's `fetchPokemonList()`, which issued one request for
   * the index plus one per Pokémon — 152 round trips to pokeapi.co on every
   * cold cache, from a hook mounted in Header.tsx and therefore on every page.
   */
  .get('/', async (c) => {
    const query = PokemonListQuerySchema.parse(c.req.query());
    const filter = decodeFilter(query.filter);

    const sortColumn = SORT_COLUMNS[query.sort] ?? SORT_COLUMNS.id!;
    const ascending = query.dir === 'asc';
    const cursor = decodeCursor(query.cursor);

    // forms=all lets the battle forms (Megas, Gigantamax, regionals) through;
    // the default keeps the linear dex to one row per species.
    const predicates: SQL[] = query.forms === 'all' ? [sql`true`] : [sql`p.is_default`];

    if (query.q) predicates.push(sql`p.name ILIKE ${`%${query.q}%`}`);
    if (query.generation) predicates.push(sql`p.generation_id = ${query.generation}`);
    if (query.type) {
      predicates.push(sql`EXISTS (
        SELECT 1 FROM dex.pokemon_types pt
        JOIN dex.types t ON t.id = pt.type_id
        WHERE pt.pokemon_id = p.id AND t.name = ${query.type}
      )`);
    }

    if (filter.conditions.length > 0) {
      const parts = filter.conditions.map(conditionToSql);
      const joiner = filter.match === 'any' ? sql` OR ` : sql` AND `;
      predicates.push(sql`(${sql.join(parts, joiner)})`);
    }

    if (cursor) predicates.push(cursorPredicate(cursor, sortColumn, ascending));

    const where = sql.join(predicates, sql` AND `);
    const direction = ascending ? sql`ASC` : sql`DESC`;

    // limit + 1 so `nextCursor` can be decided without a second COUNT.
    const rows = (await c.var.db.execute(sql`
      SELECT ${sql.raw(POKEMON_COLUMNS)}
      FROM dex.pokemon p
      JOIN dex.species s ON s.id = p.species_id
      LEFT JOIN dex.growth_rates gr ON gr.id = s.growth_rate_id
      WHERE ${where}
      ORDER BY ${sortColumn} ${direction} NULLS LAST, p.id ${direction}
      LIMIT ${query.limit + 1}
    `)) as unknown as (PokemonRow & Record<string, unknown>)[];

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    let nextCursor: string | null = null;
    if (hasMore && last) {
      // The sort column is aliased to its camelCase name in POKEMON_COLUMNS, so
      // the sort key doubles as the row key, except generation whose row alias
      // is generationId. Anything not a string or number (i.e. NULL) becomes
      // an explicit null, which cursorPredicate handles.
      const sortValue = last[query.sort === 'generation' ? 'generationId' : query.sort];
      nextCursor = encodeCursor({
        v: typeof sortValue === 'string' || typeof sortValue === 'number' ? sortValue : null,
        id: last.id,
      });
    }

    return c.json({ items: page.map(toPokemonSummary), nextCursor });
  })

  /**
   * GET /v1/pokemon/megas — every Mega form, labeled, with its base species.
   * Registered before /:idOrName, which would otherwise swallow "megas" as a name.
   */
  .get('/megas', async (c) => {
    const rows = (await c.var.db.execute(sql`
      SELECT
        ${sql.raw(POKEMON_COLUMNS)},
        p.is_mega    AS "isMega",
        p.is_gmax    AS "isGmax",
        p.is_regional AS "isRegional",
        p.species_id AS "speciesId",
        COALESCE(s.display_name, s.name) AS "baseName",
        base.id      AS "basePokemonId"
      FROM dex.pokemon p
      JOIN dex.species s ON s.id = p.species_id
      JOIN LATERAL (
        SELECT b.id FROM dex.pokemon b
        WHERE b.species_id = p.species_id AND b.is_default
        LIMIT 1
      ) base ON true
      WHERE p.is_mega
      ORDER BY p.species_id, p.id
    `)) as unknown as (PokemonRow & {
      isMega: boolean;
      isGmax: boolean;
      isRegional: boolean;
      speciesId: number;
      baseName: string;
      basePokemonId: number;
    })[];

    return c.json({
      items: rows.map((row) => ({
        ...toPokemonSummary(row),
        isMega: row.isMega,
        isGmax: row.isGmax,
        isRegional: row.isRegional,
        speciesId: row.speciesId,
        baseName: row.baseName,
        basePokemonId: row.basePokemonId,
      })),
    });
  })

  /**
   * GET /v1/pokemon/gmax — every Gigantamax form. Same shape and the same
   * registration-order caveat as /megas above.
   */
  .get('/gmax', async (c) => {
    const rows = (await c.var.db.execute(sql`
      SELECT
        ${sql.raw(POKEMON_COLUMNS)},
        p.is_mega    AS "isMega",
        p.is_gmax    AS "isGmax",
        p.is_regional AS "isRegional",
        p.species_id AS "speciesId",
        COALESCE(s.display_name, s.name) AS "baseName",
        base.id      AS "basePokemonId"
      FROM dex.pokemon p
      JOIN dex.species s ON s.id = p.species_id
      JOIN LATERAL (
        SELECT b.id FROM dex.pokemon b
        WHERE b.species_id = p.species_id AND b.is_default
        LIMIT 1
      ) base ON true
      WHERE p.is_gmax
      ORDER BY p.species_id, p.id
    `)) as unknown as (PokemonRow & {
      isMega: boolean;
      isGmax: boolean;
      isRegional: boolean;
      speciesId: number;
      baseName: string;
      basePokemonId: number;
    })[];

    return c.json({
      items: rows.map((row) => ({
        ...toPokemonSummary(row),
        isMega: row.isMega,
        isGmax: row.isGmax,
        isRegional: row.isRegional,
        speciesId: row.speciesId,
        baseName: row.baseName,
        basePokemonId: row.basePokemonId,
      })),
    });
  })

  /**
   * GET /v1/pokemon/:id/forms — every variety of a species, default first.
   *
   * `?scope=family` widens it to the whole evolution chain. Megas and
   * Gigantamax forms belong to one stage — Venusaur's, never Bulbasaur's — so
   * a species-scoped answer means the detail page can only ever show them on
   * the last stage, which is exactly where nobody is looking for them.
   * Rows carry their own species so the client can group.
   */
  .get('/:id/forms', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) throw ApiError.badRequest('Pokémon id must be an integer');
    const family = c.req.query('scope') === 'family';

    const scope = family
      ? sql`p.species_id IN (
          SELECT s.id FROM dex.species s
          WHERE s.evolution_chain_id IS NOT NULL
            AND s.evolution_chain_id = (
              SELECT sp.evolution_chain_id FROM dex.pokemon dp
              JOIN dex.species sp ON sp.id = dp.species_id
              WHERE dp.id = ${id}
            )
          UNION
          SELECT species_id FROM dex.pokemon WHERE id = ${id}
        )`
      : sql`p.species_id = (SELECT species_id FROM dex.pokemon WHERE id = ${id})`;

    const rows = (await c.var.db.execute(sql`
      SELECT
        ${sql.raw(POKEMON_COLUMNS)},
        p.is_mega     AS "isMega",
        p.is_gmax     AS "isGmax",
        p.is_regional AS "isRegional",
        p.species_id  AS "speciesId",
        COALESCE(s.display_name, s.name) AS "speciesName"
      FROM dex.pokemon p
      JOIN dex.species s ON s.id = p.species_id
      WHERE ${scope}
      -- Species ids ascend with evolution order inside a family, which is the
      -- order the chain itself renders in.
      ORDER BY p.species_id, p.is_default DESC, p.id
    `)) as unknown as (PokemonRow & {
      isMega: boolean;
      isGmax: boolean;
      isRegional: boolean;
      speciesId: number;
      speciesName: string;
    })[];

    if (rows.length === 0) throw ApiError.notFound('Pokémon');

    return c.json({
      items: rows.map((row) => ({
        ...toPokemonSummary(row),
        isMega: row.isMega,
        isGmax: row.isGmax,
        isRegional: row.isRegional,
        speciesId: row.speciesId,
        speciesName: row.speciesName,
      })),
    });
  })

  /** GET /v1/pokemon/:idOrName — accepts either `25` or `pikachu`. */
  .get('/:idOrName', async (c) => {
    const raw = c.req.param('idOrName');
    const asId = Number(raw);
    const match = Number.isInteger(asId) ? sql`p.id = ${asId}` : sql`p.name = ${raw.toLowerCase()}`;

    type DetailRow = PokemonRow & {
      speciesId: number;
      speciesName: string;
      isMega: boolean;
      isGmax: boolean;
      isRegional: boolean;
      genus: string | null;
      description: string | null;
      color: string | null;
      habitat: string | null;
      captureRate: number | null;
      growthRate: string | null;
      isLegendary: boolean;
      isMythical: boolean;
    };

    const [row] = (await c.var.db.execute(sql`
      SELECT
        ${sql.raw(POKEMON_COLUMNS)},
        p.species_id       AS "speciesId",
        COALESCE(s.display_name, s.name) AS "speciesName",
        p.is_mega          AS "isMega",
        p.is_gmax          AS "isGmax",
        p.is_regional      AS "isRegional",
        s.genus,
        s.description,
        s.color,
        s.habitat,
        s.capture_rate     AS "captureRate",
        s.is_legendary     AS "isLegendary",
        s.is_mythical      AS "isMythical",
        gr.name            AS "growthRate"
      FROM dex.pokemon p
      JOIN dex.species s ON s.id = p.species_id
      LEFT JOIN dex.growth_rates gr ON gr.id = s.growth_rate_id
      WHERE ${match}
      LIMIT 1
    `)) as unknown as DetailRow[];

    if (!row) throw ApiError.notFound('Pokémon');

    const [abilities, efficacy] = await Promise.all([
      c.var.db.execute(sql`
        SELECT a.display_name AS name, pa.slot, pa.is_hidden AS "isHidden", a.short_effect AS "shortEffect"
        FROM dex.pokemon_abilities pa
        JOIN dex.abilities a ON a.id = pa.ability_id
        WHERE pa.pokemon_id = ${row.id}
        ORDER BY pa.slot
      `),
      c.var.db.execute(sql`
        SELECT atk.name AS "attackType", te.damage_factor AS factor
        FROM dex.pokemon_types pt
        JOIN dex.type_efficacy te ON te.target_type_id = pt.type_id
        JOIN dex.types atk ON atk.id = te.damage_type_id
        WHERE pt.pokemon_id = ${row.id}
      `),
    ]);

    return c.json({
      ...toPokemonSummary(row),
      speciesId: row.speciesId,
      speciesName: row.speciesName,
      isMega: row.isMega,
      isGmax: row.isGmax,
      isRegional: row.isRegional,
      species: {
        genus: row.genus ?? null,
        description: row.description ?? null,
        color: row.color ?? null,
        habitat: row.habitat ?? null,
        captureRate: row.captureRate ?? null,
        growthRate: row.growthRate ?? null,
        isLegendary: Boolean(row.isLegendary),
        isMythical: Boolean(row.isMythical),
      },
      abilities: abilities as unknown as unknown[],
      matchups: buildMatchups(efficacy as unknown as { attackType: string; factor: number }[]),
    });
  })

  /**
   * GET /v1/pokemon/:id/evolution
   *
   * The recursive CTE that replaces Oracle's
   * `START WITH ... CONNECT BY NOCYCLE PRIOR ... OR PRIOR ...`.
   *
   * It descends from the chain root rather than walking outward from the
   * requested species, which is what makes branching chains work: Eevee's eight
   * evolutions all sit at depth 1 under the same parent, whereas a walker that
   * follows a single `evolves_from` link renders one arbitrary branch.
   */
  .get('/:id/evolution', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) throw ApiError.badRequest('Pokémon id must be an integer');

    const rows = await c.var.db.execute(sql`
      WITH RECURSIVE root AS (
        SELECT sp.evolution_chain_id AS chain_id
        FROM dex.pokemon p
        JOIN dex.species sp ON sp.id = p.species_id
        WHERE p.id = ${id}
      ),
      tree AS (
        SELECT s.id, s.name, s.display_name, s.evolves_from_species_id, 0 AS depth
        FROM dex.species s, root
        WHERE s.evolution_chain_id = root.chain_id
          AND s.evolves_from_species_id IS NULL
        UNION ALL
        SELECT child.id, child.name, child.display_name, child.evolves_from_species_id, tree.depth + 1
        FROM dex.species child
        JOIN tree ON child.evolves_from_species_id = tree.id
      )
      SELECT
        tree.id,
        COALESCE(tree.display_name, tree.name) AS name,
        tree.depth,
        tree.evolves_from_species_id AS "from",
        pk.sprite,
        pk.artwork,
        ev.trigger,
        ev.minimum_level      AS "minLevel",
        ev.trigger_item       AS item,
        ev.held_item          AS "heldItem",
        ev.minimum_happiness  AS "minHappiness",
        ev.time_of_day        AS "timeOfDay",
        ev.known_move         AS "knownMove",
        ${evolutionMethods(sql`tree.id`)} AS methods
      FROM tree
      LEFT JOIN LATERAL (
        SELECT * FROM dex.pokemon dp
        WHERE dp.species_id = tree.id AND dp.is_default
        LIMIT 1
      ) pk ON true
      -- LATERAL, not a plain LEFT JOIN: a species can have several evolution
      -- rows (Raichu has one per regional form) and joining them all duplicates
      -- the species in the chain. Lowest id is the original, non-regional entry.
      LEFT JOIN LATERAL (
        SELECT * FROM dex.evolution e
        WHERE e.evolved_species_id = tree.id
        ORDER BY e.id
        LIMIT 1
      ) ev ON true
      ORDER BY tree.depth, tree.id
    `);

    return c.json({ items: rows as unknown as unknown[] });
  })

  /**
   * GET /v1/pokemon/:id/encounters — "where do I find this thing".
   *
   * One indexed scan over the pre-joined `dex.encounters` table. The reference
   * project answered this from 12 hand-typed `foundAt` rows.
   */
  .get('/:id/encounters', async (c) => {
    const id = Number(c.req.param('id'));
    if (!Number.isInteger(id)) throw ApiError.badRequest('Pokémon id must be an integer');

    const rows = (await c.var.db.execute(sql`
      SELECT
        r.id                AS "regionId",
        r.name              AS "regionName",
        l.id                AS "locationId",
        l.name              AS "locationName",
        l.display_name      AS "locationDisplayName",
        la.id               AS "areaId",
        la.display_name     AS "areaDisplayName",
        em.name             AS method,
        e.rarity            AS chance,
        e.min_level         AS "minLevel",
        e.max_level         AS "maxLevel",
        e.conditions,
        e.versions
      FROM dex.encounters e
      JOIN dex.location_areas la ON la.id = e.location_area_id
      JOIN dex.locations l ON l.id = la.location_id
      LEFT JOIN dex.regions r ON r.id = l.region_id
      JOIN dex.encounter_methods em ON em.id = e.method_id
      WHERE e.pokemon_id = ${id}
      ORDER BY r.id NULLS LAST, l.display_name, e.rarity DESC
    `)) as unknown as { chance: number }[];

    return c.json({
      items: rows.map((row) => ({ ...row, rarity: rarityFromChance(row.chance) })),
    });
  });
