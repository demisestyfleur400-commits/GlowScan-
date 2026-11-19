-- 0040 · Photos prises au dermatoscope, rangées à part des photos cliniques
-- (face / profils restent dans image_url + extra_images).
-- Elles ne sont jamais envoyées à l'analyse IA photo : le médecin les retrouve au
-- dossier, au suivi et en télé-expertise. Colonne facultative, sans valeur par défaut.
ALTER TABLE scans ADD COLUMN IF NOT EXISTS dermo_images jsonb;
COMMENT ON COLUMN scans.dermo_images IS 'Chemins /objects/scans/… des photos au dermatoscope (DERM), max 2';
