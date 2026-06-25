/**
 * ETL: PokeAPI source CSVs → our `dex` schema.
 *
 *   npm run db:seed
 *
 * This is what makes the app self-sufficient. Before it, the web app fetched
 * 151 Pokémon detail records from pokeapi.co in parallel on every cold cache —
 * from `Header.tsx`, so on every page. After it, the entire pokédex is one
 * indexed table we can join against, which is also the only reason questions
 * like "which of my friends owns a Fire-type found on Route 3" are expressible
 * at all.
 *
 * The transform is not a mirror of the CSVs. It flattens exactly the joins this
 * app performs on every request: stats become columns, English names and
 * flavour text are folded in, and encounter slots/conditions/versions collapse
 * into one row per encounter.
 *
 * Idempotent: truncates `dex` and reloads. Reference data has no local edits to
 * preserve, and a full replace is the only way to pick up upstream corrections.
 */
import postgres from 'postgres';
import { assertDirectUrl, requireEnv } from '../src/env';
import {
  ENGLISH_LANGUAGE_ID,
  bool,
  cleanFlavorText,
  cleanMoveEffect,
  int,
  loadCsv,
  num,
  prettify,
  text,
} from './lib/csv';
import { loadTable, report, truncateDex, type LoadResult } from './lib/load';
import { LOCATION_META, REGION_META } from './data/curated';

/** stat_id → column. Order matters for nothing; the mapping does. */
const STAT_COLUMN: Record<number, 'hp' | 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed'> =
  {
    1: 'hp',
    2: 'attack',
    3: 'defense',
    4: 'specialAttack',
    5: 'specialDefense',
    6: 'speed',
  };

/** Everything above 18 is `shadow` and `unknown`, which are not battle types. */
const MAX_REAL_TYPE_ID = 18;

const KEPT_MOVE_METHODS = new Set(['level-up', 'machine', 'egg', 'tutor']);

const GENDER_BY_ID: Record<number, string> = { 1: 'female', 2: 'male', 3: 'genderless' };

