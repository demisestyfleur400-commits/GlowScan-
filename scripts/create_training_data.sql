-- ============================================================================
-- CRÉATION de la table training_data (dataset ML) — à exécuter dans Supabase.
-- La table n'existait pas en prod → la capture dataset échouait en silence.
-- Idempotent : CREATE TABLE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_data (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scan_id                  INTEGER REFERENCES scans(id),

  mode                     VARCHAR(10),
  source                   VARCHAR(30),
  prompt_version           VARCHAR(30),

  image_hash               VARCHAR(64),
  image_encrypted          TEXT,

  image_quality            VARCHAR(20),
  image_artifacts          JSONB,

  skin_phototype           VARCHAR(10),
  skin_state               VARCHAR(30),

  body_area                VARCHAR(30),

  patient_sex              VARCHAR(10),
  age_range                VARCHAR(20),
  country                  VARCHAR(50),

  lesion_types             JSONB,
  primary_condition        VARCHAR(60),
  secondary_condition      VARCHAR(60),

  inflammation_level       VARCHAR(15),
  severity                 VARCHAR(15),
  confidence               VARCHAR(10),

  visual_pitfalls          JSONB,

  skin_barrier_status      VARCHAR(25),
  sebum_level              VARCHAR(15),
  dryness_level            VARCHAR(15),
  pigmentation_level       VARCHAR(15),

  visible_signs            JSONB,
  balance                  JSONB,
  red_flags                JSONB,

  details                  TEXT,
  motivation               TEXT,
  zones_b2c                JSONB,
  recommendations          JSONB,
  morning_protocol         JSONB,
  evening_protocol         JSONB,
  weekly_protocol          TEXT,
  when_to_see_dermatologist TEXT,
  b2c_output               JSONB,

  visible_factors          JSONB,
  differential_diagnosis   JSONB,
  recommendation_classes   JSONB,

  ai_diagnosis             JSONB,
  ai_model_version         VARCHAR(50),
  ai_confidence            DECIMAL(3,2),

  score                    INTEGER,
  clinical_summary         TEXT,
  zones_analysis           JSONB,
  antecedents_integration  TEXT,
  toxic_ingredients        JSONB,
  clinical_protocol        JSONB,
  logistics                TEXT,
  prognostic               TEXT,
  contraindications        JSONB,
  b2b_output               JSONB,

  ground_truth             JSONB,
  annotation               JSONB,
  clinical_annotation      JSONB,

  derm_validation_status   VARCHAR(20) DEFAULT 'pending',
  dermatologist_label      JSONB,
  validated_by             VARCHAR(100),
  validated_at             TIMESTAMP,
  override_reason          TEXT,

  final_status             VARCHAR(20) DEFAULT 'pending',
  training_weight          INTEGER DEFAULT 1,

  is_anonymized            BOOLEAN DEFAULT TRUE,
  exported_to_dataset      BOOLEAN DEFAULT FALSE,
  exported_at              TIMESTAMP,
  gdpr_consent             BOOLEAN DEFAULT TRUE,

  created_at               TIMESTAMP DEFAULT NOW()
);

-- Index utiles pour l'export / les stats dataset.
CREATE INDEX IF NOT EXISTS idx_training_scan_id  ON training_data(scan_id);
CREATE INDEX IF NOT EXISTS idx_training_status    ON training_data(derm_validation_status);
CREATE INDEX IF NOT EXISTS idx_training_phototype ON training_data(skin_phototype);

-- Vérification
SELECT COUNT(*) AS rows_training_data FROM training_data;
