import type { Database } from '@masterpokedex/db';

/**
 * Kept in its own module so route files can type `Hono<AppBindings>` without
 * importing from index.ts, which imports them back.
 */
export type AppBindings = {
  Variables: {
    db: Database;
  };
};