async function main() {
  const url = requireEnv('DIRECT_DATABASE_URL');
  assertDirectUrl(url);

  // `postgres.camel` maps camelCase keys to snake_case columns on write, so the
  // row objects below stay idiomatic TypeScript and the column lists passed to
  // loadTable are checked against them by `keyof T`.
  const sql = postgres(url, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 30,
    onnotice: () => {},
    transform: postgres.camel,
  });
  const results: LoadResult[] = [];
  const warnings: string[] = [];

  try {
    console.log('\nDownloading PokeAPI source data (cached in packages/db/.cache)…');

    const [
      csvTypes,
      csvTypeEfficacy,
      csvGrowthRates,
      csvExperience,
      csvSpecies,
      csvSpeciesNames,
      csvSpeciesFlavor,
      csvColors,
      csvHabitats,
      csvShapes,
      csvPokemon,
      csvPokemonStats,
      csvPokemonTypes,
      csvPokemonForms,
      csvPokemonFormNames,
      csvAbilities,
      csvAbilityNames,
      csvAbilityProse,
      csvPokemonAbilities,
      csvMoves,
      csvMoveNames,
      csvMoveDamageClasses,
      csvMoveEffects,
      csvPokemonMoves,
      csvMoveMethods,
      csvVersionGroups,
      csvVersions,
      csvEvolution,
      csvEvolutionTriggers,
      csvRegions,
      csvLocations,
      csvLocationNames,
      csvLocationAreas,
      csvLocationAreaProse,
      csvEncounters,
      csvEncounterSlots,
      csvEncounterMethods,
      csvEncounterConditionValues,
      csvEncounterConditionMap,
      csvItems,
      csvItemNames,
      csvItemProse,
      csvItemCategories,
      csvPockets,
    ] = await Promise.all([
      loadCsv('types'),
      loadCsv('type_efficacy'),
      loadCsv('growth_rates'),
      loadCsv('experience'),
      loadCsv('pokemon_species'),
      loadCsv('pokemon_species_names'),
      loadCsv('pokemon_species_flavor_text'),
      loadCsv('pokemon_colors'),
      loadCsv('pokemon_habitats'),
      loadCsv('pokemon_shapes'),
      loadCsv('pokemon'),
      loadCsv('pokemon_stats'),
      loadCsv('pokemon_types'),
      loadCsv('pokemon_forms'),
      loadCsv('pokemon_form_names'),
      loadCsv('abilities'),
      loadCsv('ability_names'),
      loadCsv('ability_prose'),
      loadCsv('pokemon_abilities'),
      loadCsv('moves'),
      loadCsv('move_names'),
      loadCsv('move_damage_classes'),
      loadCsv('move_effect_prose'),
      loadCsv('pokemon_moves'),
      loadCsv('pokemon_move_methods'),
      loadCsv('version_groups'),
      loadCsv('versions'),
      loadCsv('pokemon_evolution'),
      loadCsv('evolution_triggers'),
      loadCsv('regions'),
      loadCsv('locations'),
      loadCsv('location_names'),
      loadCsv('location_areas'),
      loadCsv('location_area_prose'),
      loadCsv('encounters'),
      loadCsv('encounter_slots'),
      loadCsv('encounter_methods'),
      loadCsv('encounter_condition_values'),
      loadCsv('encounter_condition_value_map'),
      loadCsv('items'),
      loadCsv('item_names'),
      loadCsv('item_prose'),
      loadCsv('item_categories'),
      loadCsv('item_pockets'),
    ]);

    console.log('Transforming…');

    // ── English name lookups ────────────────────────────────────────────────
    const en = <T extends { local_language_id: string }>(rows: T[]) =>
      rows.filter((r) => int(r.local_language_id) === ENGLISH_LANGUAGE_ID);

    const speciesNameById = new Map<number, { name: string; genus: string | null }>();
    for (const r of en(csvSpeciesNames as never)) {
      const row = r as unknown as Record<string, string>;
      speciesNameById.set(int(row.pokemon_species_id), {
        name: row.name!,
        genus: text(row.genus),
      });
    }

    // Latest English flavour text per species — highest version_id wins.
    const flavorBySpecies = new Map<number, { versionId: number; textValue: string }>();
    for (const row of csvSpeciesFlavor) {
      if (int(row.language_id) !== ENGLISH_LANGUAGE_ID) continue;
      const speciesId = int(row.species_id);
      const versionId = int(row.version_id);
      const existing = flavorBySpecies.get(speciesId);
      if (!existing || versionId > existing.versionId) {
        flavorBySpecies.set(speciesId, { versionId, textValue: cleanFlavorText(row.flavor_text ?? '') });
      }
    }

    const identById = (rows: Array<Record<string, string>>) => {
      const m = new Map<number, string>();
      for (const r of rows) m.set(int(r.id), r.identifier ?? '');
      return m;
    };

    const colorById = identById(csvColors);
    const habitatById = identById(csvHabitats);
    const shapeById = identById(csvShapes);
    const damageClassById = identById(csvMoveDamageClasses);
    const moveMethodById = identById(csvMoveMethods);
    const triggerById = identById(csvEvolutionTriggers);
    const encounterMethodById = identById(csvEncounterMethods);
    const conditionValueById = identById(csvEncounterConditionValues);
    const versionIdentById = identById(csvVersions);
    const itemIdentById = identById(csvItems);
    const moveIdentById = identById(csvMoves);
    const pocketById = identById(csvPockets);

    // ── types ───────────────────────────────────────────────────────────────
    const typeRows = csvTypes
      .filter((r) => int(r.id) <= MAX_REAL_TYPE_ID)
      .map((r) => ({
        id: int(r.id),
        name: r.identifier!,
        generationId: num(r.generation_id),
      }));
    const validTypeIds = new Set(typeRows.map((t) => t.id));

    const typeEfficacyRows = csvTypeEfficacy
      .filter((r) => validTypeIds.has(int(r.damage_type_id)) && validTypeIds.has(int(r.target_type_id)))
      .map((r) => ({
        damageTypeId: int(r.damage_type_id),
        targetTypeId: int(r.target_type_id),
        damageFactor: int(r.damage_factor),
      }));

    // ── growth rates + experience ───────────────────────────────────────────
    const growthRateRows = csvGrowthRates.map((r) => ({ id: int(r.id), name: r.identifier! }));
    const validGrowthRates = new Set(growthRateRows.map((g) => g.id));

    const experienceRows = csvExperience
      .filter((r) => validGrowthRates.has(int(r.growth_rate_id)))
      .map((r) => ({
        growthRateId: int(r.growth_rate_id),
        level: int(r.level),
        experience: int(r.experience),
      }));

    // ── species ─────────────────────────────────────────────────────────────
    const speciesRows = csvSpecies.map((r) => {
      const id = int(r.id);
      const localized = speciesNameById.get(id);
      const growthRateId = int(r.growth_rate_id);
      return {
        id,
        name: r.identifier!,
        displayName: localized?.name ?? prettify(r.identifier ?? ''),
        genus: localized?.genus ?? null,
        description: flavorBySpecies.get(id)?.textValue ?? null,
        generationId: int(r.generation_id, 1),
        evolvesFromSpeciesId: num(r.evolves_from_species_id),
        evolutionChainId: num(r.evolution_chain_id),
        color: colorById.get(int(r.color_id)) ?? null,
        habitat: habitatById.get(int(r.habitat_id)) ?? null,
        shape: shapeById.get(int(r.shape_id)) ?? null,
        genderRate: num(r.gender_rate),
        captureRate: num(r.capture_rate),
        baseHappiness: num(r.base_happiness),
        hatchCounter: num(r.hatch_counter),
        isBaby: bool(r.is_baby),
        isLegendary: bool(r.is_legendary),
        isMythical: bool(r.is_mythical),
        growthRateId: validGrowthRates.has(growthRateId) ? growthRateId : null,
      };
    });
    const validSpeciesIds = new Set(speciesRows.map((s) => s.id));
    const generationBySpecies = new Map(speciesRows.map((s) => [s.id, s.generationId]));

    // `evolves_from_species_id` is a self-reference; null out any dangling ones
    // rather than letting the FK reject the whole batch.
    for (const s of speciesRows) {
      if (s.evolvesFromSpeciesId !== null && !validSpeciesIds.has(s.evolvesFromSpeciesId)) {
        s.evolvesFromSpeciesId = null;
      }
    }

    // ── pokemon (with stats pivoted into columns) ───────────────────────────
    const statsByPokemon = new Map<number, Partial<Record<string, number>>>();
    for (const r of csvPokemonStats) {
      const column = STAT_COLUMN[int(r.stat_id)];
      if (!column) continue;
      const pid = int(r.pokemon_id);
      let entry = statsByPokemon.get(pid);
      if (!entry) {
        entry = {};
        statsByPokemon.set(pid, entry);
      }
      entry[column] = int(r.base_stat);
    }

    /**
     * Form metadata. A pokemon row can own several form rows (cosmetic variants
     * like Unown letters); the `is_default = 1` form row carries the canonical
     * identity of that pokemon row. Labels come from pokemon_form_names'
     * `pokemon_name` ("Mega Charizard X"), which unlike `form_name` ("Mega X")
     * reads correctly standing alone; it is empty for plain base forms.
     */
    type FormInfo = { formIdentifier: string; isMega: boolean; label: string | null };
    const formNameByFormId = new Map<number, string>();
    for (const r of en(csvPokemonFormNames as never)) {
      const row = r as unknown as Record<string, string>;
      const label = text(row.pokemon_name) ?? text(row.form_name);
      if (label) formNameByFormId.set(int(row.pokemon_form_id), label);
    }
    const formByPokemonId = new Map<number, FormInfo>();
    for (const r of csvPokemonForms) {
      if (!bool(r.is_default)) continue; // the pokemon row's own identity, not a cosmetic sub-form
      formByPokemonId.set(int(r.pokemon_id), {
        formIdentifier: r.form_identifier ?? '',
        isMega: bool(r.is_mega),
        label: formNameByFormId.get(int(r.id)) ?? null,
      });
    }
    const REGIONAL_FORM_PREFIX = /^(alola|galar|hisui|paldea)/;

    let skippedForStats = 0;
    const pokemonRows = csvPokemon
      .map((r) => {
        const id = int(r.id);
        const speciesId = int(r.species_id);
        const stats = statsByPokemon.get(id);
        if (!validSpeciesIds.has(speciesId) || !stats || stats.hp === undefined) {
          skippedForStats += 1;
          return null;
        }
        const isDefault = bool(r.is_default);
        const form = formByPokemonId.get(id);
        return {
          id,
          name: r.identifier!,
          speciesId,
          generationId: generationBySpecies.get(speciesId) ?? 1,
          height: int(r.height),
          weight: int(r.weight),
          baseExperience: num(r.base_experience),
          isDefault,
          sortOrder: num(r.order),
          formLabel: !isDefault ? (form?.label ?? prettify(r.identifier ?? '')) : null,
          isMega: form?.isMega ?? false,
          isGmax: form?.formIdentifier === 'gmax',
          isRegional:
            REGIONAL_FORM_PREFIX.test(form?.formIdentifier ?? '') ||
            /-(alola|galar|hisui|paldea)$/.test(r.identifier ?? ''),
          hp: stats.hp ?? 1,
          attack: stats.attack ?? 1,
          defense: stats.defense ?? 1,
          specialAttack: stats.specialAttack ?? 1,
          specialDefense: stats.specialDefense ?? 1,
          speed: stats.speed ?? 1,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    const validPokemonIds = new Set(pokemonRows.map((p) => p.id));
    if (skippedForStats > 0) {
      warnings.push(`skipped ${skippedForStats} pokemon rows with missing species or stats`);
    }
    const megaCount = pokemonRows.filter((p) => p.isMega).length;
    if (megaCount !== 97) {
      warnings.push(`expected 97 mega forms, tagged ${megaCount} — upstream pokemon_forms.csv changed?`);
    }

    const pokemonTypeRows = csvPokemonTypes
      .filter((r) => validPokemonIds.has(int(r.pokemon_id)) && validTypeIds.has(int(r.type_id)))
      .map((r) => ({
        pokemonId: int(r.pokemon_id),
        typeId: int(r.type_id),
        slot: int(r.slot, 1),
      }));

    // ── abilities ───────────────────────────────────────────────────────────
    const abilityNameById = new Map<number, string>();
    for (const r of en(csvAbilityNames as never)) {
      const row = r as unknown as Record<string, string>;
      abilityNameById.set(int(row.ability_id), row.name!);
    }
    const abilityEffectById = new Map<number, string>();
    for (const r of en(csvAbilityProse as never)) {
      const row = r as unknown as Record<string, string>;
      const effect = text(row.short_effect);
      if (effect) abilityEffectById.set(int(row.ability_id), cleanFlavorText(effect));
    }

    const abilityRows = csvAbilities.map((r) => ({
      id: int(r.id),
      name: r.identifier!,
      displayName: abilityNameById.get(int(r.id)) ?? prettify(r.identifier ?? ''),
      shortEffect: abilityEffectById.get(int(r.id)) ?? null,
      generationId: num(r.generation_id),
    }));
    const validAbilityIds = new Set(abilityRows.map((a) => a.id));

    const pokemonAbilityRows = csvPokemonAbilities
      .filter((r) => validPokemonIds.has(int(r.pokemon_id)) && validAbilityIds.has(int(r.ability_id)))
      .map((r) => ({
        pokemonId: int(r.pokemon_id),
        abilityId: int(r.ability_id),
        isHidden: bool(r.is_hidden),
        slot: int(r.slot, 1),
      }));

    // ── moves ───────────────────────────────────────────────────────────────
    const moveNameById = new Map<number, string>();
    for (const r of en(csvMoveNames as never)) {
      const row = r as unknown as Record<string, string>;
      moveNameById.set(int(row.move_id), row.name!);
    }

    const moveEffectById = new Map<number, string>();
    for (const r of en(csvMoveEffects as never)) {
      const row = r as unknown as Record<string, string>;
      const effect = text(row.short_effect);
      if (effect) moveEffectById.set(int(row.move_effect_id), effect);
    }

    const moveRows = csvMoves
      .filter((r) => validTypeIds.has(int(r.type_id)))
      .map((r) => ({
        id: int(r.id),
        name: r.identifier!,
        displayName: moveNameById.get(int(r.id)) ?? prettify(r.identifier ?? ''),
        typeId: int(r.type_id),
        damageClass: damageClassById.get(int(r.damage_class_id)) ?? 'status',
        power: num(r.power),
        pp: num(r.pp),
        accuracy: num(r.accuracy),
        priority: int(r.priority),
        generationId: num(r.generation_id),
        shortEffect: cleanMoveEffect(moveEffectById.get(int(r.effect_id)), r.effect_chance),
      }));
    const validMoveIds = new Set(moveRows.map((m) => m.id));

    /**
     * Movepools: keep each Pokémon's most recent version group rather than one
     * global "latest". Pinning everything to Scarlet/Violet would silently drop
     * the movepool of every species that game does not include.
     *
     * The method filter has to be applied while *choosing* the version group,
     * not after. Some version groups expose only exotic learn methods — the
     * `champions` group (the highest `order` of all) has nothing but `train`
     * entries. Picking the latest group first and filtering methods second
     * makes those groups win and then discards every one of their rows, which
     * is how Pikachu ended up with an empty movepool while Bulbasaur was fine.
     */
    const vgOrder = new Map<number, number>();
    for (const r of csvVersionGroups) vgOrder.set(int(r.id), int(r.order));

    const learnMethodOf = (r: Record<string, string>) =>
      moveMethodById.get(int(r.pokemon_move_method_id)) ?? '';

    const latestVgByPokemon = new Map<number, number>();
    for (const r of csvPokemonMoves) {
      const pid = int(r.pokemon_id);
      if (!validPokemonIds.has(pid)) continue;
      if (!KEPT_MOVE_METHODS.has(learnMethodOf(r))) continue;
      const order = vgOrder.get(int(r.version_group_id)) ?? 0;
      const current = latestVgByPokemon.get(pid) ?? -1;
      if (order > current) latestVgByPokemon.set(pid, order);
    }

    const movepool = new Map<string, { pokemonId: number; moveId: number; learnMethod: string; level: number | null }>();
    for (const r of csvPokemonMoves) {
      const pokemonId = int(r.pokemon_id);
      if (!validPokemonIds.has(pokemonId)) continue;

      const moveId = int(r.move_id);
      if (!validMoveIds.has(moveId)) continue;

      const learnMethod = learnMethodOf(r);
      if (!KEPT_MOVE_METHODS.has(learnMethod)) continue;

      const order = vgOrder.get(int(r.version_group_id)) ?? 0;
      if (order !== latestVgByPokemon.get(pokemonId)) continue;

      const level = num(r.level);
      const key = `${pokemonId}:${moveId}:${learnMethod}`;
      const existing = movepool.get(key);
      // Same move learnable at several levels in one version group — keep the earliest.
      if (!existing || (level !== null && (existing.level === null || level < existing.level))) {
        movepool.set(key, { pokemonId, moveId, learnMethod, level: level === 0 ? null : level });
      }
    }
    const pokemonMoveRows = [...movepool.values()];

    // ── evolution ───────────────────────────────────────────────────────────
    const evolutionRows = csvEvolution
      .filter((r) => validSpeciesIds.has(int(r.evolved_species_id)))
      .map((r) => ({
        id: int(r.id),
        evolvedSpeciesId: int(r.evolved_species_id),
        trigger: triggerById.get(int(r.evolution_trigger_id)) ?? null,
        minimumLevel: num(r.minimum_level),
        triggerItem: itemIdentById.get(int(r.trigger_item_id)) ?? null,
        heldItem: itemIdentById.get(int(r.held_item_id)) ?? null,
        knownMove: moveIdentById.get(int(r.known_move_id)) ?? null,
        minimumHappiness: num(r.minimum_happiness),
        minimumAffection: num(r.minimum_affection),
        timeOfDay: text(r.time_of_day),
        gender: GENDER_BY_ID[int(r.gender_id)] ?? null,
        locationId: num(r.location_id),
        needsOverworldRain: bool(r.needs_overworld_rain),
        turnUpsideDown: bool(r.turn_upside_down),
      }));

    // ── world ───────────────────────────────────────────────────────────────
    const regionRows = csvRegions.map((r) => {
      const identifier = r.identifier!;
      const meta = REGION_META[identifier];
      return {
        id: int(r.id),
        name: identifier,
        displayName: meta?.displayName ?? prettify(identifier),
        description: meta?.description ?? null,
        mapImage: meta?.mapImage ?? null,
      };
    });
    const validRegionIds = new Set(regionRows.map((r) => r.id));

    const locationNameById = new Map<number, string>();
    for (const r of en(csvLocationNames as never)) {
      const row = r as unknown as Record<string, string>;
      locationNameById.set(int(row.location_id), row.name!);
    }

    const locationRows = csvLocations.map((r) => {
      const regionId = int(r.region_id);
      return {
        id: int(r.id),
        regionId: validRegionIds.has(regionId) ? regionId : null,
        name: r.identifier!,
        displayName: locationNameById.get(int(r.id)) ?? prettify(r.identifier ?? ''),
      };
    });
    const validLocationIds = new Set(locationRows.map((l) => l.id));
    const locationIdByName = new Map(locationRows.map((l) => [l.name, l.id]));

    // Curated map data. Warn loudly about slugs that do not resolve — a silent
    // miss here is an invisible hole in the map.
    const locationMetaRows: Array<{
      locationId: number;
      mapX: number | null;
      mapY: number | null;
      image: string | null;
      description: string | null;
      kind: string | null;
      neighborIds: number[];
      notableTrainers: string[];
    }> = [];
    for (const [slug, meta] of Object.entries(LOCATION_META)) {
      const locationId = locationIdByName.get(slug);
      if (locationId === undefined) {
        warnings.push(`curated location "${slug}" has no matching PokeAPI location — skipped`);
        continue;
      }
      const neighborIds: number[] = [];
      for (const neighbor of meta.neighbors) {
        const nid = locationIdByName.get(neighbor);
        if (nid === undefined) {
          warnings.push(`curated neighbour "${neighbor}" of "${slug}" does not resolve — dropped`);
          continue;
        }
        neighborIds.push(nid);
      }
      locationMetaRows.push({
        locationId,
        mapX: meta.mapX,
        mapY: meta.mapY,
        image: meta.image,
        description: meta.description,
        kind: meta.kind,
        neighborIds,
        notableTrainers: meta.notableTrainers ?? [],
      });
    }

    const areaNameById = new Map<number, string>();
    for (const r of en(csvLocationAreaProse as never)) {
      const row = r as unknown as Record<string, string>;
      areaNameById.set(int(row.location_area_id), row.name!);
    }

    const locationDisplayById = new Map(locationRows.map((l) => [l.id, l.displayName]));
    const locationAreaRows = csvLocationAreas
      .filter((r) => validLocationIds.has(int(r.location_id)))
      .map((r) => {
        const id = int(r.id);
        const locationId = int(r.location_id);
        const identifier = r.identifier ?? '';
        const fallback = identifier
          ? prettify(identifier)
          : `${locationDisplayById.get(locationId) ?? 'Area'} (main)`;
        return {
          id,
          locationId,
          name: identifier || `location-${locationId}-main`,
          displayName: areaNameById.get(id) ?? fallback,
        };
      });
    const validAreaIds = new Set(locationAreaRows.map((a) => a.id));

    const encounterMethodRows = csvEncounterMethods.map((r) => ({
      id: int(r.id),
      name: r.identifier!,
      sortOrder: num(r.order),
    }));
    const validMethodIds = new Set(encounterMethodRows.map((m) => m.id));

    // ── encounters (pre-joined and de-duplicated) ───────────────────────────
    const slotById = new Map<number, { methodId: number; slot: number | null; rarity: number }>();
    for (const r of csvEncounterSlots) {
      slotById.set(int(r.id), {
        methodId: int(r.encounter_method_id),
        slot: num(r.slot),
        rarity: num(r.rarity) ?? 0,
      });
    }

    const conditionsByEncounter = new Map<number, string[]>();
    for (const r of csvEncounterConditionMap) {
      const encounterId = int(r.encounter_id);
      const label = conditionValueById.get(int(r.encounter_condition_value_id));
      if (!label) continue;
      const list = conditionsByEncounter.get(encounterId);
      if (list) list.push(label);
      else conditionsByEncounter.set(encounterId, [label]);
    }

    type EncounterAgg = {
      locationAreaId: number;
      pokemonId: number;
      methodId: number;
      slot: number | null;
      rarity: number;
      minLevel: number;
      maxLevel: number;
      conditions: string[];
      versions: Set<string>;
    };

    const aggregated = new Map<string, EncounterAgg>();
    for (const r of csvEncounters) {
      const areaId = int(r.location_area_id);
      const pokemonId = int(r.pokemon_id);
      if (!validAreaIds.has(areaId) || !validPokemonIds.has(pokemonId)) continue;

      const slot = slotById.get(int(r.encounter_slot_id));
      if (!slot || !validMethodIds.has(slot.methodId)) continue;

      const conditions = (conditionsByEncounter.get(int(r.id)) ?? []).slice().sort();
      const minLevel = int(r.min_level, 1);
      const maxLevel = int(r.max_level, minLevel);
      const key = [
        areaId,
        pokemonId,
        slot.methodId,
        slot.slot ?? '',
        slot.rarity,
        minLevel,
        maxLevel,
        conditions.join('|'),
      ].join(':');

      const version = versionIdentById.get(int(r.version_id));
      const existing = aggregated.get(key);
      if (existing) {
        if (version) existing.versions.add(version);
      } else {
        aggregated.set(key, {
          locationAreaId: areaId,
          pokemonId,
          methodId: slot.methodId,
          slot: slot.slot,
          rarity: slot.rarity,
          minLevel,
          maxLevel,
          conditions,
          versions: new Set(version ? [version] : []),
        });
      }
    }

    let encounterId = 0;
    const encounterRows = [...aggregated.values()].map((e) => {
      encounterId += 1;
      return {
        id: encounterId,
        locationAreaId: e.locationAreaId,
        pokemonId: e.pokemonId,
        methodId: e.methodId,
        slot: e.slot,
        rarity: e.rarity,
        minLevel: e.minLevel,
        maxLevel: e.maxLevel,
        conditions: e.conditions,
        versions: [...e.versions].sort(),
      };
    });

    // ── items ───────────────────────────────────────────────────────────────
    const itemNameById = new Map<number, string>();
    for (const r of en(csvItemNames as never)) {
      const row = r as unknown as Record<string, string>;
      itemNameById.set(int(row.item_id), row.name!);
    }
    const itemEffectById = new Map<number, string>();
    for (const r of en(csvItemProse as never)) {
      const row = r as unknown as Record<string, string>;
      const effect = text(row.short_effect);
      if (effect) itemEffectById.set(int(row.item_id), cleanFlavorText(effect));
    }

    const itemCategoryRows = csvItemCategories.map((r) => ({
      id: int(r.id),
      name: r.identifier!,
      displayName: prettify(r.identifier ?? ''),
      pocket: pocketById.get(int(r.pocket_id)) ?? null,
    }));
    const validCategoryIds = new Set(itemCategoryRows.map((c) => c.id));

    // Upstream items.csv has started shipping duplicate identifiers (e.g.
    // roseli-berry as both 723 and 2279); dex.items has a unique name, so keep
    // only the lowest id per identifier — the canonical, referenced one.
    const seenItemNames = new Set<string>();
    const itemRows = csvItems
      .filter((r) => validCategoryIds.has(int(r.category_id)))
      .sort((a, b) => int(a.id) - int(b.id))
      .filter((r) => {
        if (seenItemNames.has(r.identifier!)) return false;
        seenItemNames.add(r.identifier!);
        return true;
      })
      .map((r) => ({
        id: int(r.id),
        name: r.identifier!,
        displayName: itemNameById.get(int(r.id)) ?? prettify(r.identifier ?? ''),
        categoryId: int(r.category_id),
        cost: num(r.cost),
        flingPower: num(r.fling_power),
        shortEffect: itemEffectById.get(int(r.id)) ?? null,
      }));

    // ── Load, in dependency order ───────────────────────────────────────────
    console.log('Loading into Postgres…\n');
    await truncateDex(sql);

    results.push(await loadTable(sql, 'dex.types', ['id', 'name', 'generationId'], typeRows));
    results.push(
      await loadTable(sql, 'dex.type_efficacy', ['damageTypeId', 'targetTypeId', 'damageFactor'], typeEfficacyRows),
    );
    results.push(await loadTable(sql, 'dex.growth_rates', ['id', 'name'], growthRateRows));
    results.push(await loadTable(sql, 'dex.experience', ['growthRateId', 'level', 'experience'], experienceRows));
    results.push(
      await loadTable(
        sql,
        'dex.species',
        [
          'id', 'name', 'displayName', 'genus', 'description', 'generationId',
          'evolvesFromSpeciesId', 'evolutionChainId', 'color', 'habitat', 'shape',
          'genderRate', 'captureRate', 'baseHappiness', 'hatchCounter',
          'isBaby', 'isLegendary', 'isMythical', 'growthRateId',
        ],
        speciesRows,
      ),
    );
    results.push(
      await loadTable(
        sql,
        'dex.pokemon',
        [
          'id', 'name', 'speciesId', 'generationId', 'height', 'weight',
          'baseExperience', 'isDefault', 'sortOrder',
          'formLabel', 'isMega', 'isGmax', 'isRegional',
          'hp', 'attack', 'defense', 'specialAttack', 'specialDefense', 'speed',
        ],
        pokemonRows,
      ),
    );
    results.push(await loadTable(sql, 'dex.pokemon_types', ['pokemonId', 'typeId', 'slot'], pokemonTypeRows));
    results.push(
      await loadTable(sql, 'dex.abilities', ['id', 'name', 'displayName', 'shortEffect', 'generationId'], abilityRows),
    );
    results.push(
      await loadTable(
        sql,
        'dex.pokemon_abilities',
        ['pokemonId', 'abilityId', 'isHidden', 'slot'],
        pokemonAbilityRows,
      ),
    );
    results.push(
      await loadTable(
        sql,
        'dex.moves',
        [
          'id', 'name', 'displayName', 'typeId', 'damageClass', 'power', 'pp',
          'accuracy', 'priority', 'generationId', 'shortEffect',
        ],
        moveRows,
      ),
    );
    results.push(
      await loadTable(sql, 'dex.pokemon_moves', ['pokemonId', 'moveId', 'learnMethod', 'level'], pokemonMoveRows),
    );
    results.push(
      await loadTable(
        sql,
        'dex.evolution',
        [
          'id', 'evolvedSpeciesId', 'trigger', 'minimumLevel', 'triggerItem',
          'heldItem', 'knownMove', 'minimumHappiness', 'minimumAffection',
          'timeOfDay', 'gender', 'locationId', 'needsOverworldRain', 'turnUpsideDown',
        ],
        evolutionRows,
      ),
    );
    results.push(
      await loadTable(sql, 'dex.regions', ['id', 'name', 'displayName', 'description', 'mapImage'], regionRows),
    );
    results.push(await loadTable(sql, 'dex.locations', ['id', 'regionId', 'name', 'displayName'], locationRows));
    results.push(
      await loadTable(
        sql,
        'dex.location_meta',
        ['locationId', 'mapX', 'mapY', 'image', 'description', 'kind', 'neighborIds', 'notableTrainers'],
        locationMetaRows,
      ),
    );
    results.push(
      await loadTable(sql, 'dex.location_areas', ['id', 'locationId', 'name', 'displayName'], locationAreaRows),
    );
    results.push(
      await loadTable(sql, 'dex.encounter_methods', ['id', 'name', 'sortOrder'], encounterMethodRows),
    );
    results.push(
      await loadTable(
        sql,
        'dex.encounters',
        [
          'id', 'locationAreaId', 'pokemonId', 'methodId', 'slot', 'rarity',
          'minLevel', 'maxLevel', 'conditions', 'versions',
        ],
        encounterRows,
      ),
    );
    results.push(
      await loadTable(sql, 'dex.item_categories', ['id', 'name', 'displayName', 'pocket'], itemCategoryRows),
    );
    results.push(
      await loadTable(
        sql,
        'dex.items',
        ['id', 'name', 'displayName', 'categoryId', 'cost', 'flingPower', 'shortEffect'],
        itemRows,
      ),
    );

    console.log('');
    report(results);

    await sql`ANALYZE`;

    const [{ size }] = await sql<{ size: string }[]>`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`;
    console.log(`\n  database size: ${size}`);

    if (warnings.length > 0) {
      console.log(`\n\x1b[33m${warnings.length} warning(s):\x1b[0m`);
      for (const w of warnings.slice(0, 20)) console.log(`  ! ${w}`);
      if (warnings.length > 20) console.log(`  … and ${warnings.length - 20} more`);
    }

    console.log('\n\x1b[32mdex seeded\x1b[0m\n');
  } finally {
    await sql.end({ timeout: 5 });
  }
}

await main();
