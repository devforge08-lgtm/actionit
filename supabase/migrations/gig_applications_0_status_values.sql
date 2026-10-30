-- =====================================================
-- Run this on its own BEFORE gig_applications.sql.
-- Some projects store submissions.status as the enum type submission_status
-- instead of text. New enum values can't be used in the same run that adds
-- them, so they go in first here. On projects where status is plain text
-- this does nothing. Safe to run more than once.
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
    ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'applied';
    ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'declined';
    ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'accepted';
    ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'submitted';
    ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'shortlisted';
    ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'rejected';
    ALTER TYPE submission_status ADD VALUE IF NOT EXISTS 'selected';
  END IF;
END $$;
