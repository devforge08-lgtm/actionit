-- =====================================================
-- Notifications for students and businesses, the Important section on
-- both dashboards, and the 2-active-gigs limit for students.
-- Run after gig_chat.sql. Safe to run more than once.
-- =====================================================

-- 1. More detail on each notification: which submission it's about, where
--    clicking it goes, whether it's important (shown at the top of the
--    dashboard until read), and a key so each message is sent only once.
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS submission_id uuid REFERENCES submissions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS link text,
  ADD COLUMN IF NOT EXISTS important boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dedupe_key text;

UPDATE notifications
SET dedupe_key = kind || ':' || coalesce(gig_id::text, id::text)
WHERE dedupe_key IS NULL;

UPDATE notifications
SET important = true,
    link = coalesce(link, '/company/gigs/' || gig_id || '/submissions')
WHERE kind IN ('no_applicants_2_days', 'no_applicants_deadline') AND link IS NULL;

ALTER TABLE notifications ALTER COLUMN dedupe_key SET NOT NULL;

-- The old one-per-(user, gig, kind) rule can't hold chat messages from
-- several students on one gig, so the key replaces it.
DO $$
DECLARE c text;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'notifications'::regclass AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE notifications DROP CONSTRAINT %I', c);
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_user_key
  ON notifications (user_id, dedupe_key);

CREATE INDEX IF NOT EXISTS notifications_user_unread
  ON notifications (user_id) WHERE read_at IS NULL;

-- People can mark their own notifications read, and change nothing else
CREATE OR REPLACE FUNCTION guard_notification_changes()
RETURNS trigger AS $$
BEGIN
  IF current_user IN ('anon', 'authenticated') AND (
       NEW.user_id IS DISTINCT FROM OLD.user_id
    OR NEW.gig_id IS DISTINCT FROM OLD.gig_id
    OR NEW.submission_id IS DISTINCT FROM OLD.submission_id
    OR NEW.kind IS DISTINCT FROM OLD.kind
    OR NEW.dedupe_key IS DISTINCT FROM OLD.dedupe_key
    OR NEW.title IS DISTINCT FROM OLD.title
    OR NEW.body IS DISTINCT FROM OLD.body
    OR NEW.link IS DISTINCT FROM OLD.link
    OR NEW.important IS DISTINCT FROM OLD.important
    OR NEW.created_at IS DISTINCT FROM OLD.created_at
  ) THEN
    RAISE EXCEPTION 'field_locked' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_guard_notification_changes ON notifications;
CREATE TRIGGER trg_guard_notification_changes
  BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION guard_notification_changes();

-- 2. Sending one. With p_repeat (chat), a newer message replaces the older
--    unread one instead of piling up a notification per message.
CREATE OR REPLACE FUNCTION push_notification(
  p_user uuid,
  p_kind text,
  p_key text,
  p_title text,
  p_body text,
  p_link text,
  p_gig uuid DEFAULT NULL,
  p_submission uuid DEFAULT NULL,
  p_important boolean DEFAULT false,
  p_repeat boolean DEFAULT false
)
RETURNS void AS $$
BEGIN
  IF p_user IS NULL THEN
    RETURN;
  END IF;
  p_title := coalesce(p_title, 'ActionIT update');
  p_body := coalesce(p_body, '');

  IF p_repeat THEN
    INSERT INTO notifications (user_id, gig_id, submission_id, kind, dedupe_key, title, body, link, important)
    VALUES (p_user, p_gig, p_submission, p_kind, p_key, p_title, p_body, p_link, p_important)
    ON CONFLICT (user_id, dedupe_key) DO UPDATE
    SET title = EXCLUDED.title,
        body = EXCLUDED.body,
        link = EXCLUDED.link,
        important = EXCLUDED.important,
        created_at = now(),
        read_at = NULL;
  ELSE
    INSERT INTO notifications (user_id, gig_id, submission_id, kind, dedupe_key, title, body, link, important)
    VALUES (p_user, p_gig, p_submission, p_kind, p_key, p_title, p_body, p_link, p_important)
    ON CONFLICT (user_id, dedupe_key) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION push_notification(uuid, text, text, text, text, text, uuid, uuid, boolean, boolean)
  FROM PUBLIC, anon, authenticated;

