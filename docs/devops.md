# DevOps & deployment

The production topology is: **web on GitHub Pages** (static, built by Actions on every push to main), **API on Railway** (Docker image), **database and auth on Supabase**. Locally, everything can run with one command through docker compose, or natively via `npm run dev`.

## Local development

```bash
npm install
npm run dev        # api :8787 (tsx watch) + web :8080 (Vite) — http://localhost:8080/MasterPokedex/
```

Both read the repo-root `.env` (copy `.env.example` and fill it in). Vite is configured with `envDir: "../.."`, and the API/db packages walk up to the same file — a variable set in the shell always beats the file.

## Docker compose

```bash
docker compose up            # api + web, against Supabase (from .env)
```

- `api` — the production image (`apps/api/Dockerfile`, `prod` target), port 8787, healthchecked via `/health`.
- `web` — Vite dev server image, port 8080. `VITE_API_URL` points at `http://localhost:8787` because it's a *browser*-side URL.

Images contain no `.env`; compose interpolates `${DATABASE_URL}`, `${SUPABASE_URL}`, `${VITE_SUPABASE_URL}`, `${VITE_SUPABASE_ANON_KEY}` from the repo-root `.env` and passes them as process env.

### Offline mode (no Supabase project)

The `local` profile provides a plain Postgres 17 with the auth shim from migration `0001`:

```bash
docker compose up -d db                                   # Postgres on :55432
docker compose run --rm seed                              # migrate + dex seed + demo cast (one-shot)
docker compose -f docker-compose.yml -f docker-compose.local.yml --profile local up
```

The `seed` service hardcodes `db:5432` and caches the 41 PokeAPI CSVs in the `masterpokedex-dexcache` volume, so re-seeding skips the download. The first dex seed inserts ~250k rows — expect a few minutes. Authenticated routes in this mode accept HS256 tokens minted with `SUPABASE_JWT_SECRET`.

The offline override hardcodes a placeholder Supabase URL, so signing in and creating accounts are disabled and the login page says so. To test real auth, stop this stack (`docker compose -f docker-compose.yml -f docker-compose.local.yml --profile local down`) and run plain `docker compose up --build` against a filled `.env`.

## Supabase setup (one-time per project)

1. **Fill `.env`** from the Supabase dashboard (Project Settings → Database / API):
   - `DATABASE_URL` — **transaction pooler**, port 6543, with `?sslmode=require`.
   - `DIRECT_DATABASE_URL` — **direct connection**, port 5432, with `?sslmode=require`. Direct connections are IPv6-only; on an IPv4-only network without the IPv4 add-on, use the *session* pooler host on port 5432 here (and only here).
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
2. **Migrate:** `npm run db:migrate`. Migration `0001` detects a real Supabase project and skips the local auth shim. If drizzle-kit reports a certificate-chain error, drop `?sslmode=require` from `DIRECT_DATABASE_URL` for that run only.
3. **Seed the dex:** `npm run db:seed` (~250k rows over the wire; the CSV cache in `packages/db/.cache` makes re-runs fast). A reseed truncates the dex **with CASCADE**, which also clears trainer bags and catches — fine locally, deliberate everywhere. To retire the excluded item categories (49 dynamax-crystals, 23 unused) on a live database *without* reseeding: `DELETE FROM public.trainer_items WHERE item_id IN (SELECT id FROM dex.items WHERE category_id IN (23,49)); DELETE FROM dex.items WHERE category_id IN (23,49);`
4. **Seed the demo cast:** `npm run db:seed:auth` (creates the six demo auth users via the Admin API — this is why the service-role key is needed), then `npm run db:seed:demo`.
   - Fallback: if your project's auth server ignores the requested user ids, the script aborts and tells you; create the rows from the SQL editor instead: `INSERT INTO auth.users (id, email) VALUES ('00000000-0000-4000-8000-000000000001', 'ash@demo.masterpokedex.invalid'), …` then re-run `db:seed:demo`.
5. **Verify:** `npm run db:verify`, then start the API and check `curl localhost:8787/health` → `{"ok":true,"db":"up",…}`.
6. **Auth smoke test:** create a throwaway user, exchange credentials for a token, and call an authed route:

   ```bash
   curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
     -H "apikey: $VITE_SUPABASE_ANON_KEY" -H 'Content-Type: application/json' \
     -d '{"email":"you@example.com","password":"..."}' | jq -r .access_token
   curl -H "Authorization: Bearer <token>" localhost:8787/v1/me   # 200, or 404 = claim a username
   ```

**Email confirmation:** hosted Supabase requires it by default; the login page treats "check your email" as the happy path. **Free-tier pause:** projects pause after ~a week idle — the keep-alive workflow below prevents that.

### Google sign-in (one-time)

"Continue with Google" goes through Supabase's OAuth flow, so it is dashboard configuration, not code:

