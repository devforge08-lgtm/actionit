-- =====================================================
-- Gig chat: one conversation per accepted student, between them and the
-- business. Open while the gig is ongoing for that student (accepted or
-- work sent, winner not picked yet) and read-only once it's completed.
-- Run after gig_applications.sql. Safe to run more than once.
-- =====================================================

CREATE TABLE IF NOT EXISTS gig_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gig_messages_submission_created
  ON gig_messages (submission_id, created_at);

ALTER TABLE gig_messages ENABLE ROW LEVEL SECURITY;

-- Is the signed-in user the student on this submission, or the business
-- that owns its gig?
CREATE OR REPLACE FUNCTION is_chat_member(p_submission uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM submissions s
    JOIN gigs g ON g.id = s.gig_id
    JOIN companies c ON c.id = g.company_id
    WHERE s.id = p_submission
      AND s.accepted_at IS NOT NULL
      AND (s.student_id = auth.uid() OR c.owner_id = auth.uid())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Ongoing: accepted, winner not picked yet. Picking the winner moves every
-- accepted student to selected / rejected, which closes their chat.
CREATE OR REPLACE FUNCTION is_chat_open(p_submission uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM submissions s
    WHERE s.id = p_submission
      AND s.status IN ('accepted', 'submitted', 'shortlisted')
      AND NOT EXISTS (
        SELECT 1 FROM submissions w WHERE w.gig_id = s.gig_id AND w.status = 'selected'
      )
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION is_chat_member(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_chat_open(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_chat_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION is_chat_open(uuid) TO authenticated;

DROP POLICY IF EXISTS "Chat members read messages" ON gig_messages;
CREATE POLICY "Chat members read messages" ON gig_messages
  FOR SELECT TO authenticated USING (is_chat_member(submission_id));

DROP POLICY IF EXISTS "Chat members send while the gig is ongoing" ON gig_messages;
CREATE POLICY "Chat members send while the gig is ongoing" ON gig_messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND is_chat_member(submission_id)
    AND is_chat_open(submission_id)
  );

-- No update or delete policies: messages can't be edited or removed.
