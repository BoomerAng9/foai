-- Migration 017: Submission ownership column (SHIP-CHECKLIST Gate 3 · Items 18 + 19)
-- Date: 2026-04-22
-- Purpose: Back the new GET /api/tie/submissions/[id] retrieval endpoint with
-- a Firebase-UID owner column so:
--   1. Owners always see their own submissions (regardless of public flag)
--   2. Public submissions (consent_public_visibility = true) are readable
--      by anyone with the submissionId
--   3. Non-public submissions return 404 to non-owners (anti-enumeration;
--      never confirm existence of a private submission to outsiders)
--
-- submitter_email on perform_submissions remains — it is user-controlled
-- text and cannot be trusted for authorization. submitter_uid is set from
-- Firebase admin SDK's verifyIdToken() decoded.uid when a caller is
-- authenticated. Anonymous submissions get NULL here and rely on email for
-- ownership at best-effort level.

ALTER TABLE perform_submissions
  ADD COLUMN IF NOT EXISTS submitter_uid TEXT;

CREATE INDEX IF NOT EXISTS perform_submissions_submitter_uid_idx
  ON perform_submissions (submitter_uid)
  WHERE submitter_uid IS NOT NULL;
