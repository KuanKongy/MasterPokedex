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
The dex, browsed **generation by generation** by default (pokemondb-style sections with a "Load Generation N" button); searching, type-filtering or re-sorting switches to a flat cursor-paged list. Three view modes, persisted per device and in the URL: **Cards** (six per desktop row, hover **Catch** button → `CatchPokemonDialog` or `/login`), **Sprites** (a dense wall of pixel sprites, `components/dex/DexSpritesGrid.tsx`) and **Stats** (a sortable full-stats table, `components/dex/DexStatsTable.tsx`). All filter/sort/view state lives in URL search params, so views are shareable. The type filter (`components/TypeFilter.tsx`) renders uniform pills with the **official game glyphs** (`components/ui/type-icon.tsx`, path data vendored from duiker101/pokemon-type-svg-icons).

### `/pokemon/:id` — Pokémon detail (`pages/PokemonDetail.tsx`)
Hero with sprite and prev/next navigation (capped at dex id 1025; forms above 10000 get a "View base form" link instead), favorite toggle, species text and genus, height/weight/growth rate/capture rate, type badges, abilities, **Matchups**, base-stat bars and the branching-aware **Evolution Chain**. New: a **Forms & Mega Evolutions** section (`components/pokemon/FormsSection.tsx`), hidden behind a toggle and fetched on open, showing labeled Megas/regionals/Gigantamax with links to their own detail pages (titles show `formLabel`). The **Moves** tab (`components/pokemon/MovesTable.tsx`) groups the learnset by method — level-up (sorted by level), TM, egg, tutor — with sortable columns including PP, and move names link to `/moves/:slug`. The **Locations** tab's entries link to `/locations/:id`.

### `/map` — World map (`pages/Map.tsx`) — the primary Locations entry
One tab per region (deep-linkable via `?region=`). Self-hosted map art from `public/maps/` with **percentage-positioned pins**. Clicking a pin or a list row stays on the page: the right column swaps to a **surface panel** (`components/locations/LocationSurfaceCard.tsx`) with the curated image, description, notable trainers, neighbor chips (re-select in place) and a simple encounter summary; its **Full details** button opens `/locations/:id`. "Browse all locations" links to the catalog, which also lives in the Data menu.

### `/locations` — Locations catalog (`pages/Locations.tsx`)
Every region's locations at once, pokemondb-style: kind badges, area counts, encounter-less rows dimmed, a client-side name filter, and per-region "Open map" links.

### `/locations/:id` — Location detail (`pages/LocationDetailPage.tsx`)
A full page per location: curated art, description, **Notable Trainers** chips, neighbour links, and the shared **simple-first encounter list** (`components/locations/EncounterList.tsx`): each area shows its unique Pokémon as chips by default, with a per-area "Show details" expander revealing the method-grouped tables (levels, rarity + slot %, game chips).

### `/trainer` — Trainer hub (`pages/Trainer.tsx`, auth required)
Two tabs:

