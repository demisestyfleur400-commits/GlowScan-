-- Étape 11 — Discussion dermatologue ↔ relais par cas (ADDENDUM_reseau_relais_ong.md §2,
-- écran R5). Idempotent. Un fil par cas relais : texte, photo, vocal (transcrit
-- automatiquement), demande structurée (délai en pause tant qu'elle est ouverte).
-- SMS de secours après 15 min sans lecture ; réponse par SMS avec le code #B-<id>.
-- Le fil reste ouvert 7 jours après l'avis, puis passe en lecture seule.

CREATE TABLE IF NOT EXISTS case_messages (
  id SERIAL PRIMARY KEY,
  case_id INTEGER NOT NULL REFERENCES relay_cases(id) ON DELETE CASCADE,
  author_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  author_role VARCHAR(10) NOT NULL,          -- derm | relay | system
  kind VARCHAR(10) NOT NULL,                 -- text | photo | voice | system | request
  body TEXT,
  media_url TEXT,                            -- privé : servi par /api/case-media/:id
  media_type VARCHAR(40),
  duration_s SMALLINT,
  transcript TEXT,                           -- « transcription automatique »
  via_sms BOOLEAN NOT NULL DEFAULT FALSE,    -- reçu par SMS
  sms_delivered_at TIMESTAMP,                -- renvoyé par SMS au relais
  resolved_at TIMESTAMP,                     -- demande fermée
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS case_messages_case_idx ON case_messages (case_id, created_at);

ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS relay_seen_at TIMESTAMP;
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS derm_seen_at TIMESTAMP;
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS paused_at TIMESTAMP;     -- demande ouverte : délai en pause

ALTER TABLE case_messages ENABLE ROW LEVEL SECURITY;
