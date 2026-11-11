-- Espace médical D4 — Agenda et Suivis (handoff « espace médical » §3.2, §3.6). Idempotent.
--  · Un suivi = un patient avec une date de prochain contrôle (next_control_at),
--    un cas suivi (followup_reason) et, éventuellement, une clôture.
--    (« follow_up_reminders » existe déjà pour les consultations en ligne B2C.)
--  · derm_followup_events : fil du suivi (observation du médecin, relance,
--    message du patient reçu sur WhatsApp, création, clôture, réouverture).

ALTER TABLE patients ADD COLUMN IF NOT EXISTS next_control_at TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS followup_reason TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS followup_closed_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS derm_followup_events (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  pro_account_id INTEGER REFERENCES pro_accounts(id) ON DELETE CASCADE,
  kind VARCHAR(12) NOT NULL CHECK (kind IN ('created', 'obs', 'relance', 'patient_msg', 'close', 'reopen')),
  body TEXT,
  evolution VARCHAR(60),                 -- observation : « Amélioration », « Stable »…
  attachment TEXT,                       -- data URL (photo ou PDF, 5 Mo au plus)
  attachment_name TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS derm_followup_events_idx ON derm_followup_events (patient_id, created_at DESC);

ALTER TABLE derm_followup_events ENABLE ROW LEVEL SECURITY;
