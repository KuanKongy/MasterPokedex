-- Business rules that the reference project enforced with Oracle triggers,
-- reimplemented in Postgres. Two of its five triggers are gone entirely:
-- `enforce_total_stats` is now a generated column, and `validate_pokemon_stats`
-- is now plain CHECK constraints. What is left genuinely needs procedural code.

-- ── 1. Level is derived, never supplied ──────────────────────────────────────
--
-- Replaces `enforce_level_calculation`, which reimplemented six growth curves
-- in PL/SQL as FLOOR(POWER(...)) expressions and then REJECTED any row whose
-- level disagreed with its own arithmetic — pushing the burden of computing
-- level onto every caller, with a formula that did not match the games.
--
-- Here the level is simply looked up in `dex.experience`, which is the real
-- table shipped with the games: the highest level whose threshold the Pokémon's
-- experience has reached. Clients send experience and never send level.
CREATE OR REPLACE FUNCTION public.sync_caught_pokemon_level()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_growth_rate_id integer;
  v_level smallint;
BEGIN
  SELECT s.growth_rate_id INTO v_growth_rate_id
  FROM dex.pokemon p
  JOIN dex.species s ON s.id = p.species_id
  WHERE p.id = NEW.pokemon_id;

  IF v_growth_rate_id IS NULL THEN
    -- Species has no growth rate (shouldn't happen post-ETL); clamp and move on
    -- rather than blocking a catch on reference-data gaps.
    NEW.level := GREATEST(1, LEAST(100, COALESCE(NEW.level, 1)));
    RETURN NEW;
  END IF;

  -- Uses experience_lookup_idx on (growth_rate_id, experience).
  SELECT MAX(e.level) INTO v_level
  FROM dex.experience e
  WHERE e.growth_rate_id = v_growth_rate_id
    AND e.experience <= NEW.experience;

  NEW.level := GREATEST(1, LEAST(100, COALESCE(v_level, 1)));
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER caught_pokemon_sync_level
BEFORE INSERT OR UPDATE OF experience, pokemon_id ON public.caught_pokemon
FOR EACH ROW EXECUTE FUNCTION public.sync_caught_pokemon_level();
--> statement-breakpoint

-- ── 2. Team capacity, and the team actually belongs to you ───────────────────
--
-- Replaces `check_team_size`. Two differences that matter:
--
--   a) The advisory lock. The original counted rows and compared to a limit
--      with nothing serialising concurrent inserts, so two simultaneous catches
--      could both observe 5/6 and both commit — a seventh Pokémon in a party of
--      six. Locking on the team id for the duration of the transaction closes
--      that window.
--
--   b) The ownership check. Nothing in the reference schema stopped a row from
--      naming one trainer while pointing at another trainer's collection. The
--      API never constructs such a row, but the database should not depend on
--      the API being correct.
CREATE OR REPLACE FUNCTION public.enforce_team_invariants()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_capacity  smallint;
  v_owner     uuid;
  v_current   integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.team_id::text, 0));

  SELECT tc.capacity, t.trainer_id
    INTO v_capacity, v_owner
  FROM public.teams t
  JOIN public.team_categories tc ON tc.slug = t.category
  WHERE t.id = NEW.team_id;

  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'team % does not exist', NEW.team_id USING ERRCODE = '23503';
  END IF;

  IF v_owner <> NEW.trainer_id THEN
    RAISE EXCEPTION 'team % belongs to a different trainer', NEW.team_id USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_current
  FROM public.caught_pokemon cp
  WHERE cp.team_id = NEW.team_id
    AND (TG_OP = 'INSERT' OR cp.id <> NEW.id);

  IF v_current >= v_capacity THEN
    RAISE EXCEPTION 'team_full: team % already holds %/% pokemon', NEW.team_id, v_current, v_capacity
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER caught_pokemon_enforce_team
BEFORE INSERT OR UPDATE OF team_id, trainer_id ON public.caught_pokemon
FOR EACH ROW EXECUTE FUNCTION public.enforce_team_invariants();
--> statement-breakpoint

-- ── 3. updated_at ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER trainers_touch_updated_at
BEFORE UPDATE ON public.trainers
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
--> statement-breakpoint

CREATE TRIGGER trainer_items_touch_updated_at
BEFORE UPDATE ON public.trainer_items
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
--> statement-breakpoint

-- ── 4. Friendship response timestamp ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.stamp_friendship_response()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'pending' THEN
    NEW.responded_at := now();
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER friendships_stamp_response
BEFORE UPDATE OF status ON public.friendships
FOR EACH ROW EXECUTE FUNCTION public.stamp_friendship_response();
