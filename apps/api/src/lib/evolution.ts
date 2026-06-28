import { sql, type SQL } from 'drizzle-orm';

/**
 * Every way a species can be reached, as a JSON array.
 *
 * A species has one `dex.evolution` row per *method*, not one in total:
 * Leafeon has six, because "level up beside a Mossy Rock" and "use a Leaf
 * Stone" are different generations' answers. The chain endpoints used to take
 * `ORDER BY e.id LIMIT 1` — the oldest row — which is why Sylveon captioned as
 * a bare "Level Up" (its Gen 6 row is a Fairy-move-plus-affection rule, and
 * both of those columns were dropped on the way in) and Leafeon lost its rock.
 *
 * Aggregating rather than joining also sidesteps the duplication the LIMIT 1
 * was there to prevent: regional variants add rows, not chain nodes.
 *
 * Ids are resolved to names here so the client never has to look anything up
 * to write a sentence.
 */
export function evolutionMethods(speciesRef: SQL): SQL {
  return sql`COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'trigger',               e.trigger,
      'minLevel',              e.minimum_level,
      'item',                  e.trigger_item,
      'heldItem',              e.held_item,
      'knownMove',             e.known_move,
      'knownMoveType',         e.known_move_type,
      'minHappiness',          e.minimum_happiness,
      'minAffection',          e.minimum_affection,
      'minBeauty',             e.minimum_beauty,
      'timeOfDay',             e.time_of_day,
      'gender',                e.gender,
      'location',              COALESCE(l.display_name, l.name),
      'nearSpecialRock',       e.near_special_rock,
      'relativePhysicalStats', e.relative_physical_stats,
      'partySpecies',          e.party_species,
      'partyType',             e.party_type,
      'tradeSpecies',          e.trade_species,
      'needsMultiplayer',      e.needs_multiplayer,
      'usedMove',              e.used_move,
      'minMoveCount',          e.minimum_move_count,
      'minSteps',              e.minimum_steps,
      'minDamageTaken',        e.minimum_damage_taken,
      'region',                r.display_name,
      'needsOverworldRain',    e.needs_overworld_rain,
      'turnUpsideDown',        e.turn_upside_down
    ) ORDER BY e.id)
    FROM dex.evolution e
    LEFT JOIN dex.locations l ON l.id = e.location_id
    LEFT JOIN dex.regions r ON r.id = e.region_id
    WHERE e.evolved_species_id = ${speciesRef}
  ), '[]'::jsonb)`;
}
