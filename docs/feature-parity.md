# Feature parity with the original CPSC 304 project

This app is a ground-up rewrite of a CPSC 304 group project (Oracle + Express + vanilla JS). The original repository's application code was the course's starter skeleton — its real deliverables were a 24-table BCNF-normalized Oracle schema, seed data, and milestone plans. Everything they specified exists here, usually in a stronger form.

## Schema and features

| Original (schema / planned) | Here |
|---|---|
| `Pokemon1`/`Pokemon2` — base stats, BCNF split of stats→total | `dex.pokemon` with full stats; `/v1/pokemon` list + detail |
| `WildPokemon` — spawn rate / weather / time | `/v1/pokemon/:id/encounters` — method, level range, rarity, conditions, versions |
| `TrainerPokemon1`/`TrainerPokemon2` — FD (experience, leveling_group) → level | `caught_pokemon` + a database trigger deriving level from experience — the same functional dependency, enforced server-side; clients never send a level |
| `Trainer` — name, rank, region | `trainers` with rank enum, region, public profiles and a searchable directory |
| `Collection1`/`Collection2` — weak entity per trainer, category → max size | `teams` + `team_categories` (party 6 / box 30 / showcase 12) with a capacity trigger raising `team_full` |
| `Item` + `hasItem` | `dex.items` catalogue (~2,200 items) + `trainer_items` bag with a non-negative quantity CHECK |
| `Region`, `Route1`/`Route2`, `leadsTo`, `foundAt` | `dex` regions/locations/areas with curated map art and pins, location neighbours, per-area encounter tables |
| `Type` — one weakness/resistance pair per type; `hasType` | Full 324-row type-efficacy chart; `/v1/types/:name` offensive + defensive matchups |
| `Move1`/`Move2` + `hasMove` | `/v1/pokemon/:id/moves` learnsets by method |
| `Ability1`/`Ability2` + `ableTo` | Abilities on the Pokémon detail page |
| `EvolutionReq` + Oracle `START WITH … CONNECT BY PRIOR` chain traversal | `/v1/pokemon/:id/evolution` — branching-safe chain from the species root (the Postgres answer to `CONNECT BY`) |

## The ten milestone query requirements

| Requirement | Where it lives now |
|---|---|
| Aggregation with GROUP BY | `/v1/stats/types` — average base stats per type |
| Aggregation with HAVING | `/v1/stats/multi-location` — Pokémon found in more than N locations |
| Nested aggregation with GROUP BY | `/v1/stats/weak-types` — types at/below the global average total |
| Division | Four of them: `/v1/stats/all-damage-classes`, `all-growth-rates`, `all-team-categories`, `all-item-pockets` |
| Selection | The whitelist filter grammar behind `GET /v1/pokemon` and the `/pokemon-filter` page |
| Projection | Column visibility toggles on `/pokemon-filter` |
| Join | Throughout — every list/detail endpoint joins `dex` and `public` tables |
| INSERT | Catching Pokémon, creating teams, friend requests, bag rows, favorites |
| UPDATE | Profile edits, training (experience), team edits, bag quantity steppers |
| DELETE | Releasing Pokémon, deleting teams, unfriending, removing favorites |

One deliberate improvement over the original filter plan: the reference implementation interpolated caller-supplied attribute and operator strings into SQL. Here both are Zod-validated enums (`packages/shared/src/filters.ts`), so no request string ever reaches an identifier position.

## Planned-but-never-built items from the milestones

The original timeline planned a multi-page GUI with navigation, per-entity pages, input sanitization, descriptive error messages and verification of actions. All of that exists here: the router pages, zod validation on every input, the stable error envelope with domain codes, and optimistic UI with server confirmation.

Nothing from the original project is missing.
