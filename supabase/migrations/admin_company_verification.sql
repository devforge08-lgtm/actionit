-- =====================================================
-- Admins and company verification
-- Admins are listed in the admins table, which the app can't read or write:
-- add or remove admins from the Supabase SQL editor only.
-- Only admins can change companies.verified, and only through
-- set_company_verified(). Run after proof_score.sql. Safe to run more than once.
--
-- Make yourself an admin (use the email you sign in with):
--   INSERT INTO admins (user_id)
--   SELECT id FROM auth.users WHERE email = 'you@example.com'
--   ON CONFLICT DO NOTHING;
-- =====================================================

CREATE TABLE IF NOT EXISTS admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS on with no policies: invisible to anon and authenticated users
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Is the signed-in user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Company owners can't verify themselves. Requests from the app run as
-- anon/authenticated; set_company_verified() and the SQL editor run as the
-- table owner and pass through.
CREATE OR REPLACE FUNCTION guard_company_verification()
RETURNS trigger AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
    NEW.verified_at := NULL;
    NEW.verified_by := NULL;
  ELSIF NEW.verified IS DISTINCT FROM OLD.verified
     OR NEW.verified_at IS DISTINCT FROM OLD.verified_at
     OR NEW.verified_by IS DISTINCT FROM OLD.verified_by THEN
    RAISE EXCEPTION 'verification_admin_only' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_guard_company_verification ON companies;
CREATE TRIGGER trg_guard_company_verification
  BEFORE INSERT OR UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION guard_company_verification();

-- Verify or unverify a company (admins only)
CREATE OR REPLACE FUNCTION set_company_verified(p_company uuid, p_verified boolean)
RETURNS void AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  UPDATE companies SET
    verified = p_verified,
    verified_at = CASE WHEN p_verified THEN now() END,
    verified_by = CASE WHEN p_verified THEN auth.uid() END
  WHERE id = p_company;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION set_company_verified(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_company_verified(uuid, boolean) TO authenticated;

-- Every company with its owner's contact and gig counts (admins only)
CREATE OR REPLACE FUNCTION admin_list_companies()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  website text,
  verified boolean,
  verified_at timestamptz,
  created_at timestamptz,
  owner_name text,
  owner_email text,
  gig_count bigint,
  live_gig_count bigint
) AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT c.id, c.name, c.slug, c.website, c.verified, c.verified_at, c.created_at,
         p.full_name, u.email::text,
         count(g.id),
         count(g.id) FILTER (WHERE g.status = 'published')
  FROM companies c
  JOIN profiles p ON p.id = c.owner_id
  JOIN auth.users u ON u.id = c.owner_id
  LEFT JOIN gigs g ON g.company_id = c.id
  GROUP BY c.id, p.full_name, u.email
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION admin_list_companies() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_list_companies() TO authenticated;
