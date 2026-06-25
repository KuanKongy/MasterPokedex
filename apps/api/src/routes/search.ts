import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { POKEMON_TYPES, SearchQuerySchema, type SearchResult } from '@masterpokedex/shared';
import type { AppBindings } from '../types';

/**
 * GET /v1/search?q= — the omnisearch behind the header bar.
 *
 * Six small ILIKE queries in parallel rather than one UNION: each is a
 * per-kind LIMIT over a few hundred to a few thousand rows, so there is
 * nothing for the planner to win by combining them, and the per-kind shapes
 * stay readable. Prefix matches rank above substring matches within a kind.
 * No trigram indexes on purpose — the biggest table scanned is ~2,200 rows.
 */
export const searchRoutes = new Hono<AppBindings>().get('/', async (c) => {
  const { q, limit } = SearchQuerySchema.parse(c.req.query());
  const contains = `%${q}%`;
  const prefix = `${q}%`;
  const rank = (column: ReturnType<typeof sql>) => sql`(${column} ILIKE ${prefix}) DESC, ${column}`;

  const numeric = /^\d+$/.test(q) ? Number(q) : null;

  const [pokemon, moves, abilities, items, locations] = await Promise.all([
    c.var.db.execute(sql`
      SELECT p.id, p.name, COALESCE(s.display_name, s.name) AS "displayName", p.sprite AS image,
        array_to_string(COALESCE((
          SELECT array_agg(t.name ORDER BY pt.slot)
          FROM dex.pokemon_types pt JOIN dex.types t ON t.id = pt.type_id
          WHERE pt.pokemon_id = p.id
        ), '{}'), ' / ') AS detail
      FROM dex.pokemon p
      JOIN dex.species s ON s.id = p.species_id
      WHERE p.is_default AND (p.name ILIKE ${contains}${numeric !== null ? sql` OR p.id = ${numeric}` : sql``})
      ORDER BY ${rank(sql`p.name`)}
      LIMIT ${limit}
    `),
    c.var.db.execute(sql`
      SELECT m.id, m.name, m.display_name AS "displayName", NULL AS image,
        initcap(t.name) || ' · ' || initcap(m.damage_class) AS detail
      FROM dex.moves m JOIN dex.types t ON t.id = m.type_id
      WHERE m.display_name ILIKE ${contains} OR m.name ILIKE ${contains}
      ORDER BY ${rank(sql`m.display_name`)}
      LIMIT ${limit}
    `),
    c.var.db.execute(sql`
      SELECT a.id, a.name, COALESCE(a.display_name, a.name) AS "displayName", NULL AS image,
        left(a.short_effect, 80) AS detail
      FROM dex.abilities a
      WHERE a.id < 10000 AND (a.display_name ILIKE ${contains} OR a.name ILIKE ${contains})
      ORDER BY ${rank(sql`a.display_name`)}
      LIMIT ${limit}
    `),
    c.var.db.execute(sql`
      SELECT i.id, i.name, i.display_name AS "displayName", i.sprite AS image,
        ic.name AS detail
      FROM dex.items i
      LEFT JOIN dex.item_categories ic ON ic.id = i.category_id
      WHERE i.display_name ILIKE ${contains} OR i.name ILIKE ${contains}
      ORDER BY ${rank(sql`i.display_name`)}
      LIMIT ${limit}
    `),
    c.var.db.execute(sql`
      SELECT l.id, l.name, l.display_name AS "displayName", NULL AS image,
        COALESCE(r.display_name, r.name) AS detail
      FROM dex.locations l
      LEFT JOIN dex.regions r ON r.id = l.region_id
      WHERE l.display_name ILIKE ${contains}
      ORDER BY ${rank(sql`l.display_name`)}
      LIMIT ${limit}
    `),
  ]);

  const lowered = q.toLowerCase();
  const types = POKEMON_TYPES.filter((t) => t.includes(lowered))
    .sort((a, b) => Number(b.startsWith(lowered)) - Number(a.startsWith(lowered)) || a.localeCompare(b))
    .slice(0, limit)
    .map((name, index) => ({
      kind: 'type' as const,
      id: index,
      name,
      displayName: name.charAt(0).toUpperCase() + name.slice(1),
      image: null,
      detail: 'Type',
    }));

  const tag = (kind: SearchResult['kind'], rows: unknown) =>
    (rows as Array<Omit<SearchResult, 'kind'>>).map((row) => ({ kind, ...row }));

  const results: SearchResult[] = [
    ...tag('pokemon', pokemon),
    ...tag('move', moves),
    ...tag('ability', abilities),
    ...tag('item', items),
    ...tag('location', locations),
    ...types,
  ];

  return c.json({ query: q, items: results });
});
