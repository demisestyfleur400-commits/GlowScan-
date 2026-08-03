-- ============================================================================
-- BACKFILL Chantier n°1 — labels démographiques du dataset (training_data)
-- ----------------------------------------------------------------------------
-- À exécuter UNE FOIS dans Supabase (SQL Editor). Idempotent : ne touche que
-- les lignes dont le champ est encore NULL, donc ré-exécutable sans risque.
--
-- Récupérable pour les anciennes lignes :
--   • skin_phototype  ← annotation->>'phototype'  (phototype estimé par l'IA,
--                        déjà calculé et stocké à l'insertion d'origine)
--   • body_area       ← scans.area                (zone anatomique du scan lié)
--
-- NON récupérable (jamais persisté avant le chantier n°1) :
--   • age_range, country, patient_sex → restent NULL sur l'ancien.
--     Seuls les NOUVEAUX scans (post-déploiement) les auront.
-- ============================================================================

-- ── 0. État AVANT (diagnostic) ──────────────────────────────────────────────
SELECT
  COUNT(*)                                             AS total,
  COUNT(*) FILTER (WHERE skin_phototype IS NULL)       AS phototype_null,
  COUNT(*) FILTER (WHERE body_area IS NULL)            AS body_area_null,
  COUNT(*) FILTER (WHERE age_range IS NULL)            AS age_range_null,
  COUNT(*) FILTER (WHERE country IS NULL)              AS country_null,
  COUNT(*) FILTER (WHERE patient_sex IS NULL)          AS patient_sex_null
FROM training_data;

-- ── 1. Phototype depuis l'annotation IA déjà stockée ────────────────────────
UPDATE training_data
SET    skin_phototype = LEFT(NULLIF(annotation->>'phototype', ''), 10)
WHERE  skin_phototype IS NULL
  AND  annotation ? 'phototype'
  AND  NULLIF(annotation->>'phototype', '') IS NOT NULL;

-- ── 2. Zone anatomique depuis le scan lié ───────────────────────────────────
UPDATE training_data t
SET    body_area = s.area
FROM   scans s
WHERE  t.scan_id = s.id
  AND  t.body_area IS NULL
  AND  s.area IS NOT NULL;

-- ── 3. État APRÈS (vérification) ────────────────────────────────────────────
SELECT
  COUNT(*)                                             AS total,
  COUNT(*) FILTER (WHERE skin_phototype IS NOT NULL)   AS phototype_ok,
  COUNT(*) FILTER (WHERE body_area IS NOT NULL)        AS body_area_ok,
  COUNT(*) FILTER (WHERE age_range IS NOT NULL)        AS age_range_ok
FROM training_data;

-- ── 4. (Optionnel) répartition par phototype pour piloter le moat "peau noire"
SELECT COALESCE(skin_phototype, '∅ inconnu') AS phototype, COUNT(*) AS n
FROM   training_data
GROUP  BY 1
ORDER  BY n DESC;
