-- Migration: table clinical_ai_exchanges — trace auditable du fil IA clinique.
-- Double clé (patient OU consultation), isolation par doctor_id (pro_accounts.id).
-- Cohérent avec le pattern double-clé de la table scans (userId + patientId).

CREATE TABLE IF NOT EXISTS "clinical_ai_exchanges" (
  "id" serial PRIMARY KEY,
  "doctor_id" integer NOT NULL REFERENCES "pro_accounts"("id") ON DELETE CASCADE,
  "patient_id" integer REFERENCES "patients"("id") ON DELETE CASCADE,
  "consultation_id" integer REFERENCES "consultations"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "answer" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Index de lecture du fil par contexte (le plus récent en dernier).
CREATE INDEX IF NOT EXISTS "IDX_cae_doctor_patient"
  ON "clinical_ai_exchanges"("doctor_id", "patient_id", "created_at");
CREATE INDEX IF NOT EXISTS "IDX_cae_doctor_consultation"
  ON "clinical_ai_exchanges"("doctor_id", "consultation_id", "created_at");
