-- =====================================================
-- Gig applications, winner selection, business notifications
-- Safe to run more than once. Includes the columns from add_profile_fields.sql
-- and gig_lifecycle.sql in case those were never run.
-- =====================================================

-- 0. Columns this relies on
ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS max_applicants int NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS rating smallint;

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS proof_score int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS college text,
  ADD COLUMN IF NOT EXISTS skills text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS github text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS portfolio text;

CREATE OR REPLACE FUNCTION increment_proof_score(user_id uuid, amount int)
RETURNS void AS $$
  UPDATE profiles SET proof_score = proof_score + amount WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;


-- 1. Applicant count stored on the gig.
--    Students can only see their own submissions under RLS, so counting
--    submissions from the browser always looked like 0 or 1. The trigger
--    below keeps this column correct for everyone.
ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS applicant_count int NOT NULL DEFAULT 0;

UPDATE gigs g
SET applicant_count = (SELECT count(*) FROM submissions s WHERE s.gig_id = g.id);

-- 2. Ratings are now out of 10
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_rating_check;
ALTER TABLE submissions
  ADD CONSTRAINT submissions_rating_check CHECK (rating >= 1 AND rating <= 10);

-- 3. Payment to the selected student (no payment provider yet, the business
--    marks it as paid once they've sent the money)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- Only one winner per gig
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM submissions WHERE status = 'selected'
    GROUP BY gig_id HAVING count(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS submissions_one_winner_per_gig
      ON submissions (gig_id) WHERE status = 'selected';
  ELSE
    RAISE NOTICE 'Some gigs already have more than one selected submission; one-winner index skipped';
  END IF;
END $$;

-- 4. Insert policy. Whether the gig is open and has a spot left is checked
--    by the trigger below, which runs before this policy and may close the
--    gig as it takes the last spot. (The old policy also counted every
--    submission in the table rather than just this gig's.)
DROP POLICY IF EXISTS "Students can submit to published gigs" ON submissions;
CREATE POLICY "Students can submit to published gigs" ON submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (SELECT 1 FROM gigs WHERE gigs.id = submissions.gig_id)
  );

-- 5. Before a submission goes in: lock the gig row so two students can't
--    take the last spot at the same moment, then count it and close the
--    gig (which removes it from browse) once it's full.
DROP TRIGGER IF EXISTS trg_check_gig_full ON submissions;
DROP FUNCTION IF EXISTS check_gig_full();

CREATE OR REPLACE FUNCTION claim_gig_spot()
RETURNS trigger AS $$
DECLARE
  g gigs%ROWTYPE;
BEGIN
  SELECT * INTO g FROM gigs WHERE id = NEW.gig_id FOR UPDATE;

  IF g.status <> 'published' OR (g.deadline IS NOT NULL AND g.deadline <= now()) THEN
    RAISE EXCEPTION 'gig_closed' USING ERRCODE = 'P0001';
  END IF;
  IF g.applicant_count >= g.max_applicants THEN
    RAISE EXCEPTION 'gig_full' USING ERRCODE = 'P0001';
  END IF;

  UPDATE gigs
  SET applicant_count = applicant_count + 1,
      status = CASE WHEN applicant_count + 1 >= max_applicants THEN 'closed' ELSE status END
  WHERE id = NEW.gig_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_claim_gig_spot ON submissions;
CREATE TRIGGER trg_claim_gig_spot
  BEFORE INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION claim_gig_spot();

-- 6. When a student withdraws, free the spot. If the gig had closed only
--    because it was full (deadline not passed, no winner yet), reopen it.
CREATE OR REPLACE FUNCTION release_gig_spot()
RETURNS trigger AS $$
BEGIN
  UPDATE gigs
  SET applicant_count = greatest(applicant_count - 1, 0),
      status = CASE
        WHEN status = 'closed'
          AND applicant_count >= max_applicants
          AND (deadline IS NULL OR deadline > now())
          AND NOT EXISTS (
            SELECT 1 FROM submissions s
            WHERE s.gig_id = OLD.gig_id AND s.status = 'selected'
          )
        THEN 'published'
        ELSE status
      END
  WHERE id = OLD.gig_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_release_gig_spot ON submissions;
CREATE TRIGGER trg_release_gig_spot
  AFTER DELETE ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION release_gig_spot();

-- 7. In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gig_id uuid REFERENCES gigs(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gig_id, kind)
);

CREATE INDEX IF NOT EXISTS notifications_user_created
  ON notifications (user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON notifications;
CREATE POLICY "Users read own notifications" ON notifications
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users mark own notifications read" ON notifications;
CREATE POLICY "Users mark own notifications read" ON notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 8. Tell businesses when nobody has applied:
--    - 2 days before the deadline, if the gig has been live at least a day
--    - when the deadline passes
--    Also closes published gigs whose deadline has passed.
--    Safe to call as often as you like: each message is sent once per gig.
CREATE OR REPLACE FUNCTION notify_unfilled_gigs()
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, gig_id, kind, title, body)
  SELECT c.owner_id, g.id, 'no_applicants_2_days',
    'No applicants yet for "' || g.title || '"',
    'Sorry, no students have applied to this gig yet and the deadline is in 2 days. '
      || 'A clearer brief or a bigger reward usually helps. We''re sharing it with more students in the meantime.'
  FROM gigs g
  JOIN companies c ON c.id = g.company_id
  WHERE g.status = 'published'
    AND g.applicant_count = 0
    AND g.deadline > now()
    AND g.deadline <= now() + interval '2 days'
    AND coalesce(g.published_at, g.created_at) <= now() - interval '1 day'
  ON CONFLICT (user_id, gig_id, kind) DO NOTHING;

  INSERT INTO notifications (user_id, gig_id, kind, title, body)
  SELECT c.owner_id, g.id, 'no_applicants_deadline',
    '"' || g.title || '" closed with no applicants',
    'We''re sorry, the deadline for this gig has passed and nobody applied. '
      || 'You can post it again with a later deadline and we''ll do our best to get it in front of the right students.'
  FROM gigs g
  JOIN companies c ON c.id = g.company_id
  WHERE g.status IN ('published', 'closed')
    AND g.applicant_count = 0
    AND g.deadline IS NOT NULL
    AND g.deadline <= now()
  ON CONFLICT (user_id, gig_id, kind) DO NOTHING;

  UPDATE gigs SET status = 'closed'
  WHERE status = 'published' AND deadline IS NOT NULL AND deadline <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION notify_unfilled_gigs() TO authenticated;

-- The app calls notify_unfilled_gigs() whenever a business opens their
-- dashboard. If pg_cron is enabled (Database > Extensions in Supabase),
-- also run it every hour so messages go out even when nobody is logged in.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('notify-unfilled-gigs', '0 * * * *', 'SELECT notify_unfilled_gigs()');
  END IF;
END $$;
