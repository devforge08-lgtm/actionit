-- =====================================================
-- Gig lifecycle: 3-applicant cap, rating, proof score
-- =====================================================

-- 1. Add max_applicants column to gigs (default 3)
ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS max_applicants int NOT NULL DEFAULT 3;

-- 2. Add rating column to submissions (company rates each applicant 1-5 after review)
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS rating smallint CHECK (rating >= 1 AND rating <= 5);

-- 3. Add proof_score to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS proof_score int NOT NULL DEFAULT 0;

-- 4. Create a function to count submissions for a gig
CREATE OR REPLACE FUNCTION get_submission_count(gig_uuid uuid)
RETURNS int AS $$
  SELECT count(*)::int FROM submissions WHERE gig_id = gig_uuid;
$$ LANGUAGE sql STABLE;

-- 5. RLS policy: prevent submission if gig already has max applicants
-- Drop existing insert policy first if it exists
DROP POLICY IF EXISTS "Students can submit to published gigs" ON submissions;

CREATE POLICY "Students can submit to published gigs" ON submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM gigs
      WHERE gigs.id = gig_id
        AND gigs.status = 'published'
        AND (SELECT count(*) FROM submissions s WHERE s.gig_id = gig_id) < gigs.max_applicants
    )
  );

-- 6. Function to auto-close gig when max applicants reached
CREATE OR REPLACE FUNCTION check_gig_full()
RETURNS trigger AS $$
DECLARE
  gig_max int;
  current_count int;
BEGIN
  SELECT max_applicants INTO gig_max FROM gigs WHERE id = NEW.gig_id;
  SELECT count(*) INTO current_count FROM submissions WHERE gig_id = NEW.gig_id;
  
  IF current_count >= gig_max THEN
    UPDATE gigs SET status = 'closed' WHERE id = NEW.gig_id AND status = 'published';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger: after a new submission, check if gig should auto-close
DROP TRIGGER IF EXISTS trg_check_gig_full ON submissions;
CREATE TRIGGER trg_check_gig_full
  AFTER INSERT ON submissions
  FOR EACH ROW
  EXECUTE FUNCTION check_gig_full();

-- 8. RPC to increment proof score
CREATE OR REPLACE FUNCTION increment_proof_score(user_id uuid, amount int)
RETURNS void AS $$
  UPDATE profiles SET proof_score = proof_score + amount WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER;
