# Frontend features

React 18 + Vite single-page app in `apps/web`, served under the `/MasterPokedex/` base path (GitHub Pages project site). Stack: React Router 6, TanStack Query, Tailwind + shadcn/radix, `@supabase/supabase-js` for auth, next-themes.

## Cross-cutting behavior

- **Routing & base path.** `BrowserRouter` uses `import.meta.env.BASE_URL` as its basename (`apps/web/src/App.tsx`); Vite's `base: '/MasterPokedex/'` is hardcoded in `apps/web/vite.config.ts`. Deep links on GitHub Pages work because the build copies `index.html` to `404.html` (SPA fallback). Internal navigation must use router `<Link>`s — a raw `<a href="/">` would escape the base.
- **Data fetching.** All server state goes through TanStack Query (staleTime 5 min, no refetch on focus). `apps/web/src/lib/api.ts` builds requests against `VITE_API_URL` and attaches the Supabase access token from the current session when one exists.
- **Auth.** `AuthProvider` wraps the app; `auth/RequireAuth.tsx` guards protected routes and preserves the intended destination in `location.state.from` so login bounces you back.
- **Theming.** next-themes with light / dark / system over the token palette; chosen on the Settings page.
- **Sprite preference.** `SpritePrefContext` lets the user pick pixel sprites, official artwork, or HOME renders; applied across cards, detail pages, evolution chains, teams and encounters, persisted per device (localStorage), with a 404-fallback per style. Images come from the PokeAPI sprites CDN.

## Pages

### `/` — National Pokédex (`pages/PokemonList.tsx`)
The dex grid. Server-driven name search, type filter (`components/TypeFilter.tsx`), sort select (number, name, base-stat total, each individual stat), infinite "Load more" via keyset cursors. Each card shows sprite, id, name, types; hovering reveals a **Catch** button that opens `CatchPokemonDialog` for signed-in trainers and redirects to `/login` otherwise.

### `/pokemon/:id` — Pokémon detail (`pages/PokemonDetail.tsx`)
Hero with sprite and prev/next navigation (capped at dex id 1025), favorite toggle (prompts sign-in when logged out), species text and genus, height/weight/growth rate/capture rate, type badges, abilities. Sections: **Matchups** (offensive/defensive efficacy from `/v1/types/:name`), base-stat bars, **Evolution Chain** (clickable, branching-aware), and tabs for **Locations** (encounters grouped by region/location with method, levels, rarity) and **Moves** (learnset table with a show-all toggle).

### `/map` — World map (`pages/Map.tsx`)
One tab per region (all ten). Each shows curated map art (with `placeholder.svg` fallback), a description, and location pins positioned by percentage coordinates. Clicking a pin opens `LocationDetails`: curated art and blurb, clickable neighbouring locations, and real per-area encounter tables (method, level range, rarity buckets).

### `/trainer` — Trainer hub (`pages/Trainer.tsx`, auth required)
Two tabs:

- **My Profile.** If `GET /v1/me` 404s, a `ClaimUsername` onboarding card. Otherwise: profile card (avatar, rank, badges, live counts, privacy toggle via edit form), **TeamsPanel** (teams with capacity badges — party 6 / box 30 / showcase 12 — member edit popovers for nickname/experience/notes/moving, team move lists, release confirmations), **FriendsPanel** (send by username, accept/decline/unfriend flows), favorites grid, and an activity feed (own + friends').
- **Trainers.** Searchable public directory with avatar/rank/badges/caught-count cards, `Demo` badges on the seeded cast, a pending-request count badge on the tab, paged loading, and drill-down into public profiles where a friend button reflects the current `friendshipStatus`.

### `/items` — Items (`pages/Items.tsx`)
Two tabs. **My Bag** (`ItemInventory`): the bag grouped by pocket with optimistic ±1 quantity steppers (rows disappear at zero); shows a sign-in card when logged out. **Catalogue** (`ItemCatalogue`): the full ~2,200-item catalogue with category select, search, and an add-to-bag shortcut. Defaults to the bag when signed in.

### `/pokemon-filter` — Advanced filter (`pages/PokemonFilter.tsx`)
Query builder over the shared whitelist grammar (`FILTER_FIELD_META` from `packages/shared`): Match-all / Match-any modes, per-condition field + operator + value rows, column visibility toggles, and a results table filtered server-side across the whole dex. This page is the UI face of the validated filter grammar documented in [api.md](api.md).

### `/login` — Sign in (`pages/Login.tsx`)
Sign-in / create-account tabs on Supabase auth. Treats "check your email" as the happy path for confirmations. Redirects back to `location.state.from` (or `/trainer`), and bounces away if already signed in.

### `/settings` — Settings (`pages/Settings.tsx`, public)
Sprite style radio with a live Pikachu preview, theme tabs (light/dark/system), links to FAQ/Privacy/Terms, PokeAPI attribution.

### `/faq`, `/privacy`, `/terms`
World guide (teams, levels-from-experience, shinies, friends, visibility, the bag, demo trainers, data sources…), privacy policy, and terms, on a shared legal-page scaffold. Linked from the footer.

### `*` — Not found (`pages/NotFound.tsx`)
404 page whose home link is a router `<Link>` (deliberately — see base-path note above).

## Shell

`components/Layout.tsx` renders header, outlet and footer. `components/Header.tsx`: logo, desktop search that navigates straight to `/pokemon/:idOrName`, nav (Home / Map / Trainer / Items / Pokémon Filter), a mobile bottom nav and search dialog with typeahead, and an account dropdown (profile, bag, settings, sign out) or a Sign in button.
