-- Étape 9b — Avis de télé-expertise au format 1b (maquette « Derm Compte Rendu »,
-- norme BAD 2024) : réponse à la question d'abord, diagnostic retenu et à
-- écarter, conduite à tenir, orientation, délai de revue, qualité des photos et
-- leçon du cas. Idempotent. Les avis entre confrères gardent ces champs dans
-- peer_messages.structured (JSONB, aucune colonne à ajouter).

ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS derm_ddx TEXT;                 -- diagnostics à écarter
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS derm_plan TEXT;                -- conduite à tenir (une étape par ligne)
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS orientation TEXT;              -- « Pas besoin d'adresser », « Adresser en urgence »…
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS review_in VARCHAR(40);         -- « 4 semaines »
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS photo_quality VARCHAR(12);     -- bonne | moyenne | insuffisante
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS photos_sharp SMALLINT;         -- nombre de photos nettes
ALTER TABLE relay_cases ADD COLUMN IF NOT EXISTS relay_read_at TIMESTAMP;       -- « Marquer comme lu »
