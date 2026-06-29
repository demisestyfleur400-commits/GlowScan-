-- Migration 0006 : pays (country) pour les comptes dermatologues
-- ─────────────────────────────────────────────────────────────────────────────
-- Affiché dans le dashboard admin "Activité dermatologues" (ville + pays).
-- Écrit en SQL brut côté serveur (inscription + cabinet) → PAS ajouté au schéma
-- Drizzle : aucune lecture cassée si la colonne manque (reste NULL en attendant).
--
-- À exécuter dans Supabase (SQL Editor). Sans danger, idempotent.

ALTER TABLE "pro_accounts" ADD COLUMN IF NOT EXISTS "country" varchar;
