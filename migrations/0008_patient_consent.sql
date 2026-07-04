-- Consentement PATIENT (distinct du consentement dermatologue).
-- Rend le dataset légalement utilisable : le patient consent aux soins ET,
-- séparément, à la réutilisation anonymisée de ses données (recherche / amélioration IA).
-- Idempotent : sûr à relancer.

ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_care BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_research BOOLEAN DEFAULT FALSE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_version VARCHAR(20);
ALTER TABLE patients ADD COLUMN IF NOT EXISTS consent_signed_at TIMESTAMP;
