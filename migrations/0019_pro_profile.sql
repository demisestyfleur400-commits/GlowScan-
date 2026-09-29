-- Étape 4a — Profil choisi à l'inscription GlowScan Derm (README §4, point 13).
-- Idempotent : sûr à relancer.
--
-- derm  = dermatologue (portail cabinet, abonnement 10 000 FCFA / mois)
-- relay = relais de terrain (infirmier / médecin d'un CSI) — espace ouvert à l'étape 5
-- ngo   = ONG / programme — suivi du programme ouvert à l'étape 6
-- Les comptes existants sont tous des dermatologues : valeur par défaut « derm ».

ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS profile VARCHAR(10) NOT NULL DEFAULT 'derm';

DO $$ BEGIN
  ALTER TABLE pro_accounts ADD CONSTRAINT pro_accounts_profile_chk CHECK (profile IN ('derm', 'relay', 'ngo'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
