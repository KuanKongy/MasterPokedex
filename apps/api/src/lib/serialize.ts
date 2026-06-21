import type { Matchups, PokemonSummary, PokemonTypeName } from '@masterpokedex/shared';

/** Shape the `dex.pokemon` SELECT below returns, before nesting. */
export type PokemonRow = {
  id: number;
  name: string;
  types: string[];
  sprite: string | null;
  artwork: string | null;
  height: number;
  weight: number;
  baseExperience: number | null;
  generationId: number;
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
  total: number;
};

/**
 * The wire shape is deliberately flatter than PokeAPI's. Upstream returns
 * `types: [{ slot, type: { name, url } }]` and `stats: [{ base_stat, stat: {…} }]`;
 * here they are `types: ['grass','poison']` and a stats object. Height and
 * weight stay in PokeAPI's decimetres/hectograms so the web app's existing
 * `formatHeight`/`formatWeight` helpers keep working unchanged.
 */
export function toPokemonSummary(row: PokemonRow): PokemonSummary {
  return {
    id: row.id,
    name: row.name,
    types: row.types as PokemonTypeName[],
    sprite: row.sprite,
    artwork: row.artwork,
    height: row.height,
    weight: row.weight,
    baseExperience: row.baseExperience,
    generation: row.generationId,
    stats: {
      hp: row.hp,
      attack: row.attack,
      defense: row.defense,
      specialAttack: row.specialAttack,
      specialDefense: row.specialDefense,
      speed: row.speed,
      total: row.total,
    },
  };
}

/** Columns for the pokemon SELECT, aliased to the camelCase the mapper expects. */
export const POKEMON_COLUMNS = `
  p.id,
  p.name,
  p.height,
  p.weight,
  p.base_experience  AS "baseExperience",
  p.generation_id    AS "generationId",
  p.sprite,
  p.artwork,
  p.hp,
  p.attack,
  p.defense,
  p.special_attack   AS "specialAttack",
  p.special_defense  AS "specialDefense",
  p.speed,
  p.total,
  COALESCE((
    SELECT array_agg(t.name ORDER BY pt.slot)
    FROM dex.pokemon_types pt
    JOIN dex.types t ON t.id = pt.type_id
    WHERE pt.pokemon_id = p.id
  ), '{}') AS types
`;

/**
 * Folds the per-type efficacy rows into stacked multipliers.
 *
 * Done in TypeScript rather than SQL on purpose: a dual-type Pokémon multiplies
 * two factors together, and expressing a product in Postgres means
 * `exp(sum(ln(x)))`, which throws outright on an immunity because ln(0) is
 * undefined. Two numbers are not worth that trap.
 */
export function buildMatchups(rows: Array<{ attackType: string; factor: number }>): Matchups {
  const product = new Map<string, number>();
  for (const row of rows) {
    const current = product.get(row.attackType) ?? 1;
    product.set(row.attackType, current * (row.factor / 100));
  }

  const weakTo: Matchups['weakTo'] = [];
  const resists: Matchups['resists'] = [];
  const immuneTo: PokemonTypeName[] = [];

  for (const [type, factor] of product) {
    if (factor === 0) immuneTo.push(type as PokemonTypeName);
    else if (factor > 1) weakTo.push({ type: type as PokemonTypeName, factor });
    else if (factor < 1) resists.push({ type: type as PokemonTypeName, factor });
  }

  weakTo.sort((a, b) => b.factor - a.factor || a.type.localeCompare(b.type));
  resists.sort((a, b) => a.factor - b.factor || a.type.localeCompare(b.type));
  immuneTo.sort();

  return { weakTo, resists, immuneTo };
}
