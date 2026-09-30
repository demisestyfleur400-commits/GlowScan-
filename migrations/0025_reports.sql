-- Étape 9a — Compte rendu en 3 versions et ordonnance aux normes ONMC
-- (ADDENDUM_confreres_compte_rendu.md, maquette « Derm Compte Rendu »). Idempotent.
--
-- Une seule saisie du médecin (payload JSONB) → version patient (1a), dossier du
-- cabinet (1c) et ordonnance (1d). L'ordonnance porte une référence vérifiable
-- publiquement sur /verif/:ref (médecin, date, statut ; aucune donnée de santé).

-- Mentions obligatoires de l'ordonnance (ONMC, juillet 2024) : le n° ONMC
-- existe déjà (license_number) ; on ajoute l'adresse et le téléphone du lieu de
-- consultation et la spécialité imprimée.
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS cabinet_address TEXT;
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS cabinet_phone TEXT;
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS specialty_title TEXT;

CREATE TABLE IF NOT EXISTS consult_reports (
  id SERIAL PRIMARY KEY,
  pro_account_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  source VARCHAR(20) NOT NULL,                                        -- consultation | visit
  consultation_id INTEGER REFERENCES consultations(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,                         -- la saisie unique du médecin
  signed_at TIMESTAMP,                                                -- code à 4 chiffres ; figé après
  sent_patient_at TIMESTAMP,
  viewed_by TEXT[] NOT NULL DEFAULT '{}',                             -- « Consulté par »
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS consult_reports_patient_idx ON consult_reports (patient_id);
-- Un seul compte rendu par consultation en ligne.
CREATE UNIQUE INDEX IF NOT EXISTS consult_reports_consult_uidx ON consult_reports (consultation_id) WHERE consultation_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS prescriptions (
  id SERIAL PRIMARY KEY,
  ref VARCHAR(20) NOT NULL UNIQUE,                                    -- GS-ORD-xxxxx (même numéro que le compte rendu)
  report_id INTEGER NOT NULL UNIQUE REFERENCES consult_reports(id) ON DELETE CASCADE,
  pro_account_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  status VARCHAR(10) NOT NULL DEFAULT 'valid',                        -- valid | revoked
  signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

ALTER TABLE consult_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
