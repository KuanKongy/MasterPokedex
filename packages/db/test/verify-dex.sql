-- Verifies the ETL produced correct, complete reference data — not just that
-- rows arrived. Every check here would have caught a real class of transform
-- bug: a wrong stat_id mapping, a dropped language filter, a join that silently
-- lost rows, an off-by-one in the encounter aggregation.
--
-- Run via: bun run --filter '@masterpokedex/db' verify

BEGIN;

-- ── Row-count floors ─────────────────────────────────────────────────────────
DO $$
DECLARE
  v_pokemon   integer;
  v_species   integer;
  v_types     integer;
  v_efficacy  integer;
  v_encounter integer;
  v_items     integer;
BEGIN
  SELECT count(*) INTO v_pokemon   FROM dex.pokemon;
  SELECT count(*) INTO v_species   FROM dex.species;
  SELECT count(*) INTO v_types     FROM dex.types;
  SELECT count(*) INTO v_efficacy  FROM dex.type_efficacy;
  SELECT count(*) INTO v_encounter FROM dex.encounters;
  SELECT count(*) INTO v_items     FROM dex.items;

  IF v_types <> 18 THEN
    RAISE EXCEPTION 'FAIL[types]: expected exactly 18 battle types, got %', v_types;
  END IF;
  -- 18x18 = 324. A short chart means the type filter dropped real rows.
  IF v_efficacy <> 324 THEN
    RAISE EXCEPTION 'FAIL[type_efficacy]: expected 324 chart entries, got %', v_efficacy;
  END IF;
  IF v_species < 1000 THEN
    RAISE EXCEPTION 'FAIL[species]: expected >= 1000, got %', v_species;
  END IF;
  IF v_pokemon < 1000 THEN
    RAISE EXCEPTION 'FAIL[pokemon]: expected >= 1000, got %', v_pokemon;
  END IF;
  IF v_encounter < 20000 THEN
    RAISE EXCEPTION 'FAIL[encounters]: expected >= 20000, got %', v_encounter;
  END IF;
  IF v_items < 1000 THEN
    RAISE EXCEPTION 'FAIL[items]: expected >= 1000, got %', v_items;
  END IF;

  RAISE NOTICE 'PASS  row counts: % pokemon / % species / % encounters / % items',
    v_pokemon, v_species, v_encounter, v_items;
END $$;

-- ── Pikachu end-to-end ───────────────────────────────────────────────────────
DO $$
DECLARE
  v_name  text;
  v_types text[];
  v_total integer;
BEGIN
  SELECT p.name, p.total INTO v_name, v_total FROM dex.pokemon p WHERE p.id = 25;
  IF v_name <> 'pikachu' THEN
    RAISE EXCEPTION 'FAIL[pikachu]: id 25 is "%", not pikachu', v_name;
  END IF;
  -- 35/55/40/50/50/90 = 320. A wrong stat_id → column mapping changes this.
  IF v_total <> 320 THEN
    RAISE EXCEPTION 'FAIL[pikachu-stats]: expected base stat total 320, got %', v_total;
  END IF;

  SELECT array_agg(t.name ORDER BY pt.slot) INTO v_types
  FROM dex.pokemon_types pt JOIN dex.types t ON t.id = pt.type_id
  WHERE pt.pokemon_id = 25;
  IF v_types <> ARRAY['electric'] THEN
    RAISE EXCEPTION 'FAIL[pikachu-types]: got %', v_types;
  END IF;

  RAISE NOTICE 'PASS  pikachu: electric, base stat total %', v_total;
END $$;

DO $$
DECLARE v_abilities text[];
BEGIN
  SELECT array_agg(a.name ORDER BY pa.slot) INTO v_abilities
  FROM dex.pokemon_abilities pa JOIN dex.abilities a ON a.id = pa.ability_id
  WHERE pa.pokemon_id = 25;

  IF NOT (v_abilities @> ARRAY['static'] AND v_abilities @> ARRAY['lightning-rod']) THEN
    RAISE EXCEPTION 'FAIL[pikachu-abilities]: expected static + lightning-rod, got %', v_abilities;
  END IF;
  RAISE NOTICE 'PASS  pikachu abilities: %', v_abilities;
END $$;

