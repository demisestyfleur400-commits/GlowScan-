-- Scans produit (refonte Organic) : historique et quota gratuit de 3 scans par
-- semaine glissante (illimité en Premium). Idempotent : sûr à relancer.

CREATE TABLE IF NOT EXISTS product_scans (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name TEXT,
  verdict VARCHAR(20) NOT NULL,          -- compatible | avoid
  flagged JSONB NOT NULL DEFAULT '[]',   -- ingrédients dangereux détectés (hydroquinone, corticoïde, mercure)
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_scans_user_created_idx ON product_scans (user_id, created_at DESC);
