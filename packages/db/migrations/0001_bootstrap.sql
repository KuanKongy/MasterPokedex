-- Bootstrap: make this schema runnable on both a real Supabase project and a
-- plain Postgres (Docker/CI) instance.
--
-- On Supabase, `auth.users`, `auth.uid()`, and the `anon` / `authenticated`
-- roles already exist and every block below is a no-op. On bare Postgres they
-- do not, and without them the RLS migration cannot even parse. Each block
-- creates only what is missing and NEVER replaces an existing definition —
-- `create or replace function auth.uid()` would silently clobber Supabase's
-- real implementation, so it is deliberately avoided.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;
--> statement-breakpoint

-- The whole auth shim is gated on a single signal: does `auth.uid()` already
-- exist? If it does we are on Supabase and must touch nothing — the `auth`
-- schema there is owned by `supabase_auth_admin`, so even the GRANTs below
-- would fail, and they are unnecessary because Supabase issues them itself.
DO $$
BEGIN
  IF to_regprocedure('auth.uid()') IS NOT NULL THEN
    RAISE NOTICE 'auth.uid() present — real Supabase project, skipping local shim';
    RETURN;
  END IF;

  RAISE NOTICE 'auth.uid() absent — installing local auth shim for development/CI';

  CREATE SCHEMA IF NOT EXISTS auth;

  IF to_regclass('auth.users') IS NULL THEN
    CREATE TABLE auth.users (
      id uuid PRIMARY KEY,
      email text,
      is_anonymous boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;

  -- Reads the same GUCs PostgREST sets, so RLS behaves identically under test.
  EXECUTE $fn$
    CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $q$
      SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claim.sub', true), ''),
        (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
      )::uuid
    $q$;
  $fn$;

  -- Supabase grants these on a real project; the shim has to do it itself or
  -- every RLS policy that calls auth.uid() fails with "permission denied for
  -- schema auth" the moment a request runs as `authenticated`.
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  GRANT SELECT ON auth.users TO service_role;
END $$;
--> statement-breakpoint

-- A trainer profile IS an auth user. Added here rather than in the Drizzle
-- schema because drizzle-kit does not manage the `auth` schema (see
-- `schemaFilter` in drizzle.config.ts) and would try to drop it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trainers_id_auth_users_fk'
  ) THEN
    ALTER TABLE public.trainers
      ADD CONSTRAINT trainers_id_auth_users_fk
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint

-- Team capacities. This is the reference schema's `Collection2.collection_size`
-- kept as data rather than hardcoded, and it is what the capacity trigger in
-- the next migration reads.
INSERT INTO public.team_categories (slug, label, capacity) VALUES
  ('party',    'Party',    6),
  ('box',      'Box',      30),
  ('showcase', 'Showcase', 12)
ON CONFLICT (slug) DO UPDATE
  SET label = EXCLUDED.label, capacity = EXCLUDED.capacity;