-- ── Evolution chain via recursive CTE ────────────────────────────────────────
-- This is the replacement for the reference project's Oracle
-- `CONNECT BY NOCYCLE PRIOR ... OR PRIOR ...`. Walks down from the chain root,
-- so it works for branching chains too (tested with Eevee below).
DO $$
DECLARE v_chain text[];
BEGIN
  WITH RECURSIVE root AS (
    SELECT evolution_chain_id AS chain_id FROM dex.species WHERE id = 25
  ), tree AS (
    SELECT s.id, s.name, 0 AS depth
    FROM dex.species s, root
    WHERE s.evolution_chain_id = root.chain_id AND s.evolves_from_species_id IS NULL
    UNION ALL
    SELECT c.id, c.name, t.depth + 1
    FROM dex.species c JOIN tree t ON c.evolves_from_species_id = t.id
  )
  SELECT array_agg(name ORDER BY depth, id) INTO v_chain FROM tree;

  IF v_chain <> ARRAY['pichu', 'pikachu', 'raichu'] THEN
    RAISE EXCEPTION 'FAIL[evolution-chain]: expected pichu->pikachu->raichu, got %', v_chain;
  END IF;
  RAISE NOTICE 'PASS  evolution chain (recursive CTE): %', array_to_string(v_chain, ' -> ');
END $$;

DO $$
DECLARE v_count integer;
BEGIN
  WITH RECURSIVE root AS (
    SELECT evolution_chain_id AS chain_id FROM dex.species WHERE id = 133  -- eevee
  ), tree AS (
    SELECT s.id, s.name, 0 AS depth
    FROM dex.species s, root
    WHERE s.evolution_chain_id = root.chain_id AND s.evolves_from_species_id IS NULL
    UNION ALL
    SELECT c.id, c.name, t.depth + 1
    FROM dex.species c JOIN tree t ON c.evolves_from_species_id = t.id
  )
  SELECT count(*) INTO v_count FROM tree WHERE depth = 1;

  -- Eevee branches into 8 eeveelutions; a chain walker that assumes a linear
  -- line would return 1.
  IF v_count <> 8 THEN
    RAISE EXCEPTION 'FAIL[branching-chain]: expected 8 eeveelutions, got %', v_count;
  END IF;
  RAISE NOTICE 'PASS  branching chain: eevee has % direct evolutions', v_count;
END $$;

-- ── Encounters: Pikachu is findable somewhere ────────────────────────────────
DO $$
DECLARE
  v_count integer;
  v_sample text;
BEGIN
  SELECT count(*) INTO v_count FROM dex.encounters WHERE pokemon_id = 25;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'FAIL[encounters-pikachu]: no encounters — the join lost every row';
  END IF;

  SELECT l.display_name || ' / ' || la.display_name || ' (' || em.name || ')'
    INTO v_sample
  FROM dex.encounters e
  JOIN dex.location_areas la ON la.id = e.location_area_id
  JOIN dex.locations l ON l.id = la.location_id
  JOIN dex.encounter_methods em ON em.id = e.method_id
  WHERE e.pokemon_id = 25
  ORDER BY e.rarity DESC NULLS LAST
  LIMIT 1;

  RAISE NOTICE 'PASS  pikachu encounters: % locations, e.g. %', v_count, v_sample;
END $$;

-- ── Encounters: the Bulbapedia-parsed games actually landed ──────────────────
DO $$
DECLARE
  v_hisui integer;
  v_paldea integer;
  v_bdsp integer;
BEGIN
  SELECT count(*) INTO v_hisui FROM dex.encounters WHERE versions && ARRAY['legends-arceus'];
  SELECT count(*) INTO v_paldea FROM dex.encounters WHERE versions && ARRAY['scarlet','violet'];
  SELECT count(*) INTO v_bdsp FROM dex.encounters WHERE versions && ARRAY['brilliant-diamond','shining-pearl'];
  IF v_hisui < 1000 THEN
    RAISE EXCEPTION 'FAIL[encounters-hisui]: expected >= 1000 Legends: Arceus rows, got %', v_hisui;
  END IF;
  IF v_paldea < 2000 THEN
    RAISE EXCEPTION 'FAIL[encounters-paldea]: expected >= 2000 Scarlet/Violet rows, got %', v_paldea;
  END IF;
  IF v_bdsp < 500 THEN
    RAISE EXCEPTION 'FAIL[encounters-bdsp]: expected >= 500 BDSP rows, got %', v_bdsp;
  END IF;
  RAISE NOTICE 'PASS  parsed encounters: % hisui / % paldea / % bdsp', v_hisui, v_paldea, v_bdsp;
