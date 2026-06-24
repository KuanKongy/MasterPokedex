/**
 * Seeds the demo cast: guest trainers with teams, caught Pokémon, bags,
 * friendships, favourites and an activity feed, so the trainer directory has
 * content before the first real signup.
 *
 *   npm run db:seed:demo
 *
 * Requires the dex to be seeded first (npm run db:seed) — members and items
 * are validated against it, and anything the dex does not know is skipped
 * with a warning rather than failing the whole run.
 *
 * Idempotent: every demo trainer has a fixed UUID; the run deletes exactly
 * those trainers (cascades wipe their teams, Pokémon, items, friendships,
 * favourites and activity) and re-inserts them.
 *
 * auth.users: trainers.id is a foreign key into auth.users. On local Postgres
 * the bootstrap migration installed a shim table we can insert into. On a real
 * Supabase project the auth schema belongs to supabase_auth_admin and direct
 * inserts are refused — in that case this script prints the ids to create via
 * the Admin API and exits without touching anything.
 */
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { assertDirectUrl, requireEnv } from '../src/env';
import { DEMO_FRIENDSHIPS, DEMO_TRAINERS } from './data/demo-cast';

const DAY_MS = 24 * 60 * 60 * 1000;

async function main() {
  const url = requireEnv('DIRECT_DATABASE_URL');
  assertDirectUrl(url);

  const sql = postgres(url, {
    max: 1,
    idle_timeout: 0,
    connect_timeout: 30,
    onnotice: () => {},
    transform: postgres.camel,
  });

  try {
    const [{ count: pokemonCount }] = await sql<[{ count: string }]>`
      SELECT count(*)::text AS count FROM dex.pokemon
    `;
    if (Number(pokemonCount) === 0) {
      console.error('dex.pokemon is empty — run `npm run db:seed` before seeding the demo cast.');
      process.exitCode = 1;
      return;
    }

    // ── Resolve names against the dex ────────────────────────────────────────
    const regionRows = await sql<{ id: number; name: string }[]>`SELECT id, name FROM dex.regions`;
    const typeRows = await sql<{ id: number; name: string }[]>`SELECT id, name FROM dex.types`;
    const regionId = new Map(regionRows.map((r) => [r.name, r.id]));
    const typeId = new Map(typeRows.map((t) => [t.name, t.id]));

    const itemNames = [...new Set(DEMO_TRAINERS.flatMap((t) => Object.keys(t.items)))];
    const itemRows = await sql<{ id: number; name: string }[]>`
      SELECT id, name FROM dex.items WHERE name = ANY(${itemNames})
    `;
    const itemId = new Map(itemRows.map((i) => [i.name, i.id]));
    for (const name of itemNames) {
      if (!itemId.has(name)) console.warn(`  ! item "${name}" not in dex.items — skipping`);
    }

    const wantedSpecies = [
      ...new Set(
        DEMO_TRAINERS.flatMap((t) => [
          ...t.teams.flatMap((team) => team.members.map((m) => m.pokemonId)),
          ...t.favorites,
        ]),
      ),
    ];
    const speciesRows = await sql<{ id: number }[]>`
      SELECT id FROM dex.pokemon WHERE id = ANY(${wantedSpecies})
    `;
    const knownSpecies = new Set(speciesRows.map((r) => r.id));
    for (const id of wantedSpecies) {
      if (!knownSpecies.has(id)) console.warn(`  ! pokemon #${id} not in dex.pokemon — skipping`);
    }

    // ── auth.users first: everything else hangs off it ──────────────────────
    // SELECT before INSERT: on real Supabase the postgres role can read
    // auth.users but not write it, and INSERT ... ON CONFLICT checks the
    // privilege before resolving the conflict — so a blind insert fails even
    // when every row already exists (created by `npm run db:seed:auth`).
    const trainerIds = DEMO_TRAINERS.map((t) => t.id);
    const existingUsers = await sql<{ id: string }[]>`
      SELECT id FROM auth.users WHERE id = ANY(${trainerIds}::uuid[])
    `;
    const existingIds = new Set(existingUsers.map((u) => u.id));
    const missing = DEMO_TRAINERS.filter((t) => !existingIds.has(t.id));
    if (missing.length > 0) {
      try {
        await sql`
          INSERT INTO auth.users (id, email)
          SELECT id, username || '@demo.masterpokedex.invalid'
          FROM unnest(${missing.map((t) => t.id)}::uuid[], ${missing.map((t) => t.username)}::text[]) AS u(id, username)
          ON CONFLICT (id) DO NOTHING
        `;
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === '42501' || code === '42P01') {
          console.error(
            'Cannot write to auth.users — this looks like a real Supabase project, where the\n' +
              'auth schema is owned by supabase_auth_admin. Run `npm run db:seed:auth` (needs\n' +
              'SUPABASE_SERVICE_ROLE_KEY) to create these users via the Admin API:\n\n' +
              missing.map((t) => `  ${t.id}  ${t.username}`).join('\n') +
              '\n\nthen re-run this script.',
          );
          process.exitCode = 1;
          return;
        }
        throw err;
      }
    }

    // ── One transaction for the cast itself ─────────────────────────────────
    const now = Date.now();
    await sql.begin(async (tx) => {
      await tx`DELETE FROM public.trainers WHERE id = ANY(${trainerIds}::uuid[])`;

      await tx`INSERT INTO public.trainers ${tx(
        DEMO_TRAINERS.map((t) => ({
          id: t.id,
          username: t.username,
          displayName: t.displayName,
          avatarUrl: t.avatarUrl,
          bio: t.bio,
          regionId: regionId.get(t.region) ?? null,
          favoriteTypeId: t.favoriteType ? (typeId.get(t.favoriteType) ?? null) : null,
          rank: t.rank,
          badges: t.badges,
          isPublic: true,
          isGuest: true,
        })),
      )}`;

      type ActivityRow = {
        trainerId: string;
        kind: 'caught' | 'team_created' | 'friend_added' | 'shiny_caught';
        payload: Record<string, string | number | null>;
        createdAt: Date;
      };
      const activities: ActivityRow[] = [];
      let clock = 0; // deterministic stagger: each event lands on its own day

      for (const trainer of DEMO_TRAINERS) {
        for (const [teamIndex, team] of trainer.teams.entries()) {
          const teamUuid = randomUUID();
          await tx`INSERT INTO public.teams ${tx({
            id: teamUuid,
            trainerId: trainer.id,
            name: team.name,
            description: team.description ?? null,
            category: team.category,
            sortOrder: teamIndex,
          })}`;
          activities.push({
            trainerId: trainer.id,
            kind: 'team_created',
            payload: { teamName: team.name, category: team.category },
            createdAt: new Date(now - (60 - (clock += 1)) * DAY_MS),
          });

          const members = team.members.filter((m) => knownSpecies.has(m.pokemonId));
          if (members.length === 0) continue;
          await tx`INSERT INTO public.caught_pokemon ${tx(
            members.map((m, memberIndex) => ({
              trainerId: trainer.id,
              teamId: teamUuid,
              pokemonId: m.pokemonId,
              nickname: m.nickname ?? null,
              experience: m.experience,
              isShiny: m.isShiny ?? false,
              gender: m.gender ?? null,
              notes: m.notes ?? null,
              caughtAt: new Date(now - (55 - clock) * DAY_MS - memberIndex * (DAY_MS / 4)),
            })),
          )}`;

          for (const m of members) {
            if (m.isShiny) {
              activities.push({
                trainerId: trainer.id,
                kind: 'shiny_caught',
                payload: { pokemonId: m.pokemonId, nickname: m.nickname ?? null },
                createdAt: new Date(now - (50 - (clock += 1)) * DAY_MS),
              });
            }
          }
          activities.push({
            trainerId: trainer.id,
            kind: 'caught',
            payload: { pokemonId: members[0].pokemonId, nickname: members[0].nickname ?? null },
            createdAt: new Date(now - (45 - (clock += 1)) * DAY_MS),
          });
        }

        const bag = Object.entries(trainer.items)
          .filter(([name]) => itemId.has(name))
          .map(([name, quantity]) => ({
            trainerId: trainer.id,
            itemId: itemId.get(name)!,
            quantity,
          }));
        if (bag.length > 0) {
          await tx`INSERT INTO public.trainer_items ${tx(bag)}`;
        }

        const favorites = trainer.favorites.filter((id) => knownSpecies.has(id));
        if (favorites.length > 0) {
          await tx`INSERT INTO public.favorites ${tx(
            favorites.map((pokemonId) => ({ trainerId: trainer.id, pokemonId })),
          )}`;
        }
      }

      const idByUsername = new Map(DEMO_TRAINERS.map((t) => [t.username, t.id]));
      for (const f of DEMO_FRIENDSHIPS) {
        const requesterId = idByUsername.get(f.requester);
        const addresseeId = idByUsername.get(f.addressee);
        if (!requesterId || !addresseeId) continue;
        const createdAt = new Date(now - (40 - (clock += 1)) * DAY_MS);
        await tx`INSERT INTO public.friendships ${tx({
          requesterId,
          addresseeId,
          status: f.status,
          createdAt,
          respondedAt: f.status === 'accepted' ? new Date(createdAt.getTime() + DAY_MS / 2) : null,
        })}`;
        if (f.status === 'accepted') {
          activities.push({
            trainerId: requesterId,
            kind: 'friend_added',
            payload: { username: f.addressee },
            createdAt: new Date(createdAt.getTime() + DAY_MS / 2),
          });
        }
      }

      if (activities.length > 0) {
        // postgres.js needs jsonb parameters wrapped explicitly inside the insert helper.
        await tx`INSERT INTO public.activity ${tx(
          activities.map((a) => ({ ...a, payload: tx.json(a.payload) })),
        )}`;
      }
    });

    const [counts] = await sql<
      [{ trainers: string; teams: string; caught: string; items: string; friendships: string }]
    >`
      SELECT
        (SELECT count(*) FROM public.trainers WHERE id = ANY(${trainerIds}::uuid[]))::text        AS trainers,
        (SELECT count(*) FROM public.teams WHERE trainer_id = ANY(${trainerIds}::uuid[]))::text    AS teams,
        (SELECT count(*) FROM public.caught_pokemon WHERE trainer_id = ANY(${trainerIds}::uuid[]))::text AS caught,
        (SELECT count(*) FROM public.trainer_items WHERE trainer_id = ANY(${trainerIds}::uuid[]))::text  AS items,
        (SELECT count(*) FROM public.friendships WHERE requester_id = ANY(${trainerIds}::uuid[]))::text  AS friendships
    `;
    console.log(
      `Demo cast seeded: ${counts.trainers} trainers, ${counts.teams} teams, ` +
        `${counts.caught} caught pokémon, ${counts.items} bag rows, ${counts.friendships} friendships.`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
