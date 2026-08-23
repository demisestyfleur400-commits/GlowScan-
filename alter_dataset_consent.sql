-- Consentement DATASET séparé (RGPD) — distinct du consentement d'usage.
-- L'export dataset ne retiendra que les scans dont le propriétaire a consenti.
ALTER TABLE users ADD COLUMN IF NOT EXISTS dataset_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dataset_consent_at TIMESTAMP;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dataset_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS dataset_consent_at TIMESTAMP;
