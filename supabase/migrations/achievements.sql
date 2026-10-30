-- =====================================================
-- Achievements: things a student has built or made before ActionIT,
-- each with a title, a short description and a link (a GitHub repo for
-- code, a Drive / YouTube / Behance link for edits and designs).
-- Students add them during onboarding or later from their profile.
-- Safe to run more than once.
-- =====================================================

CREATE TABLE IF NOT EXISTS achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 100),
  description text CHECK (char_length(description) <= 1000),
  link text NOT NULL CHECK (link ~* '^https?://' AND char_length(link) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS achievements_student_created
  ON achievements (student_id, created_at DESC);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- The student and any business account can read them
DROP POLICY IF EXISTS "Students and businesses read achievements" ON achievements;
CREATE POLICY "Students and businesses read achievements" ON achievements
  FOR SELECT TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM companies c WHERE c.owner_id = auth.uid())
  );

-- Only the student writes their own, and only student accounts have any
DROP POLICY IF EXISTS "Students add own achievements" ON achievements;
CREATE POLICY "Students add own achievements" ON achievements
  FOR INSERT TO authenticated WITH CHECK (
    student_id = auth.uid()
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'student')
  );

DROP POLICY IF EXISTS "Students edit own achievements" ON achievements;
CREATE POLICY "Students edit own achievements" ON achievements
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

DROP POLICY IF EXISTS "Students delete own achievements" ON achievements;
CREATE POLICY "Students delete own achievements" ON achievements
  FOR DELETE TO authenticated USING (student_id = auth.uid());

-- At most 20 per student
CREATE OR REPLACE FUNCTION limit_achievements()
RETURNS trigger AS $$
BEGIN
  IF (SELECT count(*) FROM achievements WHERE student_id = NEW.student_id) >= 20 THEN
    RAISE EXCEPTION 'achievement_limit' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION limit_achievements() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_limit_achievements ON achievements;
CREATE TRIGGER trg_limit_achievements
  BEFORE INSERT ON achievements
  FOR EACH ROW EXECUTE FUNCTION limit_achievements();
