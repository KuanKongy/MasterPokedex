# MasterPokédex

A National Pokédex you can live in. The reference side covers every Pokémon — stats, types,
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
apps/api        Hono on Node — verifies JWTs against the project JWKS,
   │            owns all authorization (every query scoped by user id)
   ▼
Postgres        two schemas:
                  dex     ~250k rows of reference data, ETL'd from PokeAPI CSVs
                  public  trainers, teams, caught_pokemon, trainer_items,
                          friendships, favorites, activity — FK'd to auth.users,
                          guarded by triggers (team capacity, level sync) and RLS

packages/shared zod contracts shared by both sides — the API validates with the
                same schemas the web app types against
packages/db     drizzle schema, migrations, seed pipelines
```

Two data sources, deliberately: PokeAPI remains the source of truth for the dex (reloaded
wholesale by the ETL), while the `public` schema layers user-owned, relational state on top of
it. Auth is Supabase (email + password); the API holds no Supabase secret — it verifies tokens
cryptographically via the JWKS endpoint and talks to Postgres over a connection string.

## Prerequisites

- Node ≥ 24, npm ≥ 11
- A Supabase project (Docker alone works too — offline mode below)

## Getting started

```bash
git clone <this repo> && cd NationalPokedex
npm install
cp .env.example .env          # fill in your Supabase values (docs/devops.md)

npm run db:migrate            # schema, triggers, RLS
npm run db:seed               # dex ETL: ~250k rows from cached PokeAPI CSVs
npm run db:seed:auth          # demo cast's auth users via the Admin API
npm run db:seed:demo          # Ash, Misty, Brock & co. for a lively directory
npm run db:verify             # runs the SQL assertion suites

npm run dev                   # api on :8787 + web on :8080 (hot reload)
# — or —
docker compose up --build            # same stack as containers, one command
```

Open http://localhost:8080/MasterPokedex/. No Supabase project yet? A fully offline stack
(local Postgres + auth shim) is three commands away — see [docs/devops.md](docs/devops.md).

## Environment

All configuration lives in the repo-root `.env` (shared by the API, the db scripts, and Vite).
See `.env.example` for the annotated template.

| Variable | Used by | Notes |
| --- | --- | --- |
| `DATABASE_URL` | api | Runtime connection. On Supabase use the **transaction pooler (:6543)** — the client already sets `prepare: false` for it. |
| `DIRECT_DATABASE_URL` | db scripts | Migrations + ETL only. Direct connection (:5432); on IPv4-only networks use the session pooler host instead. |
| `SUPABASE_URL` | api | Locates `/auth/v1/.well-known/jwks.json` for JWT verification. |
| `SUPABASE_JWT_SECRET` | api | Legacy HS256 projects only; leave unset on current projects. |
| `CORS_ORIGINS` | api | Comma-separated; must include the web origin. |
| `VITE_API_URL` | web | Where the browser finds the API. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | web | The project URL and anon/publishable key — safe for the bundle. |

### Wiring up Supabase

1. Create a project at supabase.com, then fill `SUPABASE_URL`, `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`, and point both database URLs at the project (pooler for
   `DATABASE_URL`, direct/session for `DIRECT_DATABASE_URL`).
2. Run `npm run db:migrate && npm run db:seed` against it. The auth-shim migration detects real
   Supabase and touches nothing it owns.
3. Email confirmation is on by default (the UI treats "check your email" as the happy path).
   Configure custom SMTP before real signups — the built-in sender is limited to ~2 emails/hour.
4. `npm run db:seed:demo` cannot write `auth.users` on real Supabase — run
   `npm run db:seed:auth` first (needs `SUPABASE_SERVICE_ROLE_KEY`) to create the demo users
   via the Admin API, then seed the cast.
5. Free-tier note: projects pause after ~1 week idle. `GET /health` touches the database
   precisely so an uptime pinger keeps both alive — the `keep-alive.yml` workflow is that
   pinger.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | API (tsx watch) + web (Vite) together |
| `npm run typecheck` / `lint` / `test` | across all workspaces |
| `npm run build` | production web build (SPA fallback copied to 404.html) |
| `npm run deploy:web` | manual Pages publish (CI does this on push — see docs/devops.md) |
| `npm run db:migrate` / `db:generate` / `db:studio` | drizzle-kit against `DIRECT_DATABASE_URL` |
| `npm run db:seed` / `db:seed:auth` / `db:seed:demo` / `db:verify` | dex ETL / demo auth users / demo cast / SQL assertions |

### One-shot content scripts

PokeAPI has no cartography, no artwork for places, and a sprite repo that covers
fewer than half the dex's items. These four fill that in, write their results to
generated files the seed reads, and are not part of any build — run them when the
upstream data moves, and commit what they produce.

| Command | What it does |
| --- | --- |
| `npm run brand --workspace=@masterpokedex/web` | draws the favicon set and one pixel-art logo per Poké Ball colourway into `public/logo/`, the same ten on a 64 grid into `public/logo/fine/`, and cuts the original bag icons in `scripts/ball-originals/` into `public/logo/original/` |
| `npm run assets --workspace=@masterpokedex/web` | downloads the region maps and demo avatars (Bulbagarden's Cloudflare blocks browser hotlinks, so they are self-hosted) |
| `node apps/web/scripts/fetch-item-sprites.mjs` | item art and effect text from Bulbapedia and PokémonDB → `public/items/` + `src/data/item-sprites.json`; takes item art coverage to 99.7% |
| `node packages/db/scripts/fetch-location-data.mjs` | every location's artwork, description, neighbours and notable trainers from Bulbapedia → `public/locations/` + `data/locations.generated.ts`. One request per second, backs off on 429/5xx, and checkpoints every page, so an interrupted run resumes instead of re-crawling |
| `node packages/db/scripts/fetch-map-pins.mjs` | map pin coordinates, read out of Bulbapedia's Town Map images by diffing each location's against the region's median → `data/map-pins.generated.ts` |

## API surface

Public reference: `/v1/pokemon` (cursor-paged, whitelisted filter grammar), `/v1/pokemon/:id`
(+ `/evolution`, `/encounters`, `/moves`), `/v1/types`, `/v1/items`, `/v1/regions`,
`/v1/locations/:id`, and the `/v1/stats/*` battery — including the division queries ported from
the original Oracle coursework (trainers holding every growth rate / team category / bag
pocket).

Authenticated (`Authorization: Bearer <supabase jwt>`): `/v1/me` (claim, read, update),
`/v1/me/teams` (+ catch/move/release), `/v1/me/items`, `/v1/me/friends`, `/v1/me/favorites`,
`/v1/me/activity`; `/v1/trainers` is the public directory with RLS-mirroring visibility.

Errors use a stable envelope: `{ "error": { "code": "team_full", "message": "…" } }`.

## Documentation

| | |
| --- | --- |
| [docs/frontend.md](docs/frontend.md) | every page and feature of the web app |
| [docs/api.md](docs/api.md) | full endpoint reference: params, auth, error codes |
| [docs/devops.md](docs/devops.md) | compose, Supabase setup, Railway, Pages CI, keep-alive, env reference |
| [docs/decisions.md](docs/decisions.md) | why Hono, Drizzle, an API over raw supabase-js, no Redis |
| [docs/feature-parity.md](docs/feature-parity.md) | mapping from the original CPSC 304 project |

## Credits

Pokémon data and sprites via [PokeAPI](https://pokeapi.co); region map art from the Bulbagarden
archives. Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc. and
GAME FREAK inc. — this is an unaffiliated fan project.

Made by Nam Le.
