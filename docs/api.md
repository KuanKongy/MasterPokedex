# API reference

Base URL: `http://localhost:8787` in development, the Railway service URL in production. All application routes live under `/v1`; `/health` sits outside it.

## Conventions

**Auth.** Authenticated routes require `Authorization: Bearer <access token>`, where the token is a Supabase-issued JWT. The API verifies it against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (issuer `${SUPABASE_URL}/auth/v1`, audience `authenticated`), with an HS256 fallback via `SUPABASE_JWT_SECRET` for legacy projects and local testing. Three levels appear below:

- **—** public, no token read.
- **optional** — works anonymously; a valid token adds viewer-specific fields (and a bad token is still a 401).
- **required** — 401 without a valid token.

**Errors.** Every error is `{ "error": { "code", "message", "details?" } }`. Codes are the closed set in `packages/shared/src/common.ts`: the generic `bad_request`, `unauthorized`, `forbidden`, `not_found`, `conflict`, `unprocessable`, `rate_limited`, `internal`, `upstream_unavailable`, plus domain codes `team_full`, `username_taken`, `already_friends`, `friend_request_exists`, `cannot_friend_self`, `insufficient_quantity`. Database constraint violations are mapped to these codes in `apps/api/src/lib/errors.ts` — clients never see raw Postgres errors.

**Pagination.** List endpoints that page return `{ items, nextCursor }` and take `limit` + `cursor`, where `cursor` is an opaque keyset token from the previous response (`apps/api/src/lib/pagination.ts`). Never construct cursors by hand.

**Caching.** Successful responses on every read-only dex surface (`/v1/pokemon/*`, `/v1/moves*`, `/v1/abilities*`, `/v1/types*`, `/v1/typechart`, `/v1/evolution-chains`, `/v1/items*`, `/v1/regions*`, `/v1/locations*`) carry `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`; `/v1/search` uses `max-age=300`; everything under `/v1/me` is `private, no-store`.

**CORS.** Applied to `/v1/*` only, origins from `CORS_ORIGINS`, methods GET/POST/PATCH/PUT/DELETE/OPTIONS, headers `Authorization`/`Content-Type`.

## Health

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | — | Liveness **and** Supabase keep-alive: runs `select 1` against Postgres. `200 {ok, db: "up", latencyMs, env}` or `503`. Outside CORS — meant for uptime pingers, not browsers. |

## Pokédex — `apps/api/src/routes/pokemon.ts`

| Method | Path | Auth | Parameters | Purpose |
|---|---|---|---|---|
| GET | `/v1/pokemon` | — | `limit` (1–200, default 50), `cursor`, `q` (name search), `type`, `generation` (1–9), `sort` (`id`, `name`, `total`, `hp`, `attack`, `defense`, `specialAttack`, `specialDefense`, `speed`, `height`, `weight`, `baseExperience`), `dir` (`asc`/`desc`), `filter` (encoded whitelist grammar, below) | Cursor-paged dex list. |
| GET | `/v1/pokemon/:idOrName` | — | dex id or name (`25` or `pikachu`) | Full detail: stats, types, abilities, species text, dimensions, rates. `not_found` otherwise. |
| GET | `/v1/pokemon/:id/evolution` | — | | Whole evolution chain from the species root — branching-safe, ordered by depth. Each node carries `methods`: **every** `dex.evolution` row for that species, ids resolved to names, not just the oldest. A species has one row per method (Leafeon has six), and taking the first is what used to caption Sylveon as a bare "Level Up". |
| GET | `/v1/pokemon/:id/encounters` | — | | Every encounter: region, location, area, method, level range, rarity, conditions, versions. |
| GET | `/v1/pokemon/:id/moves` | — | | Learnset grouped by method (level-up / machine / egg / tutor), each row carrying the move's `slug` for linking. Implemented in `routes/reference.ts`. |
| GET | `/v1/pokemon/megas` | — | | All 97 Mega forms with `formLabel`, stats, and the base species (`baseName`, `basePokemonId`). |
| GET | `/v1/pokemon/gmax` | — | | The same, for the 34 Gigantamax forms. Registered before `/:idOrName` for the same reason `/megas` is. |
| GET | `/v1/pokemon/:id/forms` | — | `scope` (`family`) | Every variety of the same species (base, Megas, regionals, Gigantamax), labeled and flagged (`isMega`/`isGmax`/`isRegional`). `scope=family` widens it to every species in the evolution chain and adds `speciesId`/`speciesName` for grouping — Megas and Gigantamax forms belong to one stage, so a species-scoped answer can only ever show them on the last one. |

