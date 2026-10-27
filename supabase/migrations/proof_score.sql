-- =====================================================
-- Proof Score
-- Run after gig_selection_and_notifications.sql. Safe to run more than once.
--
-- When a business picks a winner, every rated applicant on that gig gets a
-- row in proof_points. A student's score is the sum of their rows, capped at
-- 1000, and only the database can change it.
--
-- Points per gig:
--   rating x 5 (ratings of 3 or lower earn 0), +25 for the winner
--   x 1.5 for paid gigs of Rs 1,000+, x 1 for smaller paid gigs,
--   x 0.6 for certificate / interview / unpaid gigs
--   x 0.5 if the company isn't verified
--   x 0.5 for a 4th+ gig from the same company within 90 days
--
-- Tiers (keep in sync with lib/proof-score.ts):
--   Starter  under 200
--   Rising   200+, 10 gigs, 1 win
--   Proven   500+, 15 gigs, 5 wins, average rating 7+
--   Elite    800+, 25 gigs, 7 wins, average rating 8+
-- =====================================================

-- 1. Score summary on the profile (public, so businesses can see it)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS proof_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proof_tier text NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS proof_gigs int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proof_wins int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proof_rating numeric(3,1);

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_proof_tier_check;
ALTER TABLE profiles
  ADD CONSTRAINT profiles_proof_tier_check
  CHECK (proof_tier IN ('starter', 'rising', 'proven', 'elite'));

-- 2. One row per rated submission on a finished gig. Points stay even if the
--    business later deletes the gig.
CREATE TABLE IF NOT EXISTS proof_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  submission_id uuid UNIQUE REFERENCES submissions(id) ON DELETE SET NULL,
  gig_id uuid REFERENCES gigs(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  gig_title text NOT NULL,
  company_name text NOT NULL,
  rating smallint NOT NULL,
  won boolean NOT NULL,
  base_points int NOT NULL,
  multiplier numeric(4,3) NOT NULL,
  points int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS proof_points_student_created
  ON proof_points (student_id, created_at DESC);

ALTER TABLE proof_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students read own points" ON proof_points;
CREATE POLICY "Students read own points" ON proof_points
  FOR SELECT TO authenticated USING (student_id = auth.uid());

-- 3. Nobody can set their own score any more
DROP FUNCTION IF EXISTS increment_proof_score(uuid, int);

CREATE OR REPLACE FUNCTION protect_proof_fields()
RETURNS trigger AS $$
BEGIN
  -- Requests from the app run as anon/authenticated; the score functions
  -- below run as the table owner.
  IF current_user IN ('anon', 'authenticated') THEN
    NEW.proof_score := OLD.proof_score;
    NEW.proof_tier := OLD.proof_tier;
    NEW.proof_gigs := OLD.proof_gigs;
    NEW.proof_wins := OLD.proof_wins;
    NEW.proof_rating := OLD.proof_rating;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_proof_fields ON profiles;
CREATE TRIGGER trg_protect_proof_fields
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_proof_fields();

-- 4. Ratings and decisions lock once a winner is picked
CREATE OR REPLACE FUNCTION lock_decided_submissions()
RETURNS trigger AS $$
BEGIN
  IF (NEW.rating IS DISTINCT FROM OLD.rating OR NEW.status IS DISTINCT FROM OLD.status)
     AND EXISTS (
       SELECT 1 FROM submissions s
       WHERE s.gig_id = OLD.gig_id AND s.status = 'selected'
     )
  THEN
    RAISE EXCEPTION 'decision_locked' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_lock_decided_submissions ON submissions;
CREATE TRIGGER trg_lock_decided_submissions
  BEFORE UPDATE OF rating, status ON submissions
  FOR EACH ROW EXECUTE FUNCTION lock_decided_submissions();

-- 5. Recalculate one student's score and tier from their points
CREATE OR REPLACE FUNCTION refresh_proof_score(p_student uuid)
RETURNS void AS $$
DECLARE
  n int;
  w int;
  avg_rating numeric;
  score int;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE won), avg(rating), least(coalesce(sum(points), 0), 1000)
  INTO n, w, avg_rating, score
  FROM proof_points
  WHERE student_id = p_student;

  UPDATE profiles SET
    proof_score = score,
    proof_gigs = n,
    proof_wins = w,
    proof_rating = round(avg_rating, 1),
    proof_tier = CASE
      WHEN score >= 800 AND n >= 25 AND w >= 7 AND avg_rating >= 8 THEN 'elite'
      WHEN score >= 500 AND n >= 15 AND w >= 5 AND avg_rating >= 7 THEN 'proven'
      WHEN score >= 200 AND n >= 10 AND w >= 1 THEN 'rising'
      ELSE 'starter'
    END
  WHERE id = p_student;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 6. Award points to every rated applicant on a gig that has a winner.
