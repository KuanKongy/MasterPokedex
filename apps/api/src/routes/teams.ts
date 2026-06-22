import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import {
  CatchPokemonInputSchema,
  CreateTeamInputSchema,
  UpdateCaughtPokemonInputSchema,
  UpdateTeamInputSchema,
  type Team,
} from '@masterpokedex/shared';
import type { Database } from '@masterpokedex/db';
import type { AppBindings } from '../types';
import { ApiError, assertUuid } from '../lib/errors';
import { getAuth } from '../lib/auth';
import { POKEMON_COLUMNS } from '../lib/serialize';
import { CAUGHT_COLUMNS, toCaughtPokemon, type CaughtRow } from '../lib/trainer-serialize';

/**
 * Teams are the reference schema's Collections: named groups with a
 * category-driven capacity. The capacity lives in team_categories and is
 * enforced by a database trigger, so a full team surfaces here as the
 * `team_full` error code — never as a silently oversized insert.
 */

type TeamRow = {
  id: string;
  trainerId: string;
  name: string;
  description: string | null;
  category: Team['category'];
  capacity: number;
  sortOrder: number;
  createdAt: Date | string;
};

const TEAM_COLUMNS = `
  tm.id,
  tm.trainer_id AS "trainerId",
  tm.name,
  tm.description,
  tm.category,
  tc.capacity,
  tm.sort_order AS "sortOrder",
  tm.created_at AS "createdAt"
`;

function toTeam(row: TeamRow, members: CaughtRow[]): Team {
  return {
    id: row.id,
    trainerId: row.trainerId,
    name: row.name,
    description: row.description,
    category: row.category,
    capacity: row.capacity,
    sortOrder: row.sortOrder,
    createdAt: new Date(row.createdAt).toISOString(),
    members: members.map(toCaughtPokemon),
  };
}

async function fetchTeam(db: Database, teamId: string, trainerId: string) {
  const [team] = (await db.execute(sql`
    SELECT ${sql.raw(TEAM_COLUMNS)}
    FROM public.teams tm
    JOIN public.team_categories tc ON tc.slug = tm.category
    WHERE tm.id = ${teamId} AND tm.trainer_id = ${trainerId}
  `)) as unknown as TeamRow[];
  if (!team) throw ApiError.notFound('Team');
  return team;
}

async function fetchCaught(db: Database, where: ReturnType<typeof sql>) {
  return (await db.execute(sql`
    SELECT ${sql.raw(CAUGHT_COLUMNS)}, ${sql.raw(POKEMON_COLUMNS)}
    FROM public.caught_pokemon cp
    JOIN dex.pokemon p ON p.id = cp.pokemon_id
    LEFT JOIN dex.location_areas cla ON cla.id = cp.caught_location_area_id
    WHERE ${where}
    ORDER BY cp.caught_at DESC, cp.id
  `)) as unknown as CaughtRow[];
}

