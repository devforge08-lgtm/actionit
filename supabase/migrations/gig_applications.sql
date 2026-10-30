-- =====================================================
-- Applications: any number of students can apply to a gig. The business
-- looks at each applicant's profile and accepts up to max_applicants (3).
-- Once 3 are accepted the gig closes (leaves Browse gigs) and anyone still
-- waiting is marked as not accepted. Only accepted students send work.
--
-- A submission row now moves through:
--   applied   -> accepted (business accepts) or declined (not accepted)
--   accepted  -> submitted (student sends work through submit_work())
--   submitted -> selected (winner) or rejected (not selected)
-- Accepted students who never sent work become rejected when the winner
-- is picked, with no rating and no points.
--
-- Run after achievements.sql. Safe to run more than once.
-- =====================================================

-- 1. New columns
ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS pitch text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS accepted_count int NOT NULL DEFAULT 0;

ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE submissions
  ADD CONSTRAINT submissions_status_check
  CHECK (status IN ('applied', 'declined', 'accepted', 'submitted', 'shortlisted', 'rejected', 'selected'));

ALTER TABLE submissions ALTER COLUMN status SET DEFAULT 'applied';

-- 2. Existing rows were all accepted and sent work under the old flow
UPDATE submissions
SET accepted_at = coalesce(accepted_at, created_at),
    submitted_at = coalesce(submitted_at, created_at)
WHERE status IN ('submitted', 'shortlisted', 'rejected', 'selected')
  AND accepted_at IS NULL;

UPDATE gigs g
SET accepted_count = (SELECT count(*) FROM submissions s WHERE s.gig_id = g.id AND s.accepted_at IS NOT NULL),
    applicant_count = (SELECT count(*) FROM submissions s WHERE s.gig_id = g.id);

-- 3. Applying. Runs before the insert: checks the gig is open and still has
--    a spot, and resets everything except who's applying and their pitch,
--    so nobody can insert themselves as accepted or as the winner.
DROP TRIGGER IF EXISTS trg_claim_gig_spot ON submissions;
DROP FUNCTION IF EXISTS claim_gig_spot();

CREATE OR REPLACE FUNCTION new_application()
RETURNS trigger AS $$
DECLARE
  g gigs%ROWTYPE;
BEGIN
  SELECT * INTO g FROM gigs WHERE id = NEW.gig_id FOR UPDATE;

  IF g.id IS NULL OR g.status <> 'published' OR (g.deadline IS NOT NULL AND g.deadline <= now()) THEN
    RAISE EXCEPTION 'gig_closed' USING ERRCODE = 'P0001';
  END IF;
  IF g.accepted_count >= g.max_applicants THEN
    RAISE EXCEPTION 'gig_full' USING ERRCODE = 'P0001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = NEW.student_id AND p.role = 'student') THEN
    RAISE EXCEPTION 'not_student' USING ERRCODE = 'P0001';
  END IF;

  NEW.status := 'applied';
  NEW.pitch := nullif(left(trim(coalesce(NEW.pitch, '')), 1000), '');
  NEW.note := NULL;
  NEW.links := '{}';
  NEW.file_paths := '{}';
  NEW.feedback := NULL;
  NEW.rating := NULL;
  NEW.paid_at := NULL;
  NEW.accepted_at := NULL;
  NEW.submitted_at := NULL;
  NEW.revision_note := NULL;
  NEW.revision_due := NULL;
  NEW.revision_requested_at := NULL;
  NEW.revision_reply := NULL;
  NEW.revision_links := '{}';
  NEW.revision_file_paths := '{}';
  NEW.revised_at := NULL;
  NEW.created_at := now();

  UPDATE gigs SET applicant_count = applicant_count + 1 WHERE id = NEW.gig_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION new_application() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_new_application ON submissions;
CREATE TRIGGER trg_new_application
  BEFORE INSERT ON submissions
  FOR EACH ROW EXECUTE FUNCTION new_application();

-- 4. Withdrawing. Students can pull out until they've sent work. If an
--    accepted student leaves a full gig before its deadline, the gig goes
--    back on Browse gigs so the business can accept someone else.
DROP POLICY IF EXISTS "Students withdraw unreviewed submissions" ON submissions;
DROP POLICY IF EXISTS "Students withdraw before sending work" ON submissions;
CREATE POLICY "Students withdraw before sending work" ON submissions
  FOR DELETE TO authenticated
  USING (student_id = auth.uid() AND status IN ('applied', 'declined', 'accepted'));

CREATE OR REPLACE FUNCTION release_gig_spot()
RETURNS trigger AS $$
BEGIN
  UPDATE gigs
  SET applicant_count = greatest(applicant_count - 1, 0),
      accepted_count = CASE
        WHEN OLD.accepted_at IS NOT NULL THEN greatest(accepted_count - 1, 0)
        ELSE accepted_count
      END,
      status = CASE
        WHEN OLD.accepted_at IS NOT NULL
          AND status = 'closed'
          AND accepted_count >= max_applicants
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

REVOKE EXECUTE ON FUNCTION release_gig_spot() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_release_gig_spot ON submissions;
CREATE TRIGGER trg_release_gig_spot
  AFTER DELETE ON submissions
  FOR EACH ROW EXECUTE FUNCTION release_gig_spot();