- **My Profile.** If `GET /v1/me` 404s, a `ClaimUsername` onboarding card. Otherwise: profile card (avatar, rank, badges, live counts, privacy toggle via edit form), **TeamsPanel** (teams with capacity badges — party 6 / box 30 / showcase 12 — member edit popovers for nickname/experience/notes/moving, team move lists, release confirmations), **FriendsPanel** (send by username, accept/decline/unfriend flows), favorites grid, and an activity feed (own + friends').
- **Trainers.** Searchable public directory with avatar/rank/badges/caught-count cards, `Demo` badges on the seeded cast, a pending-request count badge on the tab, paged loading, and drill-down into public profiles where a friend button reflects the current `friendshipStatus`.

### `/items` — Items (`pages/Items.tsx`)
Two tabs. **My Bag** (`ItemInventory`): the bag grouped by pocket with optimistic ±1 quantity steppers (rows disappear at zero); shows a sign-in card when logged out. **Catalogue** (`ItemCatalogue`): the full ~2,200-item catalogue with category select, search, and an add-to-bag shortcut. Defaults to the bag when signed in.

### `/pokemon-filter` — Advanced search (`pages/PokemonFilter.tsx`)
The query builder, generalized: an entity switcher (Pokémon / Moves / Abilities / Items / Locations, in `?entity=`) drives the condition rows from the shared `ENTITY_FILTER_META` registry, and results render through the per-entity column registry in `pages/advanced/columns.tsx`. The Pokémon grammar answers real questions — filter by `ability`, `evolutionTrigger`, `hasMega`, `hasGmax` or `isFullyEvolved` alongside stats and types.

### The data pages
- `/moves` (`pages/Moves.tsx`) — filterable move index (search, type, class) with effect text and a **Gen column**; a per-page **Columns** popover (`components/ColumnToggle.tsx` + `hooks/useColumnPrefs.ts`, persisted per device) hides what you don't want — the same control sits on the Abilities index and the dex Stats view. Rows link to `/moves/:idOrName` (`pages/MoveDetail.tsx`): move data card, effect prose, and every learner grouped by method.
- `/abilities` (`pages/Abilities.tsx`) — searchable ability index with holder counts; `/abilities/:idOrName` (`pages/AbilityDetail.tsx`) lists every Pokémon with the ability, hidden slots badged.
- `/types` (`pages/TypeChart.tsx`) — the 18×18 efficacy matrix with type-colored, icon-bearing headers; `/types/:name` (`pages/TypeDetail.tsx`) shows one type's offensive/defensive profile and links into the filtered dex.
- `/evolutions` (`pages/Evolutions.tsx`) — the evolution-family index, one card per chain with trigger captions.
- `/mega-evolutions` (`pages/MegaEvolutions.tsx`) — all 97 Megas with labels, types, BST and base-species links.
- `/search` (`pages/SearchResults.tsx`) — the full-page landing for the omnisearch, grouped by kind.

### `/login` — Sign in (`pages/Login.tsx`)
Sign-in / create-account tabs on Supabase auth. Treats "check your email" as the happy path for confirmations. Redirects back to `location.state.from` (or `/trainer`), and bounces away if already signed in.

### `/settings` — Settings (`pages/Settings.tsx`, public)
Sprite style radio with a live Pikachu preview; the **Poké Ball style** grid (ten balls with palette swatch dots) — the chosen ball restyles the whole site in light and dark (20 looks): header/footer bands, app-wide accent, primary buttons, focus rings, the header logo (the ball's sprite) and the loading spinner. Palettes live as CSS variables in `index.css` keyed by `data-ball` on `<html>` (`prefs/ballTheme.ts` carries the theme-color hexes and swatches; an inline script in `index.html` prevents a flash). Then the theme as segmented buttons (a sun/moon cycle button also sits in the header), the **Contact** section (GitHub / LinkedIn / copy-email cards) at the bottom below About, and the FAQ/Privacy/Terms links. Every route change scrolls to the top (`components/ScrollToTop.tsx`).

### `/faq`, `/privacy`, `/terms`
World guide (teams, levels-from-experience, shinies, friends, visibility, the bag, demo trainers, data sources…), privacy policy, and terms, on a shared legal-page scaffold. Linked from the footer.

### `*` — Not found (`pages/NotFound.tsx`)
404 page whose home link is a router `<Link>` (deliberately — see base-path note above).

## Shell

`components/Layout.tsx` renders header, outlet and footer (attribution left; FAQ/Privacy/Terms right). `components/Header.tsx`: the pixel-art logo + "MasterPokédex" brand, nav on the left (Pokédex / Locations / Trainer / Items / **Data ▾** with Moves, Abilities, Type chart, Evolution chains, Mega Evolutions, Advanced search), and on the right the **omnisearch** (`components/OmniSearch.tsx` — debounced, keyboard-navigable, grouped results across all entity kinds via `/v1/search`), then Sign in, then the settings gear. Mobile keeps a bottom tab strip plus a Data menu and a search dialog. Loading states app-wide use the Poké Ball spinner (`components/LoadingSpinner.tsx`), themed by the ball-style preference; item images fall back to a package icon (`components/ItemSprite.tsx`) instead of the broken-image glyph; curated art and demo avatars resolve through `lib/assets.ts` against the site base.
