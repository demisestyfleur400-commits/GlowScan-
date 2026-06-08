-- ═══════════════════════════════════════════════════════════════════
-- Migration 0001 — training_data : ajout des 22 labels cliniques
-- GlowScan Dataset — peaux africaines Fitzpatrick IV-VI
-- ═══════════════════════════════════════════════════════════════════

-- Crée la table si elle n'existe pas encore
CREATE TABLE IF NOT EXISTS training_data (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  scan_id INTEGER REFERENCES scans(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- ── Source & mode ────────────────────────────────────────────────
ALTER TABLE training_data
  ADD COLUMN IF NOT EXISTS mode VARCHAR(10),                    -- 'B2C' | 'B2B'
  ADD COLUMN IF NOT EXISTS source VARCHAR(30),                  -- 'user_upload' | 'dermatologist_review' | 'clinical_partner'
  ADD COLUMN IF NOT EXISTS prompt_version VARCHAR(30),          -- ex: 'b2c-v3' | 'b2b-v2'

-- ── Image ────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS image_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS image_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS image_quality VARCHAR(20),           -- 'insufficient' | 'acceptable' | 'good'
  ADD COLUMN IF NOT EXISTS image_artifacts JSONB,               -- ImageArtifact[]

-- ── Peau ─────────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS skin_phototype VARCHAR(10),          -- 'IV' | 'V' | 'VI' | 'unknown'
  ADD COLUMN IF NOT EXISTS skin_state VARCHAR(30),              -- 'oily' | 'dry' | 'combination' | ...
  ADD COLUMN IF NOT EXISTS body_area VARCHAR(30),               -- 'face' | 'zone_t' | 'forehead' | ...

-- ── Patient ──────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS patient_sex VARCHAR(10),             -- 'female' | 'male' | 'other' | 'unknown'
  ADD COLUMN IF NOT EXISTS age_range VARCHAR(20),               -- ex: '21-30'
  ADD COLUMN IF NOT EXISTS country VARCHAR(50),

-- ── Diagnostic IA brut ───────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS ai_diagnosis JSONB,
  ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2),

-- ── Labels lésions & conditions ─────────────────────────────────
  ADD COLUMN IF NOT EXISTS lesion_types JSONB,                  -- LesionType[]
  ADD COLUMN IF NOT EXISTS primary_condition VARCHAR(60),       -- PrimaryCondition
  ADD COLUMN IF NOT EXISTS secondary_condition VARCHAR(60),     -- SecondaryCondition
  ADD COLUMN IF NOT EXISTS visible_signs JSONB,                 -- string[] — observations libres

-- ── Labels niveaux cliniques ─────────────────────────────────────
  ADD COLUMN IF NOT EXISTS inflammation_level VARCHAR(15),      -- 'none' | 'low' | 'moderate' | 'high'
  ADD COLUMN IF NOT EXISTS severity VARCHAR(15),                -- 'mild' | 'moderate' | 'severe' | 'critical'
  ADD COLUMN IF NOT EXISTS confidence VARCHAR(10),              -- 'low' | 'medium' | 'high'

-- ── Pièges visuels ───────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS visual_pitfalls JSONB,               -- VisualPitfall[]

-- ── État cutané ──────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS skin_barrier_status VARCHAR(25),     -- 'intact' | 'mildly_compromised' | 'compromised'
  ADD COLUMN IF NOT EXISTS sebum_level VARCHAR(15),             -- 'low' | 'moderate' | 'high'
  ADD COLUMN IF NOT EXISTS dryness_level VARCHAR(15),           -- 'low' | 'moderate' | 'high'
  ADD COLUMN IF NOT EXISTS pigmentation_level VARCHAR(15),      -- 'none' | 'mild' | 'moderate' | 'high'

-- ── Balance métriques (B2C GlowScore) ───────────────────────────
  ADD COLUMN IF NOT EXISTS balance JSONB,                       -- { hydration, sebum, sensitivity, uniformity, elasticity, radiance }

-- ── Alertes ──────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS red_flags JSONB,                     -- string[]

-- ── Facteurs & différentiels ─────────────────────────────────────
  ADD COLUMN IF NOT EXISTS visible_factors JSONB,               -- VisibleFactor[]
  ADD COLUMN IF NOT EXISTS differential_diagnosis JSONB,        -- DifferentialDiagnosis[]
  ADD COLUMN IF NOT EXISTS recommendation_classes JSONB,        -- RecommendationClass[]

-- ── Champs B2B (GlowScanB2B) ─────────────────────────────────────
  ADD COLUMN IF NOT EXISTS score INTEGER,                             -- GlowScore 0-100
  ADD COLUMN IF NOT EXISTS clinical_summary TEXT,                     -- 4-5 phrases cliniques
  ADD COLUMN IF NOT EXISTS zones_analysis JSONB,                      -- ZoneAnalysisItem[]
  ADD COLUMN IF NOT EXISTS antecedents_integration TEXT,              -- lien antécédents → diagnostic
  ADD COLUMN IF NOT EXISTS toxic_ingredients JSONB,                   -- ToxicIngredient[]
  ADD COLUMN IF NOT EXISTS clinical_protocol JSONB,                   -- ClinicalProtocol complet
  ADD COLUMN IF NOT EXISTS logistics TEXT,                            -- null si Douala/Yaoundé
  ADD COLUMN IF NOT EXISTS prognostic TEXT,                           -- évolution semaine par semaine
  ADD COLUMN IF NOT EXISTS contraindications JSONB,                   -- string[]
  ADD COLUMN IF NOT EXISTS b2b_output JSONB,                          -- sortie B2B complète archivée

-- ── Vérité terrain & annotations ────────────────────────────────
  ADD COLUMN IF NOT EXISTS ground_truth JSONB,
  ADD COLUMN IF NOT EXISTS annotation JSONB,                    -- GlowScanAnnotation complète
  ADD COLUMN IF NOT EXISTS clinical_annotation JSONB,           -- ClinicalAnnotation (B2B)

-- ── Validation dermatologue ──────────────────────────────────────
  ADD COLUMN IF NOT EXISTS derm_validation_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS dermatologist_label JSONB,           -- DermatologistLabel
  ADD COLUMN IF NOT EXISTS validated_by VARCHAR(100),           -- 'ai_only' | 'doctor_[id]'
  ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS override_reason TEXT,

-- ── Pipeline ─────────────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS final_status VARCHAR(20) DEFAULT 'pending',

-- ── Poids d'entraînement ─────────────────────────────────────────
  -- 0=rejeté 1=auto 2=validé dermato 3=corrigé dermato
  ADD COLUMN IF NOT EXISTS training_weight INTEGER DEFAULT 1,

-- ── Sécurité & export ────────────────────────────────────────────
  ADD COLUMN IF NOT EXISTS is_anonymized BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS exported_to_dataset BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS exported_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS gdpr_consent BOOLEAN DEFAULT true;

-- ── Index pour les requêtes fréquentes ───────────────────────────
CREATE INDEX IF NOT EXISTS idx_training_mode
  ON training_data(mode);

CREATE INDEX IF NOT EXISTS idx_training_primary_condition
  ON training_data(primary_condition);

CREATE INDEX IF NOT EXISTS idx_training_skin_phototype
  ON training_data(skin_phototype);

CREATE INDEX IF NOT EXISTS idx_training_derm_validation
  ON training_data(derm_validation_status);

CREATE INDEX IF NOT EXISTS idx_training_final_status
  ON training_data(final_status);

CREATE INDEX IF NOT EXISTS idx_training_training_weight
  ON training_data(training_weight);

CREATE INDEX IF NOT EXISTS idx_training_scan_id
  ON training_data(scan_id);

-- ── Commentaires sur les colonnes stratégiques ───────────────────
COMMENT ON COLUMN training_data.training_weight IS
  '0=rejeté 1=auto(IA seule) 2=validé dermato 3=corrigé dermato';

COMMENT ON COLUMN training_data.derm_validation_status IS
  'pending | validated | corrected | rejected | needs_review';

COMMENT ON COLUMN training_data.annotation IS
  'GlowScanAnnotation complète — tous les 22 labels structurés';

COMMENT ON COLUMN training_data.skin_phototype IS
  'IV | V | VI | unknown — Echelle Fitzpatrick peaux africaines';

COMMENT ON COLUMN training_data.visual_pitfalls IS
  'Pièges visuels détectés — crucial pour peaux Fitzpatrick IV-VI';
