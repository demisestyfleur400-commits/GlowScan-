-- Espace médical D7 — Paramètres du cabinet (handoff §3.11). Idempotent.
--  · derm_clinic_settings : une ligne par médecin (signature, email du cabinet,
--    horaires de l'agenda, interrupteurs de rappels, tarifs affichés,
--    confidentialité). Les champs du profil restent dans pro_accounts.
--  · secretary_accounts : rôle affiché (Secrétaire / Infirmier·e) et téléphone.
--  · appointments.missed_relance_at : relance après un rendez-vous manqué (anti-doublon).

CREATE TABLE IF NOT EXISTS derm_clinic_settings (
  pro_account_id INTEGER PRIMARY KEY REFERENCES pro_accounts(id) ON DELETE CASCADE,
  signature_text TEXT,
  cabinet_email TEXT,
  open_time VARCHAR(5) NOT NULL DEFAULT '08:00',
  close_time VARCHAR(5) NOT NULL DEFAULT '18:00',
  slot_minutes SMALLINT NOT NULL DEFAULT 30,
  pause_start VARCHAR(5) DEFAULT '12:00',
  pause_end VARCHAR(5) DEFAULT '13:00',
  open_days SMALLINT[] NOT NULL DEFAULT '{1,2,3,4,5}',      -- 1 = lundi … 7 = dimanche
  remind_j1 BOOLEAN NOT NULL DEFAULT TRUE,                  -- veille, WhatsApp « Répondez 1 »
  remind_h2 BOOLEAN NOT NULL DEFAULT TRUE,                  -- 2 h avant, SMS
  remind_report BOOLEAN NOT NULL DEFAULT TRUE,              -- compte rendu à remettre après la visite
  remind_photo BOOLEAN NOT NULL DEFAULT TRUE,               -- demande de photo au contrôle
  remind_missed BOOLEAN NOT NULL DEFAULT FALSE,             -- relance après un rendez-vous manqué
  price_cabinet_fcfa INTEGER,
  price_control_fcfa INTEGER,
  photo_consent_required BOOLEAN NOT NULL DEFAULT TRUE,
  dhis2_aggregate BOOLEAN NOT NULL DEFAULT FALSE,
  glow_preanalysis BOOLEAN NOT NULL DEFAULT TRUE,
  retention_20y BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE secretary_accounts ADD COLUMN IF NOT EXISTS role_label VARCHAR(20) NOT NULL DEFAULT 'Secrétaire';
ALTER TABLE secretary_accounts ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS missed_relance_at TIMESTAMP;

ALTER TABLE derm_clinic_settings ENABLE ROW LEVEL SECURITY;
