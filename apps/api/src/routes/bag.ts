import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { AdjustItemInputSchema } from '@masterpokedex/shared';
import type { AppBindings } from '../types';
import { ApiError } from '../lib/errors';
import { getAuth } from '../lib/auth';

/**
 * The trainer's bag. The reference schema's `hasItem` was bare set membership
 * even though its UI rendered counts; here quantity is real, guarded by a
 * CHECK that surfaces as `insufficient_quantity`, and rows disappear at zero
 * so the bag never fills with empty slots.
 */

const ITEM_COLUMNS = `
  i.id,
  i.name,
  i.display_name AS "displayName",
  ic.name        AS category,
  ic.pocket,
  i.short_effect AS effect,
  i.sprite,
  i.cost
`;

export const bagRoutes = new Hono<AppBindings>()
  /** GET /v1/me/items */
  .get('/', async (c) => {
    const { userId } = getAuth(c);
    const rows = await c.var.db.execute(sql`
      SELECT ${sql.raw(ITEM_COLUMNS)}, ti.quantity
      FROM public.trainer_items ti
      JOIN dex.items i ON i.id = ti.item_id
      JOIN dex.item_categories ic ON ic.id = i.category_id
      WHERE ti.trainer_id = ${userId}
      ORDER BY ic.pocket NULLS LAST, i.display_name
    `);
    return c.json({ items: rows as unknown as unknown[] });
  })

  /**
   * PUT /v1/me/items/:itemId — set an absolute `quantity` or apply a `delta`.
   * A delta below zero is rejected by the database CHECK, so "use one potion
   * I don't have" can never write.
   */
  .put('/:itemId', async (c) => {
    const { userId } = getAuth(c);
    const itemId = Number(c.req.param('itemId'));
    if (!Number.isInteger(itemId) || itemId <= 0) throw ApiError.badRequest('itemId must be a positive integer');
    const input = AdjustItemInputSchema.parse(await c.req.json());

    let quantity: number;
    if (input.quantity !== undefined) {
      quantity = input.quantity;
      if (quantity === 0) {
        await c.var.db.execute(sql`
          DELETE FROM public.trainer_items WHERE trainer_id = ${userId} AND item_id = ${itemId}
        `);
      } else {
        await c.var.db.execute(sql`
          INSERT INTO public.trainer_items (trainer_id, item_id, quantity)
          VALUES (${userId}, ${itemId}, ${quantity})
          ON CONFLICT (trainer_id, item_id) DO UPDATE SET quantity = EXCLUDED.quantity
        `);
      }
    } else {
      const delta = input.delta!;
      const rows = (await c.var.db.execute(sql`
        INSERT INTO public.trainer_items (trainer_id, item_id, quantity)
        VALUES (${userId}, ${itemId}, ${delta})
        ON CONFLICT (trainer_id, item_id) DO UPDATE SET quantity = public.trainer_items.quantity + ${delta}
        RETURNING quantity
      `)) as unknown as { quantity: number }[];
      quantity = rows[0]!.quantity;
      if (quantity === 0) {
        await c.var.db.execute(sql`
          DELETE FROM public.trainer_items WHERE trainer_id = ${userId} AND item_id = ${itemId}
        `);
      }
    }

    return c.json({ itemId, quantity });
  });