**Filter grammar.** `filter` is a JSON condition tree serialized by the helpers in `packages/shared/src/filters.ts` and validated with Zod enums on both field and operator — no request string ever reaches an identifier or operator position in SQL. Fields: `name`, `type`, `generation`, `total`, `hp`, `attack`, `defense`, `specialAttack`, `specialDefense`, `speed`, `height`, `weight`, `baseExperience`, `captureRate`, `growthRate`, `color`, `habitat`, `isLegendary`, `isMythical`, plus relation-backed fields `ability` (matches identifier or display name), `evolutionTrigger`, and the species-level booleans `hasMega`, `hasGmax`, `isFullyEvolved`. Operators: strings `eq|neq|contains|startsWith|endsWith`, numbers `eq|neq|gt|gte|lt|lte`, booleans `eq`, enums `eq|neq|in`; conditions combine under `all` (AND) or `any` (OR).

## Moves — `apps/api/src/routes/moves.ts`

| Method | Path | Auth | Parameters | Purpose |
|---|---|---|---|---|
| GET | `/v1/moves` | — | `limit`, `cursor`, `q`, `type`, `damageClass`, `generation`, `sort` (`id`, `name`, `power`, `pp`, `accuracy`, `priority`), `dir`, `filter` (move grammar) | Cursor-paged move index with effect text. |
| GET | `/v1/moves/:idOrName` | — | | Move detail plus every Pokémon that learns it (`learners`, grouped by method with levels). |

## Abilities — `apps/api/src/routes/abilities.ts`

| Method | Path | Auth | Parameters | Purpose |
|---|---|---|---|---|
| GET | `/v1/abilities` | — | `limit`, `cursor`, `q`, `sort` (`id`/`name`), `dir`, `filter` (name/generation/pokemonCount grammar) | Main-series abilities (side-game rows filtered out) with per-ability Pokémon counts. |
| GET | `/v1/abilities/:idOrName` | — | | Ability detail plus every Pokémon that can have it (with `isHidden`). |

## Search — `apps/api/src/routes/search.ts`

| Method | Path | Auth | Parameters | Purpose |
|---|---|---|---|---|
| GET | `/v1/search` | — | `q` (1–50 chars), `limit` (per kind, default 8) | Cross-entity search over Pokémon, moves, abilities, items, locations and types; flat kind-tagged results, prefix matches ranked first. Backs the header omnisearch and `/search` page. |

## Reference data — `apps/api/src/routes/reference.ts`

| Method | Path | Auth | Parameters | Purpose |
|---|---|---|---|---|
| GET | `/v1/types` | — | | All 18 types with Pokémon counts. |
| GET | `/v1/types/:name` | — | | Offensive + defensive matchup profile from the 324-row efficacy chart. |
| GET | `/v1/items` | — | `category`, `q`, `limit` (default 200, max 500), plus optional `cursor`, `sort` (`id`/`name`/`cost`), `dir`, `filter` (item grammar) | Item catalogue; the cursor/filter params are additive for the advanced-search page. |
| GET | `/v1/item-categories` | — | | Categories with pocket and item counts. |
| GET | `/v1/typechart` | — | | The whole 18×18 efficacy matrix (324 cells) in one response. |
| GET | `/v1/evolution-chains` | — | `limit` (≤50), `cursor` (chain id), `q` (matches any family member) | Paged evolution-family index; nodes carry sprites, types and evolution conditions. |

## World — `apps/api/src/routes/world.ts`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/regions` | — | All regions: display name, description, map image (a path into the web app's self-hosted `public/maps/`), plus `locationCount`, `areaCount` and `speciesCount`. |
| GET | `/v1/regions/:id/locations` | — | Locations in a region, including `mapX`/`mapY` pin coordinates (nullable), `notable` and `notableTrainers` for the map's side panel. |
| GET | `/v1/locations` | — | The global catalog: every region with its locations (`kind`, `areaCount`, `hasEncounters`). The 91 rows with no region are grouped under a synthetic region `0`, "Other & event locations" — an inner join used to drop them. |
| GET | `/v1/locations/search` | — | Flat filterable rows for the advanced-search Locations entity (`filter` grammar: name/region/kind/areaCount/hasEncounters; integer-keyset `cursor`). |
| GET | `/v1/locations/:id` | — | One location: areas, per-area encounter tables, map neighbours, curated `notableTrainers`. |

## Stats — `apps/api/src/routes/stats.ts`

