-- Row Level Security.
--
-- Read this before changing anything here: THE API IS THE AUTHORIZATION
-- BOUNDARY. It connects with a role that bypasses RLS, so these policies are
-- not what protects a normal request — the `requireAuth` middleware and the
-- trainer-scoped query helpers are. RLS is the second line: it makes the
-- database safe if anything ever reaches it by another path (PostgREST, a
-- leaked anon key, supabase-js from the browser, a future edge function).
--
-- Deliberately NOT using FORCE ROW LEVEL SECURITY: the API must keep bypassing.
-- If you ever switch the API to a non-superuser role that sets
-- `request.jwt.claims` per transaction, add FORCE and these policies become the
-- primary control.

-- ── Helpers ──────────────────────────────────────────────────────────────────
--
-- SECURITY DEFINER because the trainers policy calls this, and evaluating it
-- as the caller would re-enter the friendships policy and recurse. `search_path`
-- is pinned so the function body cannot be hijacked by a caller-set path.
CREATE OR REPLACE FUNCTION public.is_friend(a uuid, b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT a IS NOT NULL AND b IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = a AND f.addressee_id = b)
        OR (f.requester_id = b AND f.addressee_id = a))
  );
$$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.can_view_trainer(target uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trainers t
    WHERE t.id = target
      AND (t.is_public OR t.id = auth.uid() OR public.is_friend(auth.uid(), t.id))
  );
$$;
--> statement-breakpoint

-- ── public.trainers ──────────────────────────────────────────────────────────
ALTER TABLE public.trainers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY trainers_select ON public.trainers FOR SELECT
  USING (is_public OR id = auth.uid() OR public.is_friend(auth.uid(), id));
--> statement-breakpoint
CREATE POLICY trainers_insert ON public.trainers FOR INSERT
  WITH CHECK (id = auth.uid());
--> statement-breakpoint
CREATE POLICY trainers_update ON public.trainers FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
--> statement-breakpoint
CREATE POLICY trainers_delete ON public.trainers FOR DELETE
  USING (id = auth.uid());
--> statement-breakpoint

-- ── public.teams ─────────────────────────────────────────────────────────────
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY teams_select ON public.teams FOR SELECT
  USING (trainer_id = auth.uid() OR public.can_view_trainer(trainer_id));
--> statement-breakpoint
CREATE POLICY teams_write ON public.teams FOR ALL
  USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
--> statement-breakpoint

-- ── public.caught_pokemon ────────────────────────────────────────────────────
ALTER TABLE public.caught_pokemon ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY caught_select ON public.caught_pokemon FOR SELECT
  USING (trainer_id = auth.uid() OR public.can_view_trainer(trainer_id));
--> statement-breakpoint
CREATE POLICY caught_write ON public.caught_pokemon FOR ALL
  USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
--> statement-breakpoint

-- ── public.trainer_items ─────────────────────────────────────────────────────
-- Inventory is private even from friends; a bag is not a showcase.
ALTER TABLE public.trainer_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY trainer_items_owner ON public.trainer_items FOR ALL
  USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
--> statement-breakpoint

-- ── public.favorites ─────────────────────────────────────────────────────────
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY favorites_select ON public.favorites FOR SELECT
  USING (trainer_id = auth.uid() OR public.can_view_trainer(trainer_id));
--> statement-breakpoint
CREATE POLICY favorites_write ON public.favorites FOR ALL
  USING (trainer_id = auth.uid()) WITH CHECK (trainer_id = auth.uid());
--> statement-breakpoint

-- ── public.friendships ───────────────────────────────────────────────────────
-- You see a relationship only if you are in it. You may only ever create a
-- request AS yourself, and only the addressee may accept, decline or block —
-- so nobody can add themselves to someone else's friend list.
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY friendships_select ON public.friendships FOR SELECT
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
--> statement-breakpoint
CREATE POLICY friendships_insert ON public.friendships FOR INSERT
  WITH CHECK (requester_id = auth.uid() AND addressee_id <> auth.uid());
--> statement-breakpoint
CREATE POLICY friendships_update ON public.friendships FOR UPDATE
  USING (addressee_id = auth.uid()) WITH CHECK (addressee_id = auth.uid());
--> statement-breakpoint
CREATE POLICY friendships_delete ON public.friendships FOR DELETE
  USING (requester_id = auth.uid() OR addressee_id = auth.uid());
--> statement-breakpoint

-- ── public.activity ──────────────────────────────────────────────────────────
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY activity_select ON public.activity FOR SELECT
  USING (trainer_id = auth.uid() OR public.is_friend(auth.uid(), trainer_id));
--> statement-breakpoint
CREATE POLICY activity_insert ON public.activity FOR INSERT
  WITH CHECK (trainer_id = auth.uid());
--> statement-breakpoint

-- ── public.team_categories ───────────────────────────────────────────────────
-- Reference data: readable by everyone, writable by nobody.
ALTER TABLE public.team_categories ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY team_categories_read ON public.team_categories FOR SELECT USING (true);
--> statement-breakpoint

-- ── dex.* ────────────────────────────────────────────────────────────────────
-- Reference data imported from PokeAPI. Read-only to everyone: SELECT is
-- granted, no write privilege is, and RLS with a read-all policy means that
-- stays true even if `dex` is later added to Supabase's exposed schemas.
GRANT USAGE ON SCHEMA dex TO anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA dex TO anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA dex GRANT SELECT ON TABLES TO anon, authenticated;
--> statement-breakpoint

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'dex' LOOP
    EXECUTE format('ALTER TABLE dex.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    EXECUTE format(
      'CREATE POLICY %I ON dex.%I FOR SELECT USING (true)',
      t.tablename || '_read', t.tablename
    );
  END LOOP;
END $$;
--> statement-breakpoint

-- ── Grants on public.* ───────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON public.team_categories TO anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.trainers, public.teams, public.caught_pokemon,
  public.trainer_items, public.favorites, public.friendships, public.activity
  TO authenticated;
--> statement-breakpoint
GRANT SELECT ON public.trainers, public.teams, public.caught_pokemon TO anon;
