/**
 * Creates the demo cast's auth users on a REAL Supabase project.
 *
 *   npm run db:seed:auth
 *
 * trainers.id is a foreign key into auth.users. On local Postgres the
 * bootstrap migration's shim lets seed-demo insert those rows directly; on
 * hosted Supabase the auth schema belongs to supabase_auth_admin, so the six
 * fixed UUIDs (00000000-0000-4000-8000-00000000000{1..6}) must be created
 * through the Admin API instead — that is all this script does. Run it once
 * per project, before `npm run db:seed:demo`.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. The service-role key
 * bypasses RLS — keep it server-side only, never in anything VITE_-prefixed.
 *
 * Idempotent: users whose id already exists are skipped. The demo users get
 * a random throwaway password and a non-routable @demo.masterpokedex.invalid
 * address; nobody ever signs in as them.
 */
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { requireEnv } from '../src/env';
import { DEMO_TRAINERS } from './data/demo-cast';

async function main() {
  const supabase = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const trainer of DEMO_TRAINERS) {
    const existing = await supabase.auth.admin.getUserById(trainer.id);
    if (existing.data.user) {
      console.log(`  = ${trainer.username} (${trainer.id}) already exists`);
      continue;
    }

    const { data, error } = await supabase.auth.admin.createUser({
      id: trainer.id, // seed-demo's trainer rows FK onto exactly this id
      email: `${trainer.username}@demo.masterpokedex.invalid`,
      email_confirm: true,
      password: randomUUID(),
    });
    if (error) throw new Error(`createUser(${trainer.username}): ${error.message}`);
    if (data.user.id !== trainer.id) {
      throw new Error(
        `Supabase ignored the requested id for ${trainer.username} (created ${data.user.id} instead). ` +
          `Delete that user from the dashboard, then insert the row from the SQL editor — see docs/devops.md.`,
      );
    }
    console.log(`  + ${trainer.username} (${trainer.id})`);
  }

  console.log('Demo auth users ready — now run `npm run db:seed:demo`.');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
