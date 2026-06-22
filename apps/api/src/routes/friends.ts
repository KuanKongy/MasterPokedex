import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { RespondToFriendInputSchema, UsernameSchema } from '@masterpokedex/shared';
import type { Database } from '@masterpokedex/db';
import type { AppBindings } from '../types';
import { ApiError, assertUuid } from '../lib/errors';
import { getAuth } from '../lib/auth';
import {
  TRAINER_SUMMARY_COLUMNS,
  TRAINER_SUMMARY_JOINS,
  toFriendship,
  type FriendshipRow,
} from '../lib/trainer-serialize';

const RequestFriendInputSchema = z.object({ username: UsernameSchema });

/** `tr` is always the *other* trainer relative to the viewer. */
async function fetchFriendships(db: Database, viewerId: string, where: ReturnType<typeof sql>) {
  return (await db.execute(sql`
    SELECT
      f.id           AS "friendshipId",
      f.status,
      f.requester_id AS "requesterId",
      f.created_at   AS "createdAt",
      f.responded_at AS "respondedAt",
      ${sql.raw(TRAINER_SUMMARY_COLUMNS)}
    FROM public.friendships f
    JOIN public.trainers tr
      ON tr.id = CASE WHEN f.requester_id = ${viewerId} THEN f.addressee_id ELSE f.requester_id END
    ${sql.raw(TRAINER_SUMMARY_JOINS)}
    WHERE ${where}
    ORDER BY (f.status = 'pending') DESC, f.created_at DESC
  `)) as unknown as FriendshipRow[];
}

export const friendsRoutes = new Hono<AppBindings>()
  /** GET /v1/me/friends — requests first, then the rest, newest first. */
  .get('/', async (c) => {
    const { userId } = getAuth(c);
    const rows = await fetchFriendships(
      c.var.db,
      userId,
      sql`f.requester_id = ${userId} OR f.addressee_id = ${userId}`,
    );
    return c.json({ items: rows.map((r) => toFriendship(r, userId)) });
  })

  /** POST /v1/me/friends — send a request by username. */
  .post('/', async (c) => {
    const { userId } = getAuth(c);
    const input = RequestFriendInputSchema.parse(await c.req.json());

    const [target] = (await c.var.db.execute(sql`
      SELECT id FROM public.trainers WHERE username = ${input.username}
    `)) as unknown as { id: string }[];
    if (!target) throw ApiError.notFound('Trainer');
    if (target.id === userId) {
      throw new ApiError('cannot_friend_self', 'You cannot send a friend request to yourself');
    }

    // The unordered-pair unique index turns a duplicate (in either direction)
    // into `friend_request_exists` via the constraint mapping.
    const [created] = (await c.var.db.execute(sql`
      INSERT INTO public.friendships (requester_id, addressee_id)
      VALUES (${userId}, ${target.id})
      RETURNING id
    `)) as unknown as { id: string }[];

    const [row] = await fetchFriendships(c.var.db, userId, sql`f.id = ${created.id}`);
    return c.json(toFriendship(row, userId), 201);
  })

  /** PATCH /v1/me/friends/:id — accept or block; addressee only. */
  .patch('/:id', async (c) => {
    const { userId } = getAuth(c);
    const id = assertUuid(c.req.param('id'), 'id');
    const input = RespondToFriendInputSchema.parse(await c.req.json());

    const updated = (await c.var.db.execute(sql`
      UPDATE public.friendships SET status = ${input.status}::friendship_status
      WHERE id = ${id} AND addressee_id = ${userId} AND status = 'pending'
      RETURNING requester_id AS "requesterId"
    `)) as unknown as { requesterId: string }[];
    if (updated.length === 0) throw ApiError.notFound('Friend request');

    const [row] = await fetchFriendships(c.var.db, userId, sql`f.id = ${id}`);

    if (input.status === 'accepted') {
      await c.var.db.execute(sql`
        INSERT INTO public.activity (trainer_id, kind, payload)
        VALUES (${userId}, 'friend_added', ${JSON.stringify({ username: row.username })}::jsonb)
      `);
    }

    return c.json(toFriendship(row, userId));
  })

  /** DELETE /v1/me/friends/:id — unfriend, or cancel/decline a request. */
  .delete('/:id', async (c) => {
    const { userId } = getAuth(c);
    const id = assertUuid(c.req.param('id'), 'id');

    const deleted = (await c.var.db.execute(sql`
      DELETE FROM public.friendships
      WHERE id = ${id} AND (requester_id = ${userId} OR addressee_id = ${userId})
      RETURNING id
    `)) as unknown as { id: string }[];
    if (deleted.length === 0) throw ApiError.notFound('Friendship');

    return c.body(null, 204);
  });
