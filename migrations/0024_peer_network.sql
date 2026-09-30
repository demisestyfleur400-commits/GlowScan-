-- Étape 8 — Confrères : messagerie entre dermatologues et avis payants sur cas
-- complexe (ADDENDUM_confreres_compte_rendu.md). Idempotent.
--
-- Avis simple 3 000 F (réponse sous 48 h), urgent 5 000 F (sous 24 h) ;
-- 80 % au confrère, 20 % à GlowScan (shared/splits.ts, SPLITS.peer).
-- Réservé sur le portefeuille du demandeur à l'envoi, débité à la réponse,
-- remboursé si le délai est dépassé. Portefeuille insuffisant : Mobile Money
-- (ID de transaction vérifié par GlowScan).

ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS peer_available BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE pro_accounts ADD COLUMN IF NOT EXISTS country VARCHAR(40);

-- Avis sur cas complexe : champs de l'avis payant et instantané anonymisé.
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS tier VARCHAR(10) NOT NULL DEFAULT 'simple';
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS price_fcfa INTEGER NOT NULL DEFAULT 0;
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS due_at TIMESTAMP;
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS answered_at TIMESTAMP;
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'none'; -- none | reserved | awaiting_momo | paid | refunded
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS operator_txn_id TEXT;
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS snapshot JSONB;           -- dossier anonymisé partagé
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS offered_to INTEGER[];     -- « premier disponible » : experts sollicités
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS offered_at TIMESTAMP;
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS accepted_by INTEGER REFERENCES pro_accounts(id);
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL; -- visible du demandeur seulement
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS integrated_at TIMESTAMP;  -- « Intégrer à mon compte rendu »
ALTER TABLE peer_reviews ADD COLUMN IF NOT EXISTS alert_sent_at TIMESTAMP;
CREATE UNIQUE INDEX IF NOT EXISTS peer_reviews_txn_uidx ON peer_reviews (operator_txn_id) WHERE operator_txn_id IS NOT NULL;

-- Conversations entre dermatologues : « Cas complexe » (lié à un avis) ou « Discussion ».
CREATE TABLE IF NOT EXISTS peer_threads (
  id SERIAL PRIMARY KEY,
  from_pro INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  to_pro INTEGER REFERENCES pro_accounts(id) ON DELETE CASCADE,  -- NULL tant qu'un « premier disponible » n'a pas accepté
  kind VARCHAR(10) NOT NULL CHECK (kind IN ('case', 'chat')),
  case_id INTEGER REFERENCES peer_reviews(id) ON DELETE CASCADE,
  unread_from INTEGER NOT NULL DEFAULT 0,
  unread_to INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS peer_threads_from_idx ON peer_threads (from_pro, last_message_at DESC);
CREATE INDEX IF NOT EXISTS peer_threads_to_idx ON peer_threads (to_pro, last_message_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS peer_threads_case_uidx ON peer_threads (case_id) WHERE case_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS peer_messages (
  id SERIAL PRIMARY KEY,
  thread_id INTEGER NOT NULL REFERENCES peer_threads(id) ON DELETE CASCADE,
  author_pro INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  kind VARCHAR(10) NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'avis', 'system')),
  body TEXT,
  structured JSONB,                                  -- avis structuré (réponse, diagnostic, à écarter, conduite)
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS peer_messages_thread_idx ON peer_messages (thread_id, created_at);

ALTER TABLE peer_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_messages ENABLE ROW LEVEL SECURITY;
