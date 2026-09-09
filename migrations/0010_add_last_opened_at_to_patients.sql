-- Migration: Add lastOpenedAt column to patients table
-- Tracks when a dermatologist last opened this dossier, to auto-resume the
-- most recently worked-on patient at login (like an editor reopening the last
-- file). Read only within a 4h window; isolation is by dermatologist_id.

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "last_opened_at" timestamp;

-- Index for the "last opened by this dermatologist, most recent first" query.
CREATE INDEX IF NOT EXISTS "IDX_patients_last_opened_at"
  ON "patients"("dermatologist_id", "last_opened_at");
