-- Suivi évolution : photos de contrôle rattachées à un scan (J0 = scans.image_url).
-- Chaque entrée : { date, photoUrl, aiComparison, evolutionScore, note }
-- Colonne HORS schéma Drizzle (lue/écrite en SQL brut, pattern résilient).
ALTER TABLE scans ADD COLUMN IF NOT EXISTS follow_up_photos JSONB DEFAULT '[]'::jsonb;
