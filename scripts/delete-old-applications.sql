-- Run ONLY after backing up via /admin/applications -> Export CSV and Export to
-- Google Sheets, and checking the backup has every row.
--
-- S81. Deletes every application submitted through the OLD /join form. Not a
-- migration, not numbered, never run by an agent -- the owner runs it by hand in
-- the Neon SQL editor.
--
-- Prerequisites, in order:
--   1. Backup exported and its row count checked (done 2026-10-01).
--   2. migrations/030_application_course_answers.sql applied -- without it the
--      `answers` column does not exist and this script errors harmlessly.
--   3. The S81 code deployed. Every new-form submission writes a non-NULL
--      `answers`, so `answers IS NULL` matches exactly the old-form rows and
--      can never touch a new submission.
--
-- Nothing references `applications` (no foreign keys, checked in S81 across
-- every migration), so there are no dependent rows to delete first.

-- STEP 1 -- PREVIEW. Run this line ON ITS OWN first.
-- It must equal the backup's row count. If it is HIGHER, someone applied
-- through the old form after the backup was taken: stop and re-export first.
SELECT count(*) AS old_rows_to_delete FROM applications WHERE answers IS NULL;

-- STEP 2 -- DELETE, inside a transaction, with the count ENFORCED.
-- Set `expected` to the number STEP 1 returned, then run this block. If the
-- DELETE removes any other number of rows it raises, and the whole transaction
-- rolls back: nothing is deleted. Left at 0, it deletes nothing -- a forgotten
-- edit is safe. (Checked in-database because the Neon SQL editor runs a pasted
-- BEGIN ... COMMIT in one go, leaving no moment to compare and ROLLBACK by hand.)
BEGIN;
DO $$
DECLARE
  expected integer := 0;  -- <-- set to STEP 1's count
  deleted  integer;
BEGIN
  DELETE FROM applications WHERE answers IS NULL;
  GET DIAGNOSTICS deleted = ROW_COUNT;
  IF deleted <> expected THEN
    RAISE EXCEPTION 'Deleted % rows but expected %. Rolled back, nothing changed.', deleted, expected;
  END IF;
END $$;
COMMIT;
