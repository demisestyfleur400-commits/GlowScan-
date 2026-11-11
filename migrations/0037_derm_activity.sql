-- Espace médical D6 — Votre activité et Auto-évaluation (handoff §3.7, §3.8). Idempotent.
--  · derm_weekly_reviews : bilan hebdomadaire du médecin (3 échelles 1–5, ce qui a
--    bien marché, objectif, retours par patient), privé.
--  · derm_research_docs : atelier « Recherche & mémoires » (titre, sections,
--    bibliothèque de références), un document par médecin.
--  · derm_patient_feedback : avis des patients du cabinet, recueillis par un lien
--    WhatsApp (note 1–5 + commentaire), anonymisés à l'affichage.

CREATE TABLE IF NOT EXISTS derm_weekly_reviews (
  id SERIAL PRIMARY KEY,
  pro_account_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,                      -- lundi de la semaine
  scores SMALLINT[] NOT NULL DEFAULT '{}',       -- confiance clinique, qualité du suivi, clarté des conseils
  good TEXT,
  goal TEXT,
  retours JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{ patientId, evolution, obs }]
  done_at TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (pro_account_id, week_start)
);

CREATE TABLE IF NOT EXISTS derm_research_docs (
  id SERIAL PRIMARY KEY,
  pro_account_id INTEGER NOT NULL UNIQUE REFERENCES pro_accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{ t, b }]
  library JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{ id, title, meta, url }]
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS derm_patient_feedback (
  id SERIAL PRIMARY KEY,
  pro_account_id INTEGER NOT NULL REFERENCES pro_accounts(id) ON DELETE CASCADE,
  patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
  token VARCHAR(40) NOT NULL UNIQUE,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  sent_at TIMESTAMP,
  answered_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS derm_patient_feedback_pro_idx ON derm_patient_feedback (pro_account_id, created_at DESC);

ALTER TABLE derm_weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE derm_research_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE derm_patient_feedback ENABLE ROW LEVEL SECURITY;
