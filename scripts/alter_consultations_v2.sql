-- ============================================================================
-- Consultations v2 — commission, payout, notation, clôture.
-- À exécuter dans Supabase (SQL Editor). Idempotent (IF NOT EXISTS).
-- Le code lit/écrit ces colonnes en SQL brut → fonctionne avant ET après.
-- ============================================================================

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS platform_commission  INTEGER;   -- 20% (ex: 400)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS dermatologue_payout  INTEGER;   -- reste (ex: 1600)
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS payout_status        VARCHAR(20) DEFAULT 'pending'; -- pending | paid
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS rating               INTEGER;   -- 1..5
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS rating_comment       TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS rated_at             TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS closed_at            TIMESTAMP;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS flagged_review       BOOLEAN DEFAULT FALSE; -- note <=2 → review admin

-- Backfill commission/payout des consultations déjà payées (20% plateforme).
UPDATE consultations
SET    platform_commission = ROUND(COALESCE(price_fcfa,0) * 0.20),
       dermatologue_payout = COALESCE(price_fcfa,0) - ROUND(COALESCE(price_fcfa,0) * 0.20)
WHERE  platform_commission IS NULL AND COALESCE(price_fcfa,0) > 0;

SELECT COUNT(*) AS total,
       COUNT(rating) AS notees,
       COUNT(*) FILTER (WHERE flagged_review) AS a_revoir
FROM consultations;
