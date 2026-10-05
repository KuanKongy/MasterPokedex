# MasterPokédex

A National Pokédex you can live in. The reference side covers every Pokémon: stats, types,
matchups, evolutions, moves, items, regions and encounter tables. The trainer side is yours:
sign in, claim a username, build teams with real capacity rules, catch Pokémon whose levels
derive from experience curves, keep a bag, favorite species, and make friends with other
trainers.

**Live app:** https://kuankongy.github.io/MasterPokedex/

## Architecture

```
apps/web        React 18 + Vite + Tailwind + shadcn/ui  (GitHub Pages)
   │  bearer token (Supabase JWT)
   ▼
apps/api        Hono on Node, verifying JWTs against the project JWKS and
   │            owning all authorization (every query scoped by user id)
   ▼
Postgres        two schemas:
                  dex     ~250k rows of reference data, ETL'd from PokeAPI CSVs
                  public  trainers, teams, caught_pokemon, trainer_items,
                          friendships, favorites, activity, FK'd to auth.users,
                          guarded by triggers (team capacity, level sync) and RLS

packages/shared zod contracts shared by both sides: the API validates with the
                same schemas the web app types against
packages/db     drizzle schema, migrations, seed pipelines
```

Two data sources, deliberately: PokeAPI stays the source of truth for the dex, reloaded
wholesale by the ETL, while the `public` schema layers user-owned, relational state on top of
it. Auth is Supabase, by email or Google. The API holds no Supabase secret: it verifies tokens
cryptographically against the JWKS endpoint and talks to Postgres over a connection string.

## API surface

Public reference: `/v1/pokemon` (cursor-paged, whitelisted filter grammar), `/v1/pokemon/:id`
(+ `/evolution`, `/encounters`, `/moves`), `/v1/types`, `/v1/items`, `/v1/regions`,
`/v1/locations/:id`, and the `/v1/stats/*` battery, including the division queries ported from
the original Oracle coursework (trainers holding every growth rate / team category / bag
pocket).

Authenticated (`Authorization: Bearer <supabase jwt>`): `/v1/me` (claim, read, update),
`/v1/me/teams` (+ catch/move/release), `/v1/me/items`, `/v1/me/friends`, `/v1/me/favorites`,
`/v1/me/activity`; `/v1/trainers` is the public directory with RLS-mirroring visibility.

Errors use a stable envelope: `{ "error": { "code": "team_full", "message": "…" } }`.

## Running it locally

```bash
docker compose up --build
```

Then open http://localhost:8080/MasterPokedex/. The stack reads a repo-root `.env`, so copy
`.env.example` and fill in your Supabase project first. No Supabase project? There is an
offline mode with local Postgres instead. Setup, seeding, deployment and the maintenance
scripts all live in [docs/devops.md](docs/devops.md).

## Documentation

| | |
| --- | --- |
| [docs/frontend.md](docs/frontend.md) | every page and feature of the web app |
| [docs/api.md](docs/api.md) | full endpoint reference: params, auth, error codes |
| [docs/devops.md](docs/devops.md) | local setup, scripts, Supabase, Railway, Pages CI, env reference |
| [docs/decisions.md](docs/decisions.md) | why Hono, Drizzle, an API over raw supabase-js, no Redis |
| [docs/feature-parity.md](docs/feature-parity.md) | mapping from the original CPSC 304 project |

## Credits

Pokémon data and sprites via [PokeAPI](https://pokeapi.co); region map art from the Bulbagarden
archives. Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc. and
GAME FREAK inc. This is an unaffiliated fan project.

Made by Nam Le.