END $$;

DO $$
DECLARE v_with_versions integer; v_total integer;
BEGIN
  SELECT count(*) INTO v_total FROM dex.encounters;
  SELECT count(*) INTO v_with_versions FROM dex.encounters WHERE cardinality(versions) > 0;
  IF v_with_versions < v_total THEN
    RAISE EXCEPTION 'FAIL[encounter-versions]: % of % encounters lost their version aggregation',
      v_total - v_with_versions, v_total;
  END IF;
  RAISE NOTICE 'PASS  every encounter kept its game versions';
END $$;

-- ── Neighbours: Hisui and Paldea adjacency comes from prose and numbered
--    fields, not just infobox directions, so a parser regression would show
--    up here first. Floors sit ~80% under the regenerated actuals
--    (hisui 77/89, paldea 65/84, kanto 88/96 as of 2026-09-29). ──────────────
DO $$
DECLARE
  v_hisui integer;
  v_paldea integer;
  v_kanto integer;
BEGIN
  SELECT count(*) INTO v_hisui
  FROM dex.location_meta lm
  JOIN dex.locations l ON l.id = lm.location_id
  JOIN dex.regions r ON r.id = l.region_id
  WHERE r.name = 'hisui' AND cardinality(lm.neighbor_ids) > 0;

  SELECT count(*) INTO v_paldea
  FROM dex.location_meta lm
  JOIN dex.locations l ON l.id = lm.location_id
  JOIN dex.regions r ON r.id = l.region_id
  WHERE r.name = 'paldea' AND cardinality(lm.neighbor_ids) > 0;

  SELECT count(*) INTO v_kanto
  FROM dex.location_meta lm
  JOIN dex.locations l ON l.id = lm.location_id
  JOIN dex.regions r ON r.id = l.region_id
  WHERE r.name = 'kanto' AND cardinality(lm.neighbor_ids) > 0;

  IF v_hisui < 60 THEN
    RAISE EXCEPTION 'FAIL[neighbors-hisui]: expected >= 60 Hisui locations with neighbours, got %', v_hisui;
  END IF;
  IF v_paldea < 50 THEN
    RAISE EXCEPTION 'FAIL[neighbors-paldea]: expected >= 50 Paldea locations with neighbours, got %', v_paldea;
  END IF;
  IF v_kanto < 70 THEN
    RAISE EXCEPTION 'FAIL[neighbors-kanto]: expected >= 70 Kanto locations with neighbours, got %', v_kanto;
  END IF;
  RAISE NOTICE 'PASS  neighbours: % hisui / % paldea / % kanto locations linked', v_hisui, v_paldea, v_kanto;
END $$;

-- ── Type matchups from the full chart ────────────────────────────────────────
-- Bulbasaur is grass/poison: grass attacks are halved twice → 0.25x. The
-- reference schema, with one `weakness` and one `resistance` string per type,
-- could not represent this at all.
DO $$
DECLARE v_factor numeric;
BEGIN
  SELECT exp(sum(ln(te.damage_factor / 100.0))) INTO v_factor
  FROM dex.pokemon_types pt
  JOIN dex.type_efficacy te ON te.target_type_id = pt.type_id
  JOIN dex.types atk ON atk.id = te.damage_type_id
  WHERE pt.pokemon_id = 1 AND atk.name = 'grass';

  IF round(v_factor, 4) <> 0.25 THEN
    RAISE EXCEPTION 'FAIL[matchups]: grass vs bulbasaur should be 0.25x, got %', v_factor;
  END IF;
  RAISE NOTICE 'PASS  dual-type matchup: grass vs grass/poison = %x', round(v_factor, 2);
END $$;

