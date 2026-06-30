-- Migration 0007 : dossier clinique structuré (démarche médicale) sur le patient
-- ─────────────────────────────────────────────────────────────────────────────
-- Stocke toute l'observation médicale structurée (Identification / Motif / HMA /
-- Antécédents…) en un seul JSON, au lieu de dizaines de colonnes.
-- Écrit en SQL brut côté serveur → PAS ajouté au schéma Drizzle : aucune lecture
-- cassée si la colonne manque (reste NULL en attendant cette migration).
--
-- À exécuter dans Supabase (SQL Editor). Sans danger, idempotent.

ALTER TABLE "patients" ADD COLUMN IF NOT EXISTS "clinical_record" jsonb;