--    Each submission is awarded once.
CREATE OR REPLACE FUNCTION award_gig_points(p_gig uuid)
RETURNS void AS $$
DECLARE
  g record;
  s record;
  value_weight numeric;
  mult numeric;
  base int;
  recent int;
BEGIN
  SELECT gigs.id, gigs.title, gigs.reward_type, gigs.reward_amount,
         c.id AS company_id, c.name AS company_name, c.verified
  INTO g
  FROM gigs JOIN companies c ON c.id = gigs.company_id
  WHERE gigs.id = p_gig;
  IF NOT FOUND THEN RETURN; END IF;

  value_weight := CASE
    WHEN g.reward_type = 'paid' AND coalesce(g.reward_amount, 0) >= 1000 THEN 1.5
    WHEN g.reward_type = 'paid' THEN 1.0
    ELSE 0.6
  END;

  FOR s IN
    SELECT * FROM submissions
    WHERE gig_id = p_gig AND rating IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM proof_points pp WHERE pp.submission_id = submissions.id)
    ORDER BY created_at
  LOOP
    SELECT count(*) INTO recent
    FROM proof_points
    WHERE student_id = s.student_id
      AND company_id = g.company_id
      AND created_at > now() - interval '90 days';

    base := (CASE WHEN s.rating <= 3 THEN 0 ELSE s.rating * 5 END)
          + (CASE WHEN s.status = 'selected' THEN 25 ELSE 0 END);
    mult := value_weight
          * (CASE WHEN g.verified THEN 1 ELSE 0.5 END)
          * (CASE WHEN recent >= 3 THEN 0.5 ELSE 1 END);

    INSERT INTO proof_points (
      student_id, submission_id, gig_id, company_id, gig_title, company_name,
      rating, won, base_points, multiplier, points
    ) VALUES (
      s.student_id, s.id, g.id, g.company_id, g.title, g.company_name,
      s.rating, s.status = 'selected', base, mult, round(base * mult)
    )
    ON CONFLICT (submission_id) DO NOTHING;

    PERFORM refresh_proof_score(s.student_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION award_points_on_winner()
RETURNS trigger AS $$
BEGIN
  PERFORM award_gig_points(NEW.gig_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_award_points_on_winner ON submissions;
CREATE TRIGGER trg_award_points_on_winner
  AFTER UPDATE OF status ON submissions
  FOR EACH ROW
  WHEN (NEW.status = 'selected' AND OLD.status IS DISTINCT FROM 'selected')
  EXECUTE FUNCTION award_points_on_winner();

-- The app never calls these directly
REVOKE EXECUTE ON FUNCTION refresh_proof_score(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION award_gig_points(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION award_points_on_winner() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION lock_decided_submissions() FROM PUBLIC, anon, authenticated;

-- 7. Backfill: award gigs that already have a winner, then recalculate
--    everyone (this also clears any score set by the old point awards).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT s.gig_id FROM submissions s
    WHERE s.status = 'selected'
    ORDER BY s.created_at
  LOOP
    PERFORM award_gig_points(r.gig_id);
  END LOOP;

  FOR r IN SELECT id FROM profiles LOOP
    PERFORM refresh_proof_score(r.id);
  END LOOP;
END $$;
