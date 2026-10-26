-- =====================================================
-- Base schema: profiles, companies, gigs, submissions, file storage
-- Run this once on a fresh Supabase project, before the other migrations.
-- Then run gig_selection_and_notifications.sql.
-- (add_profile_fields.sql and gig_lifecycle.sql are already folded in here.)
-- =====================================================

DO $$
BEGIN
  IF to_regclass('public.gigs') IS NOT NULL THEN
    RAISE EXCEPTION 'The gigs table already exists on this project, so skip this file and run gig_selection_and_notifications.sql instead';
  END IF;
END $$;

-- Profiles: one per auth user, filled in during onboarding
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text CHECK (role IN ('student', 'company')),
  full_name text,
  username text UNIQUE,
  bio text,
  college text,
  skills text[] DEFAULT '{}',
  github text,
  linkedin text,
  portfolio text,
  proof_score int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Profiles for anyone who signed up before this ran
INSERT INTO profiles (id, full_name)
SELECT id, coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Companies: one per company account
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  website text,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Gigs
CREATE TABLE gigs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  deliverables text,
  reward_type text NOT NULL DEFAULT 'paid'
    CHECK (reward_type IN ('paid', 'certificate', 'interview', 'unpaid')),
  reward_amount numeric,
  deadline timestamptz,
  is_remote boolean NOT NULL DEFAULT true,
  location text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'closed')),
  max_applicants int NOT NULL DEFAULT 3,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX gigs_status_published ON gigs (status, published_at DESC);

-- Stamp published_at the first time a gig goes live
CREATE OR REPLACE FUNCTION set_published_at()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_set_published_at
  BEFORE INSERT OR UPDATE OF status ON gigs
  FOR EACH ROW EXECUTE FUNCTION set_published_at();

-- Submissions: a student's application + work for a gig
CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gig_id uuid NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note text,
  links text[] NOT NULL DEFAULT '{}',
  file_paths text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'shortlisted', 'rejected', 'selected')),
  feedback text,
  rating smallint,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gig_id, student_id)
);

-- Row level security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are public" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "Companies are public" ON companies FOR SELECT USING (true);
CREATE POLICY "Users create own company" ON companies
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners update own company" ON companies
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Live gigs are public, drafts only to owner" ON gigs
  FOR SELECT USING (
    status <> 'draft'
    OR EXISTS (SELECT 1 FROM companies c WHERE c.id = gigs.company_id AND c.owner_id = auth.uid())
  );
CREATE POLICY "Owners create gigs" ON gigs
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = gigs.company_id AND c.owner_id = auth.uid()));
CREATE POLICY "Owners update gigs" ON gigs
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = gigs.company_id AND c.owner_id = auth.uid()));
CREATE POLICY "Owners delete gigs" ON gigs
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = gigs.company_id AND c.owner_id = auth.uid()));

CREATE POLICY "Students see own, companies see their gigs' submissions" ON submissions
  FOR SELECT TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gigs g JOIN companies c ON c.id = g.company_id
      WHERE g.id = submissions.gig_id AND c.owner_id = auth.uid()
    )
  );
-- The insert policy is created in gig_selection_and_notifications.sql
CREATE POLICY "Companies review their gigs' submissions" ON submissions
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM gigs g JOIN companies c ON c.id = g.company_id
      WHERE g.id = submissions.gig_id AND c.owner_id = auth.uid()
    )
  );
CREATE POLICY "Students withdraw unreviewed submissions" ON submissions
  FOR DELETE TO authenticated USING (student_id = auth.uid() AND status = 'submitted');

-- File uploads: private bucket, files stored at <student id>/<gig id>/<file>
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Students upload to own folder" ON storage.objects;
CREATE POLICY "Students upload to own folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Students and gig owners read files" ON storage.objects;
CREATE POLICY "Students and gig owners read files" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.gigs g JOIN public.companies c ON c.id = g.company_id
        WHERE g.id::text = (storage.foldername(name))[2] AND c.owner_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Students delete own files" ON storage.objects;
CREATE POLICY "Students delete own files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);
