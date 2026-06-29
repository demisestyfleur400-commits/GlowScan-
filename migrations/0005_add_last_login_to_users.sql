-- Migration 0005 : last_login pour le monitoring d'activité des dermatologues
-- ─────────────────────────────────────────────────────────────────────────────
-- Alimente la colonne lue par le dashboard admin "Activité dermatologues"
-- (détection "Jamais connecté" / "Inactif"). Écrite en SQL brut côté serveur à
-- chaque connexion, donc PAS ajoutée au schéma Drizzle (aucune lecture cassée si
-- la colonne manque — elle reste simplement NULL en attendant cette migration).
--
-- À exécuter dans Supabase (SQL Editor). Sans danger, idempotent.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login" timestamp;