-- 5. What the app may change directly on a submission.
--    Businesses can rate, give feedback, mark paid, ask for changes, turn
--    down an applicant, and pick the winner. Accepting goes through
--    accept_applicant() and sending work through submit_work(), which run
--    as the table owner and so skip these checks.
CREATE OR REPLACE FUNCTION guard_submission_changes()
RETURNS trigger AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF NEW.gig_id IS DISTINCT FROM OLD.gig_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.pitch IS DISTINCT FROM OLD.pitch
     OR NEW.note IS DISTINCT FROM OLD.note
     OR NEW.links IS DISTINCT FROM OLD.links
     OR NEW.file_paths IS DISTINCT FROM OLD.file_paths
     OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
     OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at
     OR NEW.revision_reply IS DISTINCT FROM OLD.revision_reply
     OR NEW.revision_links IS DISTINCT FROM OLD.revision_links
     OR NEW.revision_file_paths IS DISTINCT FROM OLD.revision_file_paths
     OR NEW.revised_at IS DISTINCT FROM OLD.revised_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'field_locked' USING ERRCODE = 'P0001';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
       (OLD.status = 'applied' AND NEW.status = 'declined')
    OR (OLD.status IN ('accepted', 'submitted', 'shortlisted') AND NEW.status = 'rejected')
    OR (OLD.status IN ('submitted', 'shortlisted') AND NEW.status IN ('selected', 'shortlisted'))
  ) THEN
    RAISE EXCEPTION 'status_change_not_allowed' USING ERRCODE = 'P0001';
  END IF;

  -- Only work that was actually sent gets rated, asked for changes, or paid
  IF NEW.submitted_at IS NULL AND (
       NEW.rating IS DISTINCT FROM OLD.rating
    OR NEW.revision_requested_at IS DISTINCT FROM OLD.revision_requested_at
    OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
  ) THEN
    RAISE EXCEPTION 'not_submitted' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_guard_submission_changes ON submissions;
CREATE TRIGGER trg_guard_submission_changes
  BEFORE UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION guard_submission_changes();

-- 6. Accept an applicant (the business). Takes a spot; when the last spot
--    goes, the gig closes and everyone still waiting is marked declined.
--    A declined applicant can still be accepted later if a spot opens up.
CREATE OR REPLACE FUNCTION accept_applicant(p_submission uuid)
RETURNS void AS $$
DECLARE
  s submissions%ROWTYPE;
  g gigs%ROWTYPE;
BEGIN
  SELECT * INTO s FROM submissions WHERE id = p_submission;
  IF s.id IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO g FROM gigs WHERE id = s.gig_id FOR UPDATE;
  IF NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = g.company_id AND c.owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO s FROM submissions WHERE id = p_submission FOR UPDATE;
  IF s.status NOT IN ('applied', 'declined') THEN
    RAISE EXCEPTION 'already_accepted' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM submissions x WHERE x.gig_id = g.id AND x.status = 'selected') THEN
    RAISE EXCEPTION 'decision_locked' USING ERRCODE = 'P0001';
  END IF;
  IF g.deadline IS NOT NULL AND g.deadline <= now() THEN
    RAISE EXCEPTION 'gig_closed' USING ERRCODE = 'P0001';
  END IF;
  IF g.accepted_count >= g.max_applicants THEN
    RAISE EXCEPTION 'gig_full' USING ERRCODE = 'P0001';
  END IF;

  UPDATE submissions SET status = 'accepted', accepted_at = now() WHERE id = p_submission;

  UPDATE gigs
  SET accepted_count = accepted_count + 1,
      status = CASE WHEN accepted_count + 1 >= max_applicants THEN 'closed' ELSE status END
  WHERE id = g.id;

  IF g.accepted_count + 1 >= g.max_applicants THEN
    UPDATE submissions SET status = 'declined' WHERE gig_id = g.id AND status = 'applied';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION accept_applicant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION accept_applicant(uuid) TO authenticated;

-- 7. Send work (accepted students only, before the gig deadline)
CREATE OR REPLACE FUNCTION submit_work(
  p_submission uuid,
  p_note text,
  p_links text[],
  p_file_paths text[]
)
RETURNS void AS $$
DECLARE
  s submissions%ROWTYPE;
  g gigs%ROWTYPE;
BEGIN
  SELECT * INTO s FROM submissions WHERE id = p_submission FOR UPDATE;

  IF s.id IS NULL OR s.student_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;
  IF s.status <> 'accepted' THEN
    RAISE EXCEPTION 'not_accepted' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO g FROM gigs WHERE id = s.gig_id;
  IF g.deadline IS NOT NULL AND g.deadline <= now() THEN
    RAISE EXCEPTION 'gig_closed' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (SELECT 1 FROM submissions x WHERE x.gig_id = s.gig_id AND x.status = 'selected') THEN
    RAISE EXCEPTION 'decision_locked' USING ERRCODE = 'P0001';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(coalesce(p_file_paths, '{}')) p
    WHERE p NOT LIKE auth.uid()::text || '/' || s.gig_id::text || '/%'
  ) THEN
    RAISE EXCEPTION 'bad_file_path' USING ERRCODE = 'P0001';
  END IF;
  IF nullif(trim(coalesce(p_note, '')), '') IS NULL
     AND coalesce(array_length(p_links, 1), 0) = 0
     AND coalesce(array_length(p_file_paths, 1), 0) = 0 THEN
    RAISE EXCEPTION 'empty_submission' USING ERRCODE = 'P0001';
  END IF;

  UPDATE submissions
  SET note = nullif(trim(p_note), ''),
      links = coalesce(p_links[1:5], '{}'),
      file_paths = coalesce(p_file_paths[1:5], '{}'),
      status = 'submitted',
      submitted_at = now()
  WHERE id = p_submission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION submit_work(uuid, text, text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION submit_work(uuid, text, text[], text[]) TO authenticated;
