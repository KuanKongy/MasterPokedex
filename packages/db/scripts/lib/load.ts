import type { Sql } from 'postgres';

/** Postgres caps a single statement at 65535 bind parameters. */
const MAX_BIND_PARAMS = 60000;

export type LoadResult = { table: string; rows: number; ms: number };

/**
 * Bulk-loads rows via postgres.js's `sql(rows, ...columns)` helper, batched to
 * stay under the bind-parameter ceiling.
 *
 * COPY FROM STDIN would be faster, but it requires hand-serialising every value
 * into Postgres's text format — including NULLs, embedded quotes in flavour
 * text, and `text[]` literals for encounter conditions. A quoting bug there
 * fails silently by writing the wrong data. Parameterised inserts cannot, and
 * at this scale (~250k rows, a one-off seed) the difference is seconds.
 */
export async function loadTable<T extends Record<string, unknown>>(
  sql: Sql,
  table: string,
  columns: readonly (keyof T & string)[],
  rows: T[],
): Promise<LoadResult> {
  const started = Date.now();

  if (rows.length === 0) {
    return { table, rows: 0, ms: 0 };
  }

  const batchSize = Math.max(1, Math.floor(MAX_BIND_PARAMS / columns.length));

  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    await sql`INSERT INTO ${sql.unsafe(table)} ${sql(batch as never, ...(columns as string[]))}`;
  }

  return { table, rows: rows.length, ms: Date.now() - started };
}

/**
 * Truncates the dex tables in dependency order. The seed is a full replace, not
 * an incremental sync — reference data has no local edits worth preserving, and
 * a wholesale reload is the only way to pick up upstream corrections.
 */
export async function truncateDex(sql: Sql): Promise<void> {
  await sql`
    TRUNCATE TABLE
      dex.location_items,
      dex.encounters,
      dex.encounter_methods,
      dex.location_meta,
      dex.location_areas,
      dex.locations,
      dex.regions,
      dex.evolution,
      dex.pokemon_moves,
      dex.moves,
      dex.pokemon_abilities,
      dex.abilities,
      dex.pokemon_types,
      dex.pokemon,
      dex.species,
      dex.experience,
      dex.growth_rates,
      dex.type_efficacy,
      dex.types,
      dex.items,
      dex.item_categories
    RESTART IDENTITY CASCADE
  `;
}

export function report(results: LoadResult[]): void {
  const width = Math.max(...results.map((r) => r.table.length));
  let total = 0;
  for (const r of results) {
    total += r.rows;
    console.log(`  ${r.table.padEnd(width)}  ${String(r.rows).padStart(7)} rows  ${String(r.ms).padStart(6)}ms`);
  }
  console.log(`  ${'total'.padEnd(width)}  ${String(total).padStart(7)} rows`);
}
