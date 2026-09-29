-- Consentements patient séparés (refonte Organic, README §5) + journal d'accès au dossier.
-- Idempotent : sûr à relancer.
--
-- consents : une ligne par compte (user_id) ou, pour un patient sans compte, par
-- numéro WhatsApp (phone, format 2376XXXXXXXX). « care » (partage avec les médecins)
-- est toujours vrai. « reminders » = accepte d'être recontacté sur WhatsApp ; il
-- repasse à false quand le patient répond STOP (stopped_at renseigné).

CREATE TABLE IF NOT EXISTS consents (
  id SERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT,
  care BOOLEAN NOT NULL DEFAULT TRUE,
  research BOOLEAN,
  reminders BOOLEAN NOT NULL DEFAULT FALSE,
  stopped_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS consents_user_uidx ON consents (user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS consents_phone_anon_uidx ON consents (phone) WHERE user_id IS NULL AND phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS consents_phone_idx ON consents (phone);

-- Journal « Qui a consulté mon dossier » (affiché dans le Profil).
CREATE TABLE IF NOT EXISTS record_access_log (
  id SERIAL PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  viewer_id TEXT NOT NULL,
  viewer_role VARCHAR(20) NOT NULL,
  at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS record_access_log_patient_idx ON record_access_log (patient_id, at DESC);

-- Sécurité par ligne activée, sans règle : aucun accès via les clés publiques
-- (anon / authenticated) de Supabase ; le serveur y accède avec son rôle propriétaire,
-- comme pour les autres tables de l'application.
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE record_access_log ENABLE ROW LEVEL SECURITY;
