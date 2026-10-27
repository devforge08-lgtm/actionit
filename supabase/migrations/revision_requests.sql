-- =====================================================
-- One round of changes: before picking a winner, the business can send a
-- submission back once with a note and a due date. The student's revised
-- work is stored next to the original, so both stay visible.
-- Run after proof_score.sql. Safe to run more than once.
-- =====================================================

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS revision_note text,
  ADD COLUMN IF NOT EXISTS revision_due timestamptz,
  ADD COLUMN IF NOT EXISTS revision_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS revision_reply text,
  ADD COLUMN IF NOT EXISTS revision_links text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS revision_file_paths text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS revised_at timestamptz;

-- Only one round, and none after a winner is picked
CREATE OR REPLACE FUNCTION guard_revision_request()
RETURNS trigger AS $$
BEGIN
  IF NEW.revision_requested_at IS DISTINCT FROM OLD.revision_requested_at THEN
    IF OLD.revision_requested_at IS NOT NULL THEN
      RAISE EXCEPTION 'revision_used' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM submissions s WHERE s.gig_id = NEW.gig_id AND s.status = 'selected') THEN
      RAISE EXCEPTION 'decision_locked' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.revision_due IS NULL OR NEW.revision_due <= now() THEN
      RAISE EXCEPTION 'revision_due_invalid' USING ERRCODE = 'P0001';
    END IF;
  ELSIF NEW.revision_due IS DISTINCT FROM OLD.revision_due
     OR NEW.revision_note IS DISTINCT FROM OLD.revision_note THEN
    -- the request can't be edited after it's sent
    RAISE EXCEPTION 'revision_used' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION guard_revision_request() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_guard_revision_request ON submissions;
CREATE TRIGGER trg_guard_revision_request
  BEFORE UPDATE OF revision_requested_at, revision_due, revision_note ON submissions
  FOR EACH ROW EXECUTE FUNCTION guard_revision_request();

-- Students can't update submissions directly, so revised work goes through
-- this function, which checks it's their submission and still on time.
CREATE OR REPLACE FUNCTION submit_revision(
  p_submission uuid,
  p_reply text,
  p_links text[],
  p_file_paths text[]
)
RETURNS void AS $$
DECLARE
  s submissions%ROWTYPE;
BEGIN
  SELECT * INTO s FROM submissions WHERE id = p_submission FOR UPDATE;

  IF s.id IS NULL OR s.student_id <> auth.uid() THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0001';
  END IF;
  IF s.revision_requested_at IS NULL OR s.revised_at IS NOT NULL THEN
    RAISE EXCEPTION 'no_revision_open' USING ERRCODE = 'P0001';
  END IF;
  IF s.revision_due <= now() THEN
    RAISE EXCEPTION 'revision_late' USING ERRCODE = 'P0001';
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

  UPDATE submissions
  SET revision_reply = nullif(trim(p_reply), ''),
      revision_links = coalesce(p_links[1:5], '{}'),
      revision_file_paths = coalesce(p_file_paths[1:5], '{}'),
      revised_at = now()
  WHERE id = p_submission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION submit_revision(uuid, text, text[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION submit_revision(uuid, text, text[], text[]) TO authenticated;
