-- Migration 002 — Allow "Coding" as a valid application domain (6th domain added)
-- Column is domain_interest (not domain); the inline CHECK in 001 got the
-- auto-generated name applications_domain_interest_check.
-- Apply manually to Neon:
--   psql $DATABASE_URL < migrations/002_add_coding_domain.sql
-- If the DROP finds no constraint, list the actual name first:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'applications'::regclass;

ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_domain_interest_check;
ALTER TABLE applications ADD CONSTRAINT applications_domain_interest_check
  CHECK (domain_interest IN ('Automotive', 'Robotics', 'Design', 'Media', 'Marketing', 'Coding'));