Purpose-built SQL showcases (aggregation, HAVING, nested aggregation, relational division — see [feature-parity.md](feature-parity.md)).

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/stats/types` | — | Average base stats per type (GROUP BY). |
| GET | `/v1/stats/weak-types` | — | Types at/below the global average total (nested aggregation). |
| GET | `/v1/stats/regions` | — | Pokémon / encounter / location counts per region. |
| GET | `/v1/stats/multi-location` | — | Pokémon found in more than `min` locations (`min` query, default 20, clamped 2–200; HAVING). |
| GET | `/v1/stats/all-damage-classes` | — | Species learning a move of every damage class (division via EXCEPT). |
| GET | `/v1/stats/trainers-by-region` | — | Trainer count per region. |
| GET | `/v1/stats/all-growth-rates` | — | Trainers owning a Pokémon of every growth rate (division). |
| GET | `/v1/stats/all-team-categories` | — | Trainers with a team in every category (division). |
| GET | `/v1/stats/all-item-pockets` | — | Trainers holding an item from every bag pocket (division). |

## Own profile — `apps/api/src/routes/me.ts`

| Method | Path | Auth | Body / parameters | Purpose |
|---|---|---|---|---|
| GET | `/v1/me` | required | | Own profile. **404 `not_found` until a username is claimed** — the client uses this to drive onboarding. |
| POST | `/v1/me` | required | `ClaimUsernameInput` (`username`) | Claim a username, creating the trainer row. `username_taken` on conflict. |
| PATCH | `/v1/me` | required | `UpdateProfileInput` (displayName, bio, avatarUrl, regionId, favoriteTypeId, isPublic — all optional) | Partial profile update, including the privacy toggle. |
| GET | `/v1/me/activity` | required | `limit`, `cursor` | Own + accepted friends' activity, keyset-paged on `(created_at, id)`. |

## Teams & caught Pokémon — `apps/api/src/routes/teams.ts`

| Method | Path | Auth | Body / parameters | Purpose |
|---|---|---|---|---|
| GET | `/v1/me/teams` | required | | All teams with members nested. |
| POST | `/v1/me/teams` | required | `CreateTeamInput` (name, category, description?) | Create a team. Categories: `party` (6), `box` (30), `showcase` (12). |
| PATCH | `/v1/me/teams/:teamId` | required | `UpdateTeamInput` | Rename / re-describe / re-order. |
| DELETE | `/v1/me/teams/:teamId` | required | | Delete a team; members cascade. |
| POST | `/v1/me/teams/:teamId/pokemon` | required | `CatchPokemonInput` (pokemonId, experience, nickname?, isShiny?, gender?, notes?) | Catch into a team. Level is derived from experience by a DB trigger — clients never send a level. `team_full` (409) at capacity. |
| PATCH | `/v1/me/pokemon/:id` | required | `UpdateCaughtPokemonInput` (nickname?, experience?, notes?, teamId?) | Rename, train, annotate, or move between teams. |
| DELETE | `/v1/me/pokemon/:id` | required | | Release. |

## Bag — `apps/api/src/routes/bag.ts`

| Method | Path | Auth | Body | Purpose |
|---|---|---|---|---|
| GET | `/v1/me/items` | required | | The bag, joined with item metadata. |
| PUT | `/v1/me/items/:itemId` | required | `AdjustItemInput` — either absolute `quantity` or relative `delta` | Upsert a bag row. A DB CHECK blocks negative quantities → `insufficient_quantity`. |

## Friends — `apps/api/src/routes/friends.ts`

| Method | Path | Auth | Body | Purpose |
|---|---|---|---|---|
| GET | `/v1/me/friends` | required | | Pending requests first, then accepted, newest first. |
| POST | `/v1/me/friends` | required | `{ username }` | Send a request. `cannot_friend_self`, `already_friends`, `friend_request_exists` as appropriate. |
| PATCH | `/v1/me/friends/:id` | required | `RespondToFriendInput` (`accept` or `block`) | Respond — addressee only. |
| DELETE | `/v1/me/friends/:id` | required | | Unfriend / cancel / decline. |

## Favorites — `apps/api/src/routes/favorites.ts`

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/v1/me/favorites` | required | Favorites, newest first (unpaginated by design). |
| PUT | `/v1/me/favorites/:pokemonId` | required | Add — idempotent. |
| DELETE | `/v1/me/favorites/:pokemonId` | required | Remove — idempotent. |

## Public trainers — `apps/api/src/routes/trainers.ts`

| Method | Path | Auth | Parameters | Purpose |
|---|---|---|---|---|
| GET | `/v1/trainers` | optional | `q`, `limit`, `cursor` | Public directory, keyset-paged by username. |
| GET | `/v1/trainers/:username` | optional | | Public profile. `friendshipStatus` appears only for signed-in viewers. Invisible profiles return **404, not 403** — existence is not leaked. |
| GET | `/v1/trainers/:username/teams` | optional | | Their teams, same visibility rules. |

## Authorization model

Authorization lives in the routes: every `/v1/me/*` query is scoped by the verified JWT `sub`, so a caller can only ever touch their own rows. Postgres RLS (migration `0003_rls.sql`) exists as a defense-in-depth backstop, not as the primary mechanism — see [decisions.md](decisions.md).