-- ── English text actually made it in ─────────────────────────────────────────
DO $$
DECLARE v_desc text; v_genus text; v_ability text;
BEGIN
  SELECT description, genus INTO v_desc, v_genus FROM dex.species WHERE id = 25;
  IF v_desc IS NULL OR length(v_desc) < 20 THEN
    RAISE EXCEPTION 'FAIL[flavor-text]: pikachu description missing or truncated: %', v_desc;
  END IF;
  IF v_desc ~ '[\n\r\f]' THEN
    RAISE EXCEPTION 'FAIL[flavor-text]: control characters survived cleaning';
  END IF;
  IF v_genus IS NULL THEN
    RAISE EXCEPTION 'FAIL[genus]: pikachu has no genus';
  END IF;

  SELECT short_effect INTO v_ability FROM dex.abilities WHERE name = 'static';
  IF v_ability IS NULL THEN
    RAISE EXCEPTION 'FAIL[ability-effect]: static has no short effect';
  END IF;

  RAISE NOTICE 'PASS  english text: genus "%", description % chars', v_genus, length(v_desc);
END $$;

-- ── Curated map data survived ────────────────────────────────────────────────
DO $$
DECLARE v_x real; v_y real; v_neighbors integer;
BEGIN
  SELECT lm.map_x, lm.map_y, cardinality(lm.neighbor_ids)
    INTO v_x, v_y, v_neighbors
  FROM dex.location_meta lm
  JOIN dex.locations l ON l.id = lm.location_id
  WHERE l.name = 'pallet-town';

  -- The pin is derived from Bulbapedia's Town Map by fetch-map-pins.mjs, so
  -- the exact value moves with upstream; assert it is placed and on the map.
  IF v_x IS NULL OR v_y IS NULL OR v_x NOT BETWEEN 0 AND 100 OR v_y NOT BETWEEN 0 AND 100 THEN
    RAISE EXCEPTION 'FAIL[curated-coords]: pallet-town pin missing or off-map, got (%,%)', v_x, v_y;
  END IF;
  IF v_neighbors < 2 THEN
    RAISE EXCEPTION 'FAIL[curated-neighbors]: pallet-town has % neighbours', v_neighbors;
  END IF;
  RAISE NOTICE 'PASS  curated map data: pallet-town at (%,%) with % neighbours', v_x, v_y, v_neighbors;
END $$;

DO $$
DECLARE v_placed integer;
BEGIN
  SELECT count(*) INTO v_placed FROM dex.location_meta WHERE map_x IS NOT NULL;
  IF v_placed < 10 THEN
    RAISE EXCEPTION 'FAIL[curated-count]: only % locations placed on the map', v_placed;
  END IF;
  RAISE NOTICE 'PASS  % locations placed on region maps', v_placed;
END $$;

-- ── Movepools ────────────────────────────────────────────────────────────────
DO $$
DECLARE v_moves integer; v_orphans integer;
BEGIN
  SELECT count(*) INTO v_moves FROM dex.pokemon_moves WHERE pokemon_id = 25;
  IF v_moves < 10 THEN
    RAISE EXCEPTION 'FAIL[movepool]: pikachu knows only % moves', v_moves;
  END IF;

  -- Every default-form Pokémon should have kept a movepool; a bad version-group
  -- filter shows up here as a large orphan count.
  SELECT count(*) INTO v_orphans
  FROM dex.pokemon p
  WHERE p.is_default
    AND NOT EXISTS (SELECT 1 FROM dex.pokemon_moves pm WHERE pm.pokemon_id = p.id);

  IF v_orphans > 50 THEN
    RAISE EXCEPTION 'FAIL[movepool-coverage]: % default pokemon have no moves', v_orphans;
  END IF;
  RAISE NOTICE 'PASS  movepools: pikachu has % moves, % default pokemon without any', v_moves, v_orphans;
END $$;

-- ── Referential sanity ───────────────────────────────────────────────────────
DO $$
DECLARE v_bad integer;
BEGIN
  SELECT count(*) INTO v_bad FROM dex.pokemon p
  WHERE NOT EXISTS (SELECT 1 FROM dex.pokemon_types pt WHERE pt.pokemon_id = p.id);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'FAIL[typeless]: % pokemon have no type', v_bad;
  END IF;

  SELECT count(*) INTO v_bad FROM dex.species WHERE growth_rate_id IS NULL;
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'FAIL[growth-rate]: % species have no growth rate (breaks level derivation)', v_bad;
  END IF;

  RAISE NOTICE 'PASS  every pokemon has a type and every species a growth rate';
END $$;

ROLLBACK;
