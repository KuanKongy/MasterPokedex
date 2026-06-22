import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { PageQuerySchema, UsernameSchema, type TrainerProfile } from '@masterpokedex/shared';
import type { Database } from '@masterpokedex/db';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';
import { POKEMON_COLUMNS } from '../lib/serialize';
import {
  CAUGHT_COLUMNS,
  TRAINER_PROFILE_COLUMNS,
  TRAINER_SUMMARY_COLUMNS,
  TRAINER_SUMMARY_JOINS,
  toCaughtPokemon,
  toTrainerProfile,
  toTrainerSummary,
  type CaughtRow,
  type TrainerProfileRow,
  type TrainerSummaryRow,
} from '../lib/trainer-serialize';

/**
 * The public trainer directory. Visibility mirrors the RLS policy: a trainer
 * is visible when public, when they are the viewer, or when an accepted
 * friendship links them to the viewer — and an invisible trainer 404s rather
 * than 403s, so private profiles do not leak their existence.
 */

const DirectoryQuerySchema = PageQuerySchema.extend({
  q: z.string().min(1).max(50).optional(),
});

function decodeUsernameCursor(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    return Buffer.from(raw, 'base64url').toString('utf8');
  } catch {
    throw ApiError.badRequest('Invalid cursor');
  }
}

type PairStatus = { id: string; status: 'pending' | 'accepted' | 'blocked'; requesterId: string };

async function friendshipBetween(db: Database, a: string, b: string): Promise<PairStatus | null> {
  const [row] = (await db.execute(sql`
    SELECT id, status, requester_id AS "requesterId"
    FROM public.friendships
    WHERE (requester_id = ${a} AND addressee_id = ${b})
       OR (requester_id = ${b} AND addressee_id = ${a})
  `)) as unknown as PairStatus[];
  return row ?? null;
}

async function resolveVisibleTrainer(db: Database, username: string, viewerId: string | undefined) {
  if (!UsernameSchema.safeParse(username).success) throw ApiError.notFound('Trainer');

  const [row] = (await db.execute(sql`
    SELECT ${sql.raw(TRAINER_PROFILE_COLUMNS)}
    FROM public.trainers tr
    ${sql.raw(TRAINER_SUMMARY_JOINS)}
    WHERE tr.username = ${username}
  `)) as unknown as TrainerProfileRow[];
  if (!row) throw ApiError.notFound('Trainer');

  const pair = viewerId && viewerId !== row.id ? await friendshipBetween(db, viewerId, row.id) : null;
  const isSelf = viewerId === row.id;
  const isFriend = pair?.status === 'accepted';
  if (!row.isPublic && !isSelf && !isFriend) throw ApiError.notFound('Trainer');

  let friendshipStatus: TrainerProfile['friendshipStatus'];
  if (viewerId && !isSelf) {
    if (!pair) friendshipStatus = 'none';
    else if (pair.status === 'pending') {
      friendshipStatus = pair.requesterId === viewerId ? 'pending_outgoing' : 'pending_incoming';
    } else friendshipStatus = pair.status;
  }

  return { row, friendshipStatus };
}

export const trainersRoutes = new Hono<AppBindings>()
  /** GET /v1/trainers?q= — public directory, keyset-paged by username. */
  .get('/', async (c) => {
    const query = DirectoryQuerySchema.parse(c.req.query());
    const after = decodeUsernameCursor(query.cursor);

    const predicates = [sql`tr.is_public`];
    if (query.q) {
      predicates.push(sql`(tr.username ILIKE ${`%${query.q}%`} OR tr.display_name ILIKE ${`%${query.q}%`})`);
    }
    if (after) predicates.push(sql`tr.username > ${after}`);

    const rows = (await c.var.db.execute(sql`
      SELECT ${sql.raw(TRAINER_SUMMARY_COLUMNS)}
      FROM public.trainers tr
      ${sql.raw(TRAINER_SUMMARY_JOINS)}
      WHERE ${sql.join(predicates, sql` AND `)}
      ORDER BY tr.username
      LIMIT ${query.limit + 1}
    `)) as unknown as TrainerSummaryRow[];

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);
    const nextCursor =
      hasMore && last ? Buffer.from(last.username, 'utf8').toString('base64url') : null;

    return c.json({ items: page.map(toTrainerSummary), nextCursor });
  })

  /** GET /v1/trainers/:username — friendshipStatus only for signed-in viewers. */
  .get('/:username', async (c) => {
    const { row, friendshipStatus } = await resolveVisibleTrainer(
      c.var.db,
      c.req.param('username'),
      c.var.auth?.userId,
    );
    return c.json(toTrainerProfile(row, friendshipStatus));
  })

  /** GET /v1/trainers/:username/teams — same visibility as the profile. */
  .get('/:username/teams', async (c) => {
    const { row } = await resolveVisibleTrainer(c.var.db, c.req.param('username'), c.var.auth?.userId);

    const [teams, caught] = await Promise.all([
      c.var.db.execute(sql`
        SELECT
          tm.id,
          tm.trainer_id AS "trainerId",
          tm.name,
          tm.description,
          tm.category,
          tc.capacity,
          tm.sort_order AS "sortOrder",
          tm.created_at AS "createdAt"
        FROM public.teams tm
        JOIN public.team_categories tc ON tc.slug = tm.category
        WHERE tm.trainer_id = ${row.id}
        ORDER BY tm.sort_order, tm.created_at
      `) as unknown as Promise<
        Array<{
          id: string;
          trainerId: string;
          name: string;
          description: string | null;
          category: 'party' | 'box' | 'showcase';
          capacity: number;
          sortOrder: number;
          createdAt: Date | string;
        }>
      >,
      c.var.db.execute(sql`
        SELECT ${sql.raw(CAUGHT_COLUMNS)}, ${sql.raw(POKEMON_COLUMNS)}
        FROM public.caught_pokemon cp
        JOIN dex.pokemon p ON p.id = cp.pokemon_id
        LEFT JOIN dex.location_areas cla ON cla.id = cp.caught_location_area_id
        WHERE cp.trainer_id = ${row.id}
        ORDER BY cp.caught_at DESC, cp.id
      `) as unknown as Promise<CaughtRow[]>,
    ]);

    const byTeam = new Map<string, CaughtRow[]>();
    for (const member of caught) {
      const members = byTeam.get(member.teamId) ?? [];
      members.push(member);
      byTeam.set(member.teamId, members);
    }

    return c.json({
      items: teams.map((t) => ({
        id: t.id,
        trainerId: t.trainerId,
        name: t.name,
        description: t.description,
        category: t.category,
        capacity: t.capacity,
        sortOrder: t.sortOrder,
        createdAt: new Date(t.createdAt).toISOString(),
        members: (byTeam.get(t.id) ?? []).map(toCaughtPokemon),
      })),
    });
  });
