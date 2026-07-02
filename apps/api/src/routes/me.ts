import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import {
  ClaimUsernameInputSchema,
  PageQuerySchema,
  UpdateProfileInputSchema,
} from '@masterpokedex/shared';
import type { Database } from '@masterpokedex/db';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';
import { getAuth } from '../lib/auth';
import { decodeFeedCursor, encodeFeedCursor } from '../lib/pagination';
import {
  TRAINER_PROFILE_COLUMNS,
  TRAINER_SUMMARY_COLUMNS,
  TRAINER_SUMMARY_JOINS,
  toActivity,
  toTrainerProfile,
  type ActivityRow,
  type TrainerProfileRow,
} from '../lib/trainer-serialize';

async function fetchOwnProfile(db: Database, userId: string) {
  const [row] = (await db.execute(sql`
    SELECT ${sql.raw(TRAINER_PROFILE_COLUMNS)}
    FROM public.trainers tr
    ${sql.raw(TRAINER_SUMMARY_JOINS)}
    WHERE tr.id = ${userId}
  `)) as unknown as TrainerProfileRow[];
  return row;
}

export const meRoutes = new Hono<AppBindings>()
  /**
   * GET /v1/me — 404 until the username is claimed. A Supabase account can
   * exist without a trainer row; the web app turns this exact 404 into the
   * claim-username onboarding step.
   */
  .get('/', async (c) => {
    const { userId } = getAuth(c);
    const row = await fetchOwnProfile(c.var.db, userId);
    if (!row) throw ApiError.notFound('Trainer profile');
    return c.json(toTrainerProfile(row));
  })

  /** POST /v1/me — claim a username, creating the trainer row for this user. */
  .post('/', async (c) => {
    const { userId } = getAuth(c);
    const input = ClaimUsernameInputSchema.parse(await c.req.json());

    const existing = await fetchOwnProfile(c.var.db, userId);
    if (existing) throw new ApiError('conflict', 'You already have a trainer profile');

    // The unique index on username races for us: a duplicate surfaces as
    // `username_taken` through the constraint mapping in lib/errors.ts.
    await c.var.db.execute(sql`
      INSERT INTO public.trainers (id, username, display_name)
      VALUES (${userId}, ${input.username}, ${input.displayName})
    `);

    const row = await fetchOwnProfile(c.var.db, userId);
    return c.json(toTrainerProfile(row), 201);
  })

  /** PATCH /v1/me — partial profile update; only provided fields change. */
  .patch('/', async (c) => {
    const { userId } = getAuth(c);
    const input = UpdateProfileInputSchema.parse(await c.req.json());

    const sets = [];
    if (input.displayName !== undefined) sets.push(sql`display_name = ${input.displayName}`);
    if (input.bio !== undefined) sets.push(sql`bio = ${input.bio}`);
    if (input.avatarUrl !== undefined) sets.push(sql`avatar_url = ${input.avatarUrl}`);
    if (input.regionId !== undefined) sets.push(sql`region_id = ${input.regionId}`);
    if (input.favoriteTypeId !== undefined) sets.push(sql`favorite_type_id = ${input.favoriteTypeId}`);
    if (input.isPublic !== undefined) sets.push(sql`is_public = ${input.isPublic}`);
    if (input.showBag !== undefined) sets.push(sql`show_bag = ${input.showBag}`);
    if (input.showFavorites !== undefined) sets.push(sql`show_favorites = ${input.showFavorites}`);
    if (input.showActivity !== undefined) sets.push(sql`show_activity = ${input.showActivity}`);
    if (input.showFriends !== undefined) sets.push(sql`show_friends = ${input.showFriends}`);
    if (input.showTeams !== undefined) sets.push(sql`show_teams = ${input.showTeams}`);
    if (sets.length === 0) throw ApiError.badRequest('No fields to update');

    const result = (await c.var.db.execute(sql`
      UPDATE public.trainers SET ${sql.join(sets, sql`, `)} WHERE id = ${userId} RETURNING id
    `)) as unknown as { id: string }[];
    if (result.length === 0) throw ApiError.notFound('Trainer profile');

    const row = await fetchOwnProfile(c.var.db, userId);
    return c.json(toTrainerProfile(row));
  })

  /** GET /v1/me/activity — own events plus accepted friends', newest first. */
  .get('/activity', async (c) => {
    const { userId } = getAuth(c);
    const query = PageQuerySchema.parse(c.req.query());
    const cursor = decodeFeedCursor(query.cursor);

    const rows = (await c.var.db.execute(sql`
      WITH friend_ids AS (
        SELECT CASE WHEN f.requester_id = ${userId} THEN f.addressee_id ELSE f.requester_id END AS id
        FROM public.friendships f
        WHERE f.status = 'accepted'
          AND (f.requester_id = ${userId} OR f.addressee_id = ${userId})
      )
      SELECT
        a.id         AS "activityId",
        a.kind,
        a.payload,
        a.created_at AS "activityCreatedAt",
        ${sql.raw(TRAINER_SUMMARY_COLUMNS)}
      FROM public.activity a
      JOIN public.trainers tr ON tr.id = a.trainer_id
      ${sql.raw(TRAINER_SUMMARY_JOINS)}
      WHERE (a.trainer_id = ${userId}
         OR (a.trainer_id IN (SELECT id FROM friend_ids) AND tr.show_activity))
        ${cursor ? sql`AND (a.created_at, a.id) < (${new Date(cursor.t)}, ${cursor.id}::uuid)` : sql``}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ${query.limit + 1}
    `)) as unknown as ActivityRow[];

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);
    const nextCursor =
      hasMore && last
        ? encodeFeedCursor({ t: new Date(last.activityCreatedAt).toISOString(), id: last.activityId })
        : null;

    return c.json({ items: page.map(toActivity), nextCursor });
  });
