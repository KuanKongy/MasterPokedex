import type {
  Activity,
  CaughtPokemon,
  Friendship,
  TrainerProfile,
  TrainerSummary,
} from '@masterpokedex/shared';
import { toPokemonSummary, type PokemonRow } from './serialize';

/**
 * Row → wire mappers for the trainer domain, mirroring lib/serialize.ts for
 * the dex. Queries alias columns to the exact contract keys, so the mappers
 * mostly pick fields and normalise timestamps; explicit picking (rather than
 * spreading) keeps incidental SELECT columns off the wire.
 */

const iso = (value: Date | string): string => new Date(value).toISOString();

/** Columns for a trainer summary; expects `tr`, and the joins below. */
export const TRAINER_SUMMARY_COLUMNS = `
  tr.id,
  tr.username,
  tr.display_name AS "displayName",
  tr.avatar_url   AS "avatarUrl",
  tr.region_id    AS "regionId",
  reg.display_name AS "regionName",
  tr.rank,
  tr.badges,
  ft.name         AS "favoriteType",
  tr.is_guest     AS "isGuest",
  (SELECT count(*) FROM public.caught_pokemon cc WHERE cc.trainer_id = tr.id)::int AS "caughtCount"
`;

export const TRAINER_SUMMARY_JOINS = `
  LEFT JOIN dex.regions reg ON reg.id = tr.region_id
  LEFT JOIN dex.types   ft  ON ft.id  = tr.favorite_type_id
`;

export const TRAINER_PROFILE_COLUMNS = `${TRAINER_SUMMARY_COLUMNS},
  tr.bio,
  tr.is_public  AS "isPublic",
  tr.created_at AS "createdAt",
  (SELECT count(*) FROM public.teams tm WHERE tm.trainer_id = tr.id)::int AS "teamCount",
  (SELECT count(DISTINCT cc.pokemon_id) FROM public.caught_pokemon cc WHERE cc.trainer_id = tr.id)::int AS "uniqueSpeciesCount",
  (SELECT count(*) FROM public.caught_pokemon cc WHERE cc.trainer_id = tr.id AND cc.is_shiny)::int AS "shinyCount"
`;

export type TrainerSummaryRow = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  regionId: number | null;
  regionName: string | null;
  rank: TrainerSummary['rank'];
  badges: number;
  favoriteType: TrainerSummary['favoriteType'];
  isGuest: boolean;
  caughtCount: number;
};

export type TrainerProfileRow = TrainerSummaryRow & {
  bio: string | null;
  isPublic: boolean;
  createdAt: Date | string;
  teamCount: number;
  uniqueSpeciesCount: number;
  shinyCount: number;
};

export function toTrainerSummary(row: TrainerSummaryRow): TrainerSummary {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    regionId: row.regionId,
    regionName: row.regionName,
    rank: row.rank,
    badges: row.badges,
    favoriteType: row.favoriteType,
    caughtCount: row.caughtCount,
    isGuest: row.isGuest,
  };
}

export function toTrainerProfile(
  row: TrainerProfileRow,
  friendshipStatus?: TrainerProfile['friendshipStatus'],
): TrainerProfile {
  return {
    ...toTrainerSummary(row),
    bio: row.bio,
    isPublic: row.isPublic,
    createdAt: iso(row.createdAt),
    teamCount: row.teamCount,
    uniqueSpeciesCount: row.uniqueSpeciesCount,
    shinyCount: row.shinyCount,
    ...(friendshipStatus ? { friendshipStatus } : {}),
  };
}

/**
 * Columns for a caught Pokémon with its dex summary denormalised in. Expects
 * `cp` (caught_pokemon), `p` (dex.pokemon) and `cla` (caught location area).
 * The caught row's own id is aliased so it cannot collide with `p.id` from
 * POKEMON_COLUMNS, which the shared PokemonRow mapper still needs intact.
 */
export const CAUGHT_COLUMNS = `
  cp.id          AS "caughtId",
  cp.team_id     AS "teamId",
  cp.pokemon_id  AS "pokemonId",
  cp.nickname,
  cp.level,
  cp.experience,
  cp.is_shiny    AS "isShiny",
  cp.gender,
  cp.height_cm   AS "heightCm",
  cp.weight_kg   AS "weightKg",
  cp.caught_at   AS "caughtAt",
  cp.caught_location_area_id AS "caughtLocationAreaId",
  cla.display_name AS "caughtLocationName",
  cp.notes
`;

export type CaughtRow = PokemonRow & {
  caughtId: string;
  teamId: string;
  pokemonId: number;
  nickname: string | null;
  level: number;
  experience: number;
  isShiny: boolean;
  gender: CaughtPokemon['gender'];
  heightCm: number | null;
  weightKg: number | null;
  caughtAt: Date | string;
  caughtLocationAreaId: number | null;
  caughtLocationName: string | null;
  notes: string | null;
};

export function toCaughtPokemon(row: CaughtRow): CaughtPokemon {
  return {
    id: row.caughtId,
    teamId: row.teamId,
    pokemonId: row.pokemonId,
    nickname: row.nickname,
    level: row.level,
    experience: row.experience,
    isShiny: row.isShiny,
    gender: row.gender,
    heightCm: row.heightCm,
    weightKg: row.weightKg,
    caughtAt: iso(row.caughtAt),
    caughtLocationAreaId: row.caughtLocationAreaId,
    caughtLocationName: row.caughtLocationName,
    notes: row.notes,
    pokemon: toPokemonSummary(row),
  };
}

export type FriendshipRow = TrainerSummaryRow & {
  friendshipId: string;
  status: Friendship['status'];
  requesterId: string;
  createdAt: Date | string;
  respondedAt: Date | string | null;
};

/** `viewerId` decides the direction; `tr` in the query is the *other* trainer. */
export function toFriendship(row: FriendshipRow, viewerId: string): Friendship {
  return {
    id: row.friendshipId,
    status: row.status,
    direction: row.requesterId === viewerId ? 'outgoing' : 'incoming',
    createdAt: iso(row.createdAt),
    respondedAt: row.respondedAt === null ? null : iso(row.respondedAt),
    trainer: toTrainerSummary(row),
  };
}

export type ActivityRow = TrainerSummaryRow & {
  activityId: string;
  kind: Activity['kind'];
  payload: Record<string, unknown>;
  activityCreatedAt: Date | string;
};

export function toActivity(row: ActivityRow): Activity {
  return {
    id: row.activityId,
    kind: row.kind,
    createdAt: iso(row.activityCreatedAt),
    trainer: toTrainerSummary(row),
    payload: row.payload,
  };
}
