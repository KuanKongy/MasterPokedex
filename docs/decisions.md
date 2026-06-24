# Architecture decisions

Short ADR-style records of the choices people ask about. Context: this app rewrites a university database project (see [feature-parity.md](feature-parity.md)) into a hosted product with a tiny, read-heavy dataset and a single maintainer.

## Hono over Express

**Chosen:** Hono 4 on `@hono/node-server`.

- Hono is written against the Web Standard `Request`/`Response`, so the same app code runs on Node, Bun, Deno or edge runtimes. This repo actually migrated Bun→Node mid-project, and the server change was a one-line adapter swap — with Express it would have been a framework rewrite.
- TypeScript is first-class: typed path params, a typed per-request context (`c.get('db')`, `c.get('auth')` via module augmentation), and typed middleware, with no `@types/express` version drift.
- The middleware this API needs — CORS, logger, secure headers, zod validation via `@hono/zod-validator` — ships with the framework instead of as a pile of third-party packages.
- Express 4 is effectively in maintenance mode (callback-style middleware, awkward ESM story, slow release cadence); Hono is small, fast and actively developed.

**Trade-off accepted:** a smaller ecosystem of drop-in middleware. Nothing this API needs is missing.

## Drizzle over raw SQL or a heavyweight ORM

**Chosen:** drizzle-orm + drizzle-kit over postgres.js.

- The schema lives in TypeScript (`packages/db/src/schema/`) as the single source of truth; `drizzle-kit generate` derives the SQL migrations from it, and every query result is fully typed with zero codegen.
- Drizzle is a query *builder*, not an object mapper: what you write corresponds 1:1 to the SQL that runs, including joins, CTEs and the `sql` escape hatch. The relational-division and aggregation queries in `routes/stats.ts` are essentially the course project's SQL, typed.
- No query-engine binary or runtime schema (unlike Prisma) — it's a thin layer over postgres.js, which matters because the runtime connects through Supabase's transaction pooler (`prepare: false`).
- Failures stay legible: `lib/errors.ts` unwraps `DrizzleQueryError.cause` to the pg error and maps constraint names to stable API error codes.

## An API layer instead of "straight Supabase" (supabase-js from the browser)

**Chosen:** the browser talks to our Hono API; Supabase provides hosted Postgres and auth only.

- The business rules — team capacity by category, level derived from experience, the friend-request state machine, demo-trainer guards, visibility rules — live in TypeScript route code and a few triggers, where they can be unit-tested, reviewed and versioned. Client-only supabase-js would force every rule into RLS policies and SQL triggers, which are far harder to test and evolve.
- The API shapes responses (joins across `dex` and `public` schemas, curated map data, pagination cursors) into exactly what each page needs; a supabase-js client would issue N queries and join client-side.
- Authorization is scoped in one place: every `/v1/me/*` query filters by the verified JWT `sub`. RLS still exists (migration `0003`) as a defense-in-depth backstop, not as the primary mechanism.
- Vendor mobility: the app's Supabase surface is "any Postgres" plus "any OIDC issuer with a JWKS endpoint". Moving off Supabase means changing connection strings and an issuer URL, not rewriting every data access in the frontend.
- Supabase is still used where it genuinely shines: hosted auth with email confirmation, hosted Postgres, RLS.

## No Redis

**Considered and rejected** (2026-09): the dataset is small (~250k reference rows, tiny per-user tables) and Postgres serves it in single-digit milliseconds through the pooler. The genuinely cacheable data is already cached where it helps: `Cache-Control: public, max-age=3600` on `/v1/pokemon/*`, React Query on the client, and sprites/CSVs on CDNs. Auth is stateless JWTs (no session store), there are no queues, and a single API instance means no cross-instance invalidation problem. Redis would be one more service to run, pay for and keep alive, for no measurable win. If server-side caching ever becomes necessary, the first step is an in-process LRU in the API, not a network hop.

## Two connection strings

`DATABASE_URL` (transaction pooler, `:6543`) for the API runtime; `DIRECT_DATABASE_URL` (direct, `:5432`) for migrations and the ETL seed, because drizzle-kit hangs through the pooler and COPY wants a real session. Both are guarded at startup (`assertPoolerUrl` / `assertDirectUrl`) because mixing them up is the single most common misconfiguration in this stack.

## Source-only packages, no build step

Workspace packages export raw `.ts`; the API runs through `tsx` in dev, in Docker and on Railway. For a codebase this size, a compile step would add build orchestration (project references, watch pipelines, dist syncing) and buy nothing — typechecking still happens (`npm run typecheck`, CI), and `tsx`'s startup cost is irrelevant for a long-running server. Consequence: `tsx` is a production dependency of `apps/api`, and Docker images ship workspace sources.

## GitHub Pages + Railway split

The web app is fully static after build, so it rides GitHub Pages for free with CI deploys. The API needs a long-running process and outbound Postgres, so it lives on Railway as a Docker image. The split also keeps the two failure domains independent: the dex pages degrade gracefully if the API is briefly down, and the API doesn't care about Pages outages.
