-- Migration: Add intakePending column to patients table
-- Tracks if patient dossier is waiting for doctor analysis
-- true = en attente (pending), false = analysé (analyzed)

ALTER TABLE "patients" ADD COLUMN "intake_pending" boolean DEFAULT true;

-- Index for faster "pending patients" queries
CREATE INDEX "IDX_patients_intake_pending" ON "patients"("intake_pending");
