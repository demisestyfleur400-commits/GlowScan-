-- Espace médical D2 — Patients (fiche administrative) et Dossiers médicaux
-- (handoff « espace médical » §3.3 à §3.5). Idempotent.
--  · Fiche administrative : archivage, email, ville, date de naissance, contact
--    d'urgence, représentant légal, préférences de contact (canaux, usage).
--  · Dossier médical : allergies, consentement photo, antécédents / prescriptions /
--    examens ajoutés à la main (patient_record_notes), documents joints
--    (patient_documents, réservés au médecin).

ALTER TABLE patients ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS birth_date DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_name TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS legal_rep TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_channels TEXT[] NOT NULL DEFAULT ARRAY['WhatsApp']::TEXT[];
ALTER TABLE patients ADD COLUMN IF NOT EXISTS contact_usage TEXT NOT NULL DEFAULT 'Rappels de rendez-vous uniquement.';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS allergies_at TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS photo_consent_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS patient_record_notes (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  pro_account_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  kind VARCHAR(4) NOT NULL CHECK (kind IN ('ant', 'rx', 'ex')),   -- antécédents | prescription | examen
  body TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS patient_record_notes_idx ON patient_record_notes (patient_id, kind, created_at DESC);

CREATE TABLE IF NOT EXISTS patient_documents (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  pro_account_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mime VARCHAR(80) NOT NULL,
  size_bytes INTEGER NOT NULL,
  data TEXT NOT NULL,                                               -- data URL (5 Mo au plus)
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS patient_documents_idx ON patient_documents (patient_id, created_at DESC);

ALTER TABLE patient_record_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
