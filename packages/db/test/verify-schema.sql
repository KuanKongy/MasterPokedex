-- Schema verification: proves the triggers, constraints and RLS policies
-- actually do what they claim. Run it with
--
--   bun run --filter '@masterpokedex/db' verify
--
-- or directly:  psql "$DIRECT_DATABASE_URL" -v ON_ERROR_STOP=1 -f this-file
--
-- Every assertion RAISEs on failure. The whole thing runs inside a transaction
-- that is rolled back at the end, so it is safe against a seeded database.

BEGIN;

-- ── Fixtures ─────────────────────────────────────────────────────────────────
-- A growth rate with the medium-fast curve (experience = level^3), so the
-- expected level for any experience value is checkable by hand.

INSERT INTO dex.growth_rates (id, name) VALUES (901, 'test-medium')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO dex.experience (growth_rate_id, level, experience)
SELECT 901, lvl, lvl * lvl * lvl FROM generate_series(1, 100) AS lvl
  ON CONFLICT DO NOTHING;

INSERT INTO dex.species (id, name, generation_id, growth_rate_id, capture_rate)
VALUES (9001, 'testmon', 1, 901, 45)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO dex.pokemon
  (id, name, species_id, generation_id, height, weight, hp, attack, defense, special_attack, special_defense, speed)
VALUES
  (9001, 'testmon', 9001, 1, 10, 100, 45, 49, 49, 65, 65, 45),
  (9002, 'testmon-two', 9001, 1, 10, 100, 50, 50, 50, 50, 50, 50)
  ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.users (id) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001'),
  ('bbbbbbbb-0000-4000-8000-000000000002')
  ON CONFLICT (id) DO NOTHING;

INSERT INTO public.trainers (id, username, display_name, is_public) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'alice', 'Alice', true),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'bob',   'Bob',   false);

INSERT INTO public.teams (id, trainer_id, name, category) VALUES
  ('11111111-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001', 'Alice Party', 'party'),
  ('22222222-0000-4000-8000-000000000002', 'bbbbbbbb-0000-4000-8000-000000000002', 'Bob Party',   'party');

-- ── 1. total is a generated column ───────────────────────────────────────────
DO $$
DECLARE v_total integer;
BEGIN
  SELECT total INTO v_total FROM dex.pokemon WHERE id = 9001;
  IF v_total <> 45 + 49 + 49 + 65 + 65 + 45 THEN
    RAISE EXCEPTION 'FAIL[generated-total]: expected 318, got %', v_total;
  END IF;
  RAISE NOTICE 'PASS  generated column: total = %', v_total;
END $$;

-- ── 2. Level is derived from experience, not trusted from the client ─────────
-- 200 experience on a level^3 curve: level 5 needs 125, level 6 needs 216.
-- Expected level is 5. We deliberately pass level = 99 to prove it is ignored.
DO $$
DECLARE v_level smallint;
BEGIN
  INSERT INTO public.caught_pokemon (trainer_id, team_id, pokemon_id, experience, level)
  VALUES ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 9001, 200, 99)
  RETURNING level INTO v_level;

  IF v_level <> 5 THEN
    RAISE EXCEPTION 'FAIL[level-derivation]: expected level 5 for 200 exp, got %', v_level;
  END IF;
  RAISE NOTICE 'PASS  level derivation: 200 exp -> level % (client-supplied 99 ignored)', v_level;
END $$;

-- ── 3. Level recomputes when experience changes ──────────────────────────────
DO $$
DECLARE v_level smallint;
BEGIN
  UPDATE public.caught_pokemon SET experience = 8000
  WHERE trainer_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  RETURNING level INTO v_level;

  IF v_level <> 20 THEN
    RAISE EXCEPTION 'FAIL[level-update]: expected level 20 for 8000 exp, got %', v_level;
  END IF;
  RAISE NOTICE 'PASS  level recompute on update: 8000 exp -> level %', v_level;
END $$;

-- ── 4. Party capacity is enforced at 6 ───────────────────────────────────────
DO $$
DECLARE v_count integer;
BEGIN
  -- One is already in the party from test 2; add five more to reach exactly 6.
  INSERT INTO public.caught_pokemon (trainer_id, team_id, pokemon_id, experience)
  SELECT 'aaaaaaaa-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 9002, 100
  FROM generate_series(1, 5);

  SELECT count(*) INTO v_count FROM public.caught_pokemon
  WHERE team_id = '11111111-0000-4000-8000-000000000001';

  IF v_count <> 6 THEN
    RAISE EXCEPTION 'FAIL[capacity-fill]: expected 6 in party, got %', v_count;
  END IF;
  RAISE NOTICE 'PASS  party filled to capacity: % members', v_count;
END $$;

-- The seventh must be rejected. Note this also proves duplicates ARE allowed:
-- five copies of pokemon 9002 went in above, where the reference schema's
-- `unique_pokemon_per_collection` trigger would have blocked the second.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.caught_pokemon (trainer_id, team_id, pokemon_id, experience)
    VALUES ('aaaaaaaa-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', 9002, 100);
    RAISE EXCEPTION 'FAIL[capacity]: a 7th pokemon was accepted into a party of 6';
  EXCEPTION WHEN sqlstate 'P0001' THEN
    IF SQLERRM NOT LIKE '%team_full%' THEN RAISE; END IF;
    RAISE NOTICE 'PASS  capacity enforced: 7th rejected with team_full';
  END;