-- Dates in messages are shown in India time, e.g. "31 Oct, 11:59 PM"
CREATE OR REPLACE FUNCTION ist(p timestamptz)
RETURNS text AS $$
  SELECT to_char(p AT TIME ZONE 'Asia/Kolkata', 'FMDD Mon, FMHH12:MI AM');
$$ LANGUAGE sql IMMUTABLE;

CREATE OR REPLACE FUNCTION student_name(p_student uuid)
RETURNS text AS $$
  SELECT coalesce(nullif(p.full_name, ''), '@' || p.username, 'A student')
  FROM profiles p WHERE p.id = p_student;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION student_name(uuid) FROM PUBLIC, anon, authenticated;

-- 3. Raising an issue: an accepted student can flag something urgent in the
--    chat (brief unclear, can't make the deadline, payment problem...). It
--    shows highlighted in the chat and reaches the business as an
--    important alert.
ALTER TABLE gig_messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'message',
  ADD COLUMN IF NOT EXISTS issue_reason text;

ALTER TABLE gig_messages DROP CONSTRAINT IF EXISTS gig_messages_kind_check;
ALTER TABLE gig_messages
  ADD CONSTRAINT gig_messages_kind_check CHECK (
    (kind = 'message' AND issue_reason IS NULL)
    OR (kind = 'issue' AND issue_reason IN ('brief_unclear', 'deadline', 'payment', 'other'))
  );

-- Only the student on the gig can raise one
CREATE OR REPLACE FUNCTION check_chat_message()
RETURNS trigger AS $$
BEGIN
  IF NEW.kind = 'issue' AND NOT EXISTS (
    SELECT 1 FROM submissions s WHERE s.id = NEW.submission_id AND s.student_id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'students_only' USING ERRCODE = 'P0001';
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION check_chat_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_check_chat_message ON gig_messages;
CREATE TRIGGER trg_check_chat_message
  BEFORE INSERT ON gig_messages
  FOR EACH ROW EXECUTE FUNCTION check_chat_message();

-- 4. Chat messages: the other side hears about each new one (one
--    notification per chat, kept up to date). Issues are their own alert.
CREATE OR REPLACE FUNCTION notify_chat_message()
RETURNS trigger AS $$
DECLARE
  s submissions%ROWTYPE;
  g gigs%ROWTYPE;
  owner uuid;
  company text;
  sender text;
BEGIN
  SELECT * INTO s FROM submissions WHERE id = NEW.submission_id;
  SELECT * INTO g FROM gigs WHERE id = s.gig_id;
  SELECT c.owner_id, c.name INTO owner, company FROM companies c WHERE c.id = g.company_id;
  company := coalesce(company, 'The business');

  IF NEW.sender_id = s.student_id THEN
    sender := student_name(s.student_id);

    IF NEW.kind = 'issue' THEN
      PERFORM push_notification(
        owner, 'issue', 'issue:' || NEW.id,
        sender || ' raised an issue: '
          || CASE NEW.issue_reason
               WHEN 'brief_unclear' THEN 'the brief is unclear'
               WHEN 'deadline' THEN 'can''t make the deadline'
               WHEN 'payment' THEN 'payment problem'
               ELSE 'something''s wrong' END,
        g.title || ': ' || left(NEW.body, 200),
        '/company/gigs/' || g.id || '/chat/' || s.id,
        g.id, s.id, true
      );
    ELSE
      PERFORM push_notification(
        owner, 'chat_message', 'chat:' || s.id,
        'New message from ' || sender,
        g.title || ': ' || left(NEW.body, 160),
        '/company/gigs/' || g.id || '/chat/' || s.id,
        g.id, s.id, false, true
      );
    END IF;
  ELSE
    PERFORM push_notification(
      s.student_id, 'chat_message', 'chat:' || s.id,
      'New message from ' || company,
      g.title || ': ' || left(NEW.body, 160),
      '/submissions/' || s.id || '/chat',
      g.id, s.id, false, true
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION notify_chat_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_chat_message ON gig_messages;
CREATE TRIGGER trg_notify_chat_message
  AFTER INSERT ON gig_messages
  FOR EACH ROW EXECUTE FUNCTION notify_chat_message();

-- 5. Changes to a submission.
--    Student: accepted, not accepted, asked for changes, won, not selected, paid.
--    Business: a student sent work or their changes.
CREATE OR REPLACE FUNCTION notify_submission_change()
RETURNS trigger AS $$
DECLARE
  g gigs%ROWTYPE;
  company text;
  owner uuid;
BEGIN
  SELECT * INTO g FROM gigs WHERE id = NEW.gig_id;
  SELECT c.name, c.owner_id INTO company, owner FROM companies c WHERE c.id = g.company_id;
  company := coalesce(company, 'The business');

  IF NEW.status = 'declined' AND OLD.status = 'applied' THEN
    PERFORM push_notification(
      NEW.student_id, 'declined', 'declined:' || NEW.id,
      'Not accepted for "' || g.title || '"',
      company || ' went with other students for this one. That frees up a slot, so keep applying.',
      '/gigs',
      g.id, NEW.id
    );
  END IF;

  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' THEN
    PERFORM push_notification(
      NEW.student_id, 'not_selected', 'not_selected:' || NEW.id,
      'Results are in for "' || g.title || '"',
      company || ' picked another student''s work this time. '
        || CASE WHEN NEW.rating IS NOT NULL
             THEN 'You were rated ' || NEW.rating || '/10, which still adds to your Proof Score.'
             ELSE 'Every gig is a fresh shot.' END,
      '/submissions?tab=completed',
      g.id, NEW.id
    );
  END IF;

  IF NEW.paid_at IS NOT NULL AND OLD.paid_at IS NULL THEN
    PERFORM push_notification(
      NEW.student_id, 'paid', 'paid:' || NEW.id,
      'Payment sent for "' || g.title || '"',
      company || ' marked your reward as sent. Let them know in chat if it hasn''t reached you.',
      '/submissions?tab=completed',
      g.id, NEW.id, true
    );
  END IF;

  IF NEW.submitted_at IS NOT NULL AND OLD.submitted_at IS NULL THEN
    PERFORM push_notification(
      owner, 'work_sent', 'work_sent:' || NEW.id,
      student_name(NEW.student_id) || ' sent their work',
      'For "' || g.title || '". Rate it out of 10 when you''ve had a look.',
      '/company/gigs/' || g.id || '/submissions',
      g.id, NEW.id
    );
    -- The student's own reminders about sending it are done with
    UPDATE notifications SET read_at = now()
    WHERE submission_id = NEW.id AND read_at IS NULL
      AND kind IN ('accepted', 'deadline_3_days', 'deadline_1_day');
  END IF;

  IF NEW.revised_at IS NOT NULL AND OLD.revised_at IS NULL THEN
    PERFORM push_notification(
      owner, 'changes_sent', 'changes_sent:' || NEW.id,
      student_name(NEW.student_id) || ' sent the changes you asked for',
      'For "' || g.title || '".',
      '/company/gigs/' || g.id || '/submissions',
      g.id, NEW.id
    );
  END IF;

  IF NEW.revised_at IS NOT NULL AND OLD.revised_at IS NULL THEN
    UPDATE notifications SET read_at = now()
    WHERE submission_id = NEW.id AND read_at IS NULL
      AND kind IN ('changes_requested', 'changes_due_1_day');
  END IF;

  -- Once the winner is picked, the business's reminders for this gig are done with
  IF NEW.status = 'selected' AND OLD.status IS DISTINCT FROM 'selected' THEN
    UPDATE notifications SET read_at = now()
    WHERE user_id = owner AND gig_id = g.id AND read_at IS NULL
      AND kind IN ('pick_winner', 'gig_deadline_1_day');
  END IF;

  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
    PERFORM push_notification(
      NEW.student_id, 'accepted', 'accepted:' || NEW.id,
      'You''re in for "' || g.title || '"',
      company || ' accepted you for this gig. '
        || CASE WHEN g.deadline IS NOT NULL
             THEN 'Send your work by ' || ist(g.deadline) || '. '
             ELSE '' END
        || 'You can chat with them from My gigs.',
      '/submissions?tab=ongoing',
      g.id, NEW.id, true
    );
  END IF;

  IF NEW.status = 'selected' AND OLD.status IS DISTINCT FROM 'selected' THEN
    PERFORM push_notification(
      NEW.student_id, 'won', 'won:' || NEW.id,
      'You won "' || g.title || '"',
      company || ' picked your work as the winner. Your Proof Score points are in.',
      '/submissions?tab=completed',
      g.id, NEW.id, true
    );
  END IF;

  IF NEW.revision_requested_at IS NOT NULL AND OLD.revision_requested_at IS NULL THEN
    PERFORM push_notification(
      NEW.student_id, 'changes_requested', 'changes_requested:' || NEW.id,
      'Changes requested on "' || g.title || '"',
      company || ' asked for changes, due by ' || ist(NEW.revision_due) || ': '
        || left(coalesce(NEW.revision_note, ''), 200),
      '/submissions/' || NEW.id || '/revise',
      g.id, NEW.id, true
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION notify_submission_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_submission_change ON submissions;
CREATE TRIGGER trg_notify_submission_change
  AFTER UPDATE ON submissions
  FOR EACH ROW EXECUTE FUNCTION notify_submission_change();

-- 6. Business: new applicants (one notification per gig, kept up to date
--    with how many are waiting) and accepted students who withdraw.
CREATE OR REPLACE FUNCTION notify_application_change()
RETURNS trigger AS $$
DECLARE
  g gigs%ROWTYPE;
  owner uuid;
  waiting int;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO g FROM gigs WHERE id = NEW.gig_id;
    SELECT c.owner_id INTO owner FROM companies c WHERE c.id = g.company_id;
    SELECT count(*) INTO waiting FROM submissions s WHERE s.gig_id = g.id AND s.status = 'applied';

    PERFORM push_notification(
      owner, 'new_applicants', 'new_applicants:' || g.id,
      CASE WHEN waiting <= 1 THEN 'New applicant for "' || g.title || '"'
           ELSE waiting || ' applicants waiting on "' || g.title || '"' END,
      student_name(NEW.student_id) || ' just applied. Look at their profile and accept up to '
        || g.max_applicants || ' students.',
      '/company/gigs/' || g.id || '/submissions',
      g.id, NULL, false, true
    );
    RETURN NEW;
  END IF;

  -- Withdrawn after being accepted. The submission is gone, so the
  -- notification only points at the gig.
  IF OLD.accepted_at IS NOT NULL THEN
    SELECT * INTO g FROM gigs WHERE id = OLD.gig_id;
    SELECT c.owner_id INTO owner FROM companies c WHERE c.id = g.company_id;

    PERFORM push_notification(
      owner, 'withdrew', 'withdrew:' || OLD.id,
      student_name(OLD.student_id) || ' left "' || g.title || '"',
      'They withdrew before sending work, so a spot is open again. You can accept another applicant.',
      '/company/gigs/' || g.id || '/submissions',
      g.id, NULL, true
    );
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION notify_application_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notify_application_change ON submissions;
CREATE TRIGGER trg_notify_application_change
  AFTER INSERT OR DELETE ON submissions
  FOR EACH ROW EXECUTE FUNCTION notify_application_change();

-- 7. "No applicants" messages for businesses, now with a link and marked
--    important. Same messages as before, still sent once per gig.
CREATE OR REPLACE FUNCTION notify_unfilled_gigs()
RETURNS void AS $$
BEGIN
  INSERT INTO notifications (user_id, gig_id, kind, dedupe_key, title, body, link, important)
  SELECT c.owner_id, g.id, 'no_applicants_2_days', 'no_applicants_2_days:' || g.id,
    'No applicants yet for "' || g.title || '"',
    'Sorry, no students have applied to this gig yet and the deadline is in 2 days. '
      || 'A clearer brief or a bigger reward usually helps. We''re sharing it with more students in the meantime.',
    '/company/gigs/' || g.id || '/submissions', true
  FROM gigs g
  JOIN companies c ON c.id = g.company_id
  WHERE g.status = 'published'
    AND g.applicant_count = 0
    AND g.deadline > now()
    AND g.deadline <= now() + interval '2 days'
    AND coalesce(g.published_at, g.created_at) <= now() - interval '1 day'
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  INSERT INTO notifications (user_id, gig_id, kind, dedupe_key, title, body, link, important)
  SELECT c.owner_id, g.id, 'no_applicants_deadline', 'no_applicants_deadline:' || g.id,
    '"' || g.title || '" closed with no applicants',
    'We''re sorry, the deadline for this gig has passed and nobody applied. '
      || 'You can post it again with a later deadline and we''ll do our best to get it in front of the right students.',
    '/company/gigs/' || g.id || '/submissions', true
  FROM gigs g
  JOIN companies c ON c.id = g.company_id
  WHERE g.status IN ('published', 'closed')
    AND g.applicant_count = 0
    AND g.deadline IS NOT NULL
    AND g.deadline <= now()
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  UPDATE gigs SET status = 'closed'
  WHERE status = 'published' AND deadline IS NOT NULL AND deadline <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Deadline reminders for students and businesses, plus the messages
--    above. Safe to call as often as you like: each one goes out once.
CREATE OR REPLACE FUNCTION send_due_notifications()
RETURNS void AS $$
BEGIN
  PERFORM notify_unfilled_gigs();

  -- Gig deadline in 3 days, accepted student hasn't sent work yet
  INSERT INTO notifications (user_id, gig_id, submission_id, kind, dedupe_key, title, body, link, important)
  SELECT s.student_id, g.id, s.id, 'deadline_3_days', 'deadline_3_days:' || s.id,
    '3 days left on "' || g.title || '"',
    'Your work is due by ' || ist(g.deadline) || '. Ask the business in chat if anything is unclear.',
    '/gigs/' || g.id || '/submit', true
  FROM submissions s
  JOIN gigs g ON g.id = s.gig_id
  WHERE s.status = 'accepted'
    AND g.deadline > now() + interval '1 day'
    AND g.deadline <= now() + interval '3 days'
    AND s.accepted_at <= now() - interval '12 hours'
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  -- Gig deadline in under a day
  INSERT INTO notifications (user_id, gig_id, submission_id, kind, dedupe_key, title, body, link, important)
  SELECT s.student_id, g.id, s.id, 'deadline_1_day', 'deadline_1_day:' || s.id,
    '"' || g.title || '" is due in less than a day',
    'You haven''t sent your work yet. The deadline is ' || ist(g.deadline) || '.',
    '/gigs/' || g.id || '/submit', true
  FROM submissions s
  JOIN gigs g ON g.id = s.gig_id
  WHERE s.status = 'accepted'
    AND g.deadline > now()
    AND g.deadline <= now() + interval '1 day'
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  -- Change request due in under a day and not answered yet
  INSERT INTO notifications (user_id, gig_id, submission_id, kind, dedupe_key, title, body, link, important)
  SELECT s.student_id, g.id, s.id, 'changes_due_1_day', 'changes_due_1_day:' || s.id,
    'Changes for "' || g.title || '" are due in less than a day',
    'Send your changes by ' || ist(s.revision_due) || '.',
    '/submissions/' || s.id || '/revise', true
  FROM submissions s
  JOIN gigs g ON g.id = s.gig_id
  WHERE s.revision_requested_at IS NOT NULL
    AND s.revised_at IS NULL
    AND s.revision_due > now()
    AND s.revision_due <= now() + interval '1 day'
    AND s.status IN ('submitted', 'shortlisted')
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  -- Business: gig deadline in under a day and accepted students still
  -- haven't sent work
  INSERT INTO notifications (user_id, gig_id, kind, dedupe_key, title, body, link, important)
  SELECT c.owner_id, g.id, 'gig_deadline_1_day', 'gig_deadline_1_day:' || g.id,
    '"' || g.title || '" is due in less than a day',
    pending.n || ' of the students you accepted '
      || CASE WHEN pending.n = 1 THEN 'hasn''t' ELSE 'haven''t' END
      || ' sent work yet. The deadline is ' || ist(g.deadline) || '.',
    '/company/gigs/' || g.id || '/submissions', true
  FROM gigs g
  JOIN companies c ON c.id = g.company_id
  CROSS JOIN LATERAL (
    SELECT count(*) AS n FROM submissions s WHERE s.gig_id = g.id AND s.status = 'accepted'
  ) pending
  WHERE pending.n > 0
    AND g.deadline > now()
    AND g.deadline <= now() + interval '1 day'
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;

  -- Business: work is in and nothing else is coming (everyone sent it, or
  -- the deadline passed), so it's time to rate and pick a winner
  INSERT INTO notifications (user_id, gig_id, kind, dedupe_key, title, body, link, important)
  SELECT c.owner_id, g.id, 'pick_winner', 'pick_winner:' || g.id,
    'Time to pick a winner for "' || g.title || '"',
    'All the work is in. Rate each piece out of 10, then pick the winner so everyone gets their result.',
    '/company/gigs/' || g.id || '/submissions', true
  FROM gigs g
  JOIN companies c ON c.id = g.company_id
  WHERE EXISTS (SELECT 1 FROM submissions s WHERE s.gig_id = g.id AND s.submitted_at IS NOT NULL)
    AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.gig_id = g.id AND s.status = 'selected')
    AND (
      (g.deadline IS NOT NULL AND g.deadline <= now())
      OR (g.accepted_count >= g.max_applicants
          AND NOT EXISTS (SELECT 1 FROM submissions s WHERE s.gig_id = g.id AND s.status = 'accepted'))
    )
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION send_due_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION send_due_notifications() TO authenticated;

-- The app calls send_due_notifications() when someone opens their dashboard.
-- With pg_cron enabled it also runs every hour, replacing the old job.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-unfilled-gigs') THEN
      PERFORM cron.unschedule('notify-unfilled-gigs');
    END IF;
    PERFORM cron.schedule('send-due-notifications', '0 * * * *', 'SELECT send_due_notifications()');
  END IF;
END $$;

-- 9. A student can have at most 2 gigs going at once: applications still
--    waiting on an open gig, gigs they're accepted on (until the deadline),
--    and work waiting for the winner pick. Finished gigs, declined
--    applications and gigs that closed before they were accepted don't count.
CREATE OR REPLACE FUNCTION active_gig_count(p_student uuid, p_except uuid DEFAULT NULL)
RETURNS int AS $$
  SELECT count(*)::int
  FROM submissions s
  JOIN gigs g ON g.id = s.gig_id
  WHERE s.student_id = p_student
    AND s.id IS DISTINCT FROM p_except
    AND (
         (s.status = 'applied' AND g.status = 'published' AND (g.deadline IS NULL OR g.deadline > now()))
      OR (s.status = 'accepted' AND (g.deadline IS NULL OR g.deadline > now()))
      OR s.status IN ('submitted', 'shortlisted')
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION active_gig_count(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- For the app: how many the signed-in student has going
CREATE OR REPLACE FUNCTION my_active_gig_count()
RETURNS int AS $$
  SELECT active_gig_count(auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION my_active_gig_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION my_active_gig_count() TO authenticated;

-- Applying: same as gig_applications.sql, plus the 2-gig check
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
  -- Locking the student's profile stops two applications at the same moment
  -- from both getting under the limit
  PERFORM 1 FROM profiles p WHERE p.id = NEW.student_id AND p.role = 'student' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_student' USING ERRCODE = 'P0001';
  END IF;
  IF active_gig_count(NEW.student_id) >= 2 THEN
    RAISE EXCEPTION 'too_many_gigs' USING ERRCODE = 'P0001';
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

-- Accepting: same as gig_applications.sql, plus a check that the student
-- isn't already on 2 other gigs (a declined applicant can be accepted
-- later, when they may have taken on other gigs in the meantime)
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
  PERFORM 1 FROM profiles p WHERE p.id = s.student_id FOR UPDATE;
  IF active_gig_count(s.student_id, s.id) >= 2 THEN
    RAISE EXCEPTION 'student_busy' USING ERRCODE = 'P0001';
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
