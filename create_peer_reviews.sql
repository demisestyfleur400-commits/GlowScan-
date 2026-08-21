-- Second avis entre confrères (réseau clinique DERM).
-- Un dermato envoie un cas ANONYMISÉ (photo + âge/sexe + question, jamais de nom)
-- à un confrère précis ou à tout le réseau. Les confrères répondent en fil.
CREATE TABLE IF NOT EXISTS peer_reviews (
  id SERIAL PRIMARY KEY,
  requester_account_id INTEGER NOT NULL,
  target_account_id INTEGER,                 -- NULL = ouvert à tout le réseau
  scan_id INTEGER,                           -- cas source (optionnel)
  image_url TEXT,                            -- photo anonymisée
  condition TEXT,                            -- diagnostic présumé
  age_sex TEXT,                              -- ex "F · 34 ans" (aucun nom/téléphone)
  question TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',       -- open | answered | closed
  reply_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS peer_review_replies (
  id SERIAL PRIMARY KEY,
  review_id INTEGER NOT NULL,
  account_id INTEGER NOT NULL,
  author_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_peer_reviews_status ON peer_reviews(status);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_requester ON peer_reviews(requester_account_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_target ON peer_reviews(target_account_id);
CREATE INDEX IF NOT EXISTS idx_peer_review_replies_review ON peer_review_replies(review_id);