END $$;

-- ── 5. A team belonging to another trainer is rejected ───────────────────────
DO $$
BEGIN
  BEGIN
    INSERT INTO public.caught_pokemon (trainer_id, team_id, pokemon_id, experience)
    VALUES ('aaaaaaaa-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000002', 9001, 0);
    RAISE EXCEPTION 'FAIL[ownership]: Alice inserted a pokemon into Bob''s team';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS  cross-trainer team write rejected';
  END;
END $$;

-- ── 6. Username constraints ──────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    INSERT INTO auth.users (id) VALUES ('cccccccc-0000-4000-8000-000000000003');
    INSERT INTO public.trainers (id, username, display_name)
    VALUES ('cccccccc-0000-4000-8000-000000000003', 'MixedCase', 'Nope');
    RAISE EXCEPTION 'FAIL[username-case]: uppercase username accepted';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS  username case constraint enforced';
  END;
END $$;

-- ── 7. Friendship: no self-friending, no duplicate pair in either order ──────
DO $$
BEGIN
  BEGIN
    INSERT INTO public.friendships (requester_id, addressee_id)
    VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'FAIL[self-friend]: a trainer friended themselves';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS  self-friendship rejected';
  END;
END $$;

DO $$
BEGIN
  INSERT INTO public.friendships (requester_id, addressee_id)
  VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002');

  BEGIN
    -- Same pair, reversed. Must collide on the least/greatest unique index.
    INSERT INTO public.friendships (requester_id, addressee_id)
    VALUES ('bbbbbbbb-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000001');
    RAISE EXCEPTION 'FAIL[friend-pair]: reversed duplicate friendship accepted';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS  reversed duplicate friendship rejected';
  END;
END $$;

-- ── 8. responded_at is stamped on accept ─────────────────────────────────────
DO $$
DECLARE v_responded timestamptz;
BEGIN
  UPDATE public.friendships SET status = 'accepted'
  WHERE requester_id = 'aaaaaaaa-0000-4000-8000-000000000001'
  RETURNING responded_at INTO v_responded;

  IF v_responded IS NULL THEN
    RAISE EXCEPTION 'FAIL[responded-at]: not stamped on accept';
  END IF;
  RAISE NOTICE 'PASS  friendship responded_at stamped';
END $$;

-- ── 9. RLS: Bob is private, so a stranger cannot see him ─────────────────────
-- Switching to `authenticated` makes RLS apply; the API's own role bypasses it.
DO $$
DECLARE v_visible integer;
BEGIN
  IF NOT public.is_friend(
      'aaaaaaaa-0000-4000-8000-000000000001',
      'bbbbbbbb-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'FAIL[is_friend]: accepted friendship not reported as friends';
  END IF;
  RAISE NOTICE 'PASS  is_friend() sees the accepted friendship';
END $$;

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'cccccccc-0000-4000-8000-000000000003';

DO $$
DECLARE v_count integer;
BEGIN
  IF auth.uid() <> 'cccccccc-0000-4000-8000-000000000003' THEN
    RAISE EXCEPTION 'FAIL[auth.uid]: got %', auth.uid();
  END IF;

  -- Carol is neither Bob's friend nor Bob; Bob is private.
  SELECT count(*) INTO v_count FROM public.trainers WHERE username = 'bob';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL[rls-trainers]: private trainer visible to a stranger';
  END IF;
  RAISE NOTICE 'PASS  RLS hides a private trainer from a stranger';

  -- Alice is public, so she is visible.
  SELECT count(*) INTO v_count FROM public.trainers WHERE username = 'alice';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL[rls-trainers]: public trainer hidden, count %', v_count;
  END IF;
  RAISE NOTICE 'PASS  RLS shows a public trainer';

  -- Bob's team must be invisible too.
  SELECT count(*) INTO v_count FROM public.teams
  WHERE trainer_id = 'bbbbbbbb-0000-4000-8000-000000000002';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL[rls-teams]: private trainer''s team visible, count %', v_count;
  END IF;
  RAISE NOTICE 'PASS  RLS hides a private trainer''s teams';

  -- Inventory is private even where the profile is public.
  SELECT count(*) INTO v_count FROM public.trainer_items
  WHERE trainer_id = 'aaaaaaaa-0000-4000-8000-000000000001';
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'FAIL[rls-items]: another trainer''s inventory visible';
  END IF;
  RAISE NOTICE 'PASS  RLS keeps inventory private';
END $$;

-- Writing as someone else must fail the WITH CHECK.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.teams (trainer_id, name, category)
    VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'Hijacked', 'box');
    RAISE EXCEPTION 'FAIL[rls-write]: created a team owned by another trainer';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS  RLS blocks writing a row owned by someone else';
  END;
END $$;

-- Reference data stays readable.
DO $$
DECLARE v_count integer;
BEGIN
  SELECT count(*) INTO v_count FROM dex.pokemon WHERE id = 9001;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL[rls-dex]: reference data not readable by authenticated';
  END IF;
  RAISE NOTICE 'PASS  dex reference data readable';
END $$;

RESET ROLE;

ROLLBACK;