1. **Google Cloud Console** → create an OAuth client (type "Web application") with authorized redirect URI `https://<ref>.supabase.co/auth/v1/callback`.
2. **Supabase → Authentication → Providers → Google** — enable it and paste the client ID and secret.
3. **Supabase → Authentication → URL Configuration**:
   - Site URL: `https://kuankongy.github.io/MasterPokedex/` (this also sets where email-confirmation links land).
   - Redirect URLs: add `http://localhost:8080/MasterPokedex/` for local dev. The app always sends `redirectTo = origin + BASE_URL` (the app root) because only allowlisted URLs survive the round trip; `OAuthReturn` restores the page the user started from out of sessionStorage.

Without step 3 the OAuth round trip silently lands on whatever Site URL is configured (the Supabase default is `http://localhost:3000`), which looks like a broken sign-in.

## Railway (API)

`railway.json` at the repo root configures the build: Dockerfile builder pointing at `apps/api/Dockerfile` (Railway builds its final `prod` stage), healthcheck on `/health`, restart on failure. Setup:

1. New Railway project → deploy from the GitHub repo, root directory `/`.
2. Set variables:

   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | transaction pooler URL, `:6543`, `?sslmode=require` |
   | `SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `CORS_ORIGINS` | `https://kuankongy.github.io` |
   | `DB_POOL_MAX` | `5` (be polite to the free pooler) |
   | `NODE_ENV` | `production` |

   Do **not** set `PORT` (Railway injects it) or `DIRECT_DATABASE_URL` (migrations never run on Railway — they run from your machine or CI against the direct connection).
3. Optional: set watch paths `apps/api/**`, `packages/db/**`, `packages/shared/**`, `package-lock.json` so web-only pushes don't rebuild the API.
4. Note the public URL — it feeds `VITE_API_URL` and `API_HEALTH_URL` below.

Schema changes later: run `npm run db:migrate` locally against `DIRECT_DATABASE_URL`, then push; Railway redeploys the API.

## GitHub Actions

Three workflows in `.github/workflows/`. They activate once main is pushed to GitHub.

### `deploy-web.yml` — Pages deploy on push
Builds `apps/web` and deploys `apps/web/dist` with the official Pages actions. One-time setup:

1. **Settings → Pages → Source: "GitHub Actions"** (replaces the legacy `gh-pages` branch flow; that branch and the `gh-pages` devDep can be deleted once the first Actions deploy is green).
2. **Settings → Secrets and variables → Actions → Variables** (variables, not secrets — all three end up in the public bundle): `VITE_API_URL` (the Railway URL), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

There is deliberately no path filter: the bundle bakes in `packages/shared`, so contract changes must redeploy the site.

### `ci.yml` — checks
`npm run lint`, `npm run typecheck`, `npm run test` across all workspaces on every push/PR. No database or env needed.

### `keep-alive.yml` — Supabase keep-alive
Cron (every 6 h) curling `${{ vars.API_HEALTH_URL }}` (set it to `https://<railway-service>/health`). `/health` runs `select 1`, so one request keeps both Railway warm and Supabase unpaused; failures show up as red runs. GitHub disables cron workflows after ~60 days without repo activity — re-enable from the Actions tab.

### Deployment order (first time)

1. Supabase migrated + seeded (above).
2. Railway service live → gives you the API URL.
3. Set the four Actions variables (`VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `API_HEALTH_URL`), flip the Pages source.
4. Push main — CI runs, Pages deploys, site live at `https://kuankongy.github.io/MasterPokedex/`.

## Environment variable reference

| Variable | Consumed by | When | Notes |
|---|---|---|---|
| `DATABASE_URL` | API runtime (`packages/db/src/client.ts`) | runtime | Transaction pooler `:6543`; `prepare:false` is set client-side; guarded by `assertPoolerUrl`. |
| `DIRECT_DATABASE_URL` | drizzle-kit + seed/verify scripts | tooling only | Direct `:5432`; guarded by `assertDirectUrl`. Never set on Railway. |
| `DB_POOL_MAX` | API runtime | runtime | Default 10; 5 on Railway. |
| `PORT` | API server | runtime | Default 8787; injected by Railway. |
| `NODE_ENV` | API | runtime | |
| `SUPABASE_URL` | API JWT verification | runtime | Required — the API refuses to boot without a parseable URL. |
| `SUPABASE_JWT_SECRET` | API (HS256 fallback) | runtime | Legacy projects / local token minting only. |
| `SUPABASE_SERVICE_ROLE_KEY` | `db:seed:auth` | tooling only | Bypasses RLS. Never VITE_-prefixed, never committed, never on Railway. |
| `CORS_ORIGINS` | API | runtime | Comma-separated; must include the Pages origin. |
| `VITE_API_URL` | web | **build time** | Baked into the bundle — changing it means rebuilding/redeploying the site. |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | web | **build time** | The anon key is public by design; RLS + API auth do the protecting. |