export const teamsRoutes = new Hono<AppBindings>()
  /** GET /v1/me/teams — every team with members nested, in two queries. */
  .get('/', async (c) => {
    const { userId } = getAuth(c);

    const [teams, caught] = await Promise.all([
      c.var.db.execute(sql`
        SELECT ${sql.raw(TEAM_COLUMNS)}
        FROM public.teams tm
        JOIN public.team_categories tc ON tc.slug = tm.category
        WHERE tm.trainer_id = ${userId}
        ORDER BY tm.sort_order, tm.created_at
      `) as unknown as Promise<TeamRow[]>,
      fetchCaught(c.var.db, sql`cp.trainer_id = ${userId}`),
    ]);

    const byTeam = new Map<string, CaughtRow[]>();
    for (const row of caught) {
      const members = byTeam.get(row.teamId) ?? [];
      members.push(row);
      byTeam.set(row.teamId, members);
    }

    return c.json({ items: teams.map((t) => toTeam(t, byTeam.get(t.id) ?? [])) });
  })

  /** POST /v1/me/teams */
  .post('/', async (c) => {
    const { userId } = getAuth(c);
    const input = CreateTeamInputSchema.parse(await c.req.json());

    const [created] = (await c.var.db.execute(sql`
      INSERT INTO public.teams (trainer_id, name, description, category)
      VALUES (${userId}, ${input.name}, ${input.description ?? null}, ${input.category})
      RETURNING id
    `)) as unknown as { id: string }[];

    await c.var.db.execute(sql`
      INSERT INTO public.activity (trainer_id, kind, payload)
      VALUES (${userId}, 'team_created', ${JSON.stringify({ teamName: input.name, category: input.category })}::jsonb)
    `);

    const team = await fetchTeam(c.var.db, created.id, userId);
    return c.json(toTeam(team, []), 201);
  })

  /** PATCH /v1/me/teams/:teamId */
  .patch('/:teamId', async (c) => {
    const { userId } = getAuth(c);
    const teamId = assertUuid(c.req.param('teamId'), 'teamId');
    const input = UpdateTeamInputSchema.parse(await c.req.json());

    const sets = [];
    if (input.name !== undefined) sets.push(sql`name = ${input.name}`);
    if (input.description !== undefined) sets.push(sql`description = ${input.description}`);
    if (input.sortOrder !== undefined) sets.push(sql`sort_order = ${input.sortOrder}`);
    if (sets.length === 0) throw ApiError.badRequest('No fields to update');

    const updated = (await c.var.db.execute(sql`
      UPDATE public.teams SET ${sql.join(sets, sql`, `)}
      WHERE id = ${teamId} AND trainer_id = ${userId}
      RETURNING id
    `)) as unknown as { id: string }[];
    if (updated.length === 0) throw ApiError.notFound('Team');

    const team = await fetchTeam(c.var.db, teamId, userId);
    const members = await fetchCaught(c.var.db, sql`cp.team_id = ${teamId}`);
    return c.json(toTeam(team, members));
  })

  /** DELETE /v1/me/teams/:teamId — members go with it (FK cascade). */
  .delete('/:teamId', async (c) => {
    const { userId } = getAuth(c);
    const teamId = assertUuid(c.req.param('teamId'), 'teamId');

    const deleted = (await c.var.db.execute(sql`
      DELETE FROM public.teams WHERE id = ${teamId} AND trainer_id = ${userId} RETURNING id
    `)) as unknown as { id: string }[];
    if (deleted.length === 0) throw ApiError.notFound('Team');

    return c.body(null, 204);
  })

  /**
   * POST /v1/me/teams/:teamId/pokemon — catch into a team. Level is derived
   * from experience by the database; a full team raises `team_full` (409).
   */
  .post('/:teamId/pokemon', async (c) => {
    const { userId } = getAuth(c);
    const teamId = assertUuid(c.req.param('teamId'), 'teamId');
    const input = CatchPokemonInputSchema.parse(await c.req.json());

    await fetchTeam(c.var.db, teamId, userId); // ownership; trigger re-checks

    const [created] = (await c.var.db.execute(sql`
      INSERT INTO public.caught_pokemon
        (trainer_id, team_id, pokemon_id, nickname, experience, is_shiny, gender, caught_location_area_id, notes)
      VALUES
        (${userId}, ${teamId}, ${input.pokemonId}, ${input.nickname ?? null}, ${input.experience},
         ${input.isShiny}, ${input.gender ?? null}, ${input.caughtLocationAreaId ?? null}, ${input.notes ?? null})
      RETURNING id
    `)) as unknown as { id: string }[];

    await c.var.db.execute(sql`
      INSERT INTO public.activity (trainer_id, kind, payload)
      VALUES (
        ${userId},
        ${input.isShiny ? 'shiny_caught' : 'caught'}::activity_kind,
        ${JSON.stringify({ pokemonId: input.pokemonId, nickname: input.nickname ?? null })}::jsonb
      )
    `);

    const [row] = await fetchCaught(c.var.db, sql`cp.id = ${created.id}`);
    return c.json(toCaughtPokemon(row), 201);
  });

export const caughtRoutes = new Hono<AppBindings>()
  /** PATCH /v1/me/pokemon/:id — rename, train, annotate, or move team. */
  .patch('/:id', async (c) => {
    const { userId } = getAuth(c);
    const id = assertUuid(c.req.param('id'), 'id');
    const input = UpdateCaughtPokemonInputSchema.parse(await c.req.json());

    if (input.teamId !== undefined) {
      // Moving between teams: the destination must be the caller's too. The
      // capacity trigger will still reject a move into a full team.
      await fetchTeam(c.var.db, assertUuid(input.teamId, 'teamId'), userId);
    }

    const sets = [];
    if (input.nickname !== undefined) sets.push(sql`nickname = ${input.nickname}`);
    if (input.experience !== undefined) sets.push(sql`experience = ${input.experience}`);
    if (input.teamId !== undefined) sets.push(sql`team_id = ${input.teamId}`);
    if (input.notes !== undefined) sets.push(sql`notes = ${input.notes}`);
    if (sets.length === 0) throw ApiError.badRequest('No fields to update');

    const updated = (await c.var.db.execute(sql`
      UPDATE public.caught_pokemon SET ${sql.join(sets, sql`, `)}
      WHERE id = ${id} AND trainer_id = ${userId}
      RETURNING id
    `)) as unknown as { id: string }[];
    if (updated.length === 0) throw ApiError.notFound('Caught Pokémon');

    const [row] = await fetchCaught(c.var.db, sql`cp.id = ${id}`);
    return c.json(toCaughtPokemon(row));
  })

  /** DELETE /v1/me/pokemon/:id — release. */
  .delete('/:id', async (c) => {
    const { userId } = getAuth(c);
    const id = assertUuid(c.req.param('id'), 'id');

    const deleted = (await c.var.db.execute(sql`
      DELETE FROM public.caught_pokemon WHERE id = ${id} AND trainer_id = ${userId} RETURNING id
    `)) as unknown as { id: string }[];
    if (deleted.length === 0) throw ApiError.notFound('Caught Pokémon');

    return c.body(null, 204);
  });
