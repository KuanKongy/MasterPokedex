import type { Database } from '@masterpokedex/db';
import type { AuthContext } from './lib/auth';

/**
 * Kept in its own module so route files can type `Hono<AppBindings>` without
 * importing from index.ts, which imports them back.
 */
export type AppBindings = {
  Variables: {
    db: Database;
    /** Set by requireAuth/optionalAuth; absent on anonymous requests. */
    auth?: AuthContext;
  };
};
