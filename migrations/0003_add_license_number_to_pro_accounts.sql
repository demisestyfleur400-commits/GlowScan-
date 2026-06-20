-- Migration 0003 : Numéro d'ordre professionnel (ONMC) pour les comptes dermatologues
-- ─────────────────────────────────────────────────────────────────────────────
-- Contexte : le formulaire d'inscription DERM collecte déjà un "Numéro d'ordre
-- (ONMC)" (cf. P3-16). Pour l'instant il est seulement loggé côté serveur.
-- Cette migration ajoute la colonne pour le PERSISTER.
--
-- ⚠️ ORDRE D'EXÉCUTION OBLIGATOIRE :
--   1. Exécuter ce SQL dans Supabase (SQL Editor) AVANT de déployer le code qui
--      référence cette colonne. Tant que la colonne n'existe pas, ne pas activer
--      le câblage (db.select sélectionne toutes les colonnes du schéma Drizzle).
--   2. Prévenir pour que le champ soit ajouté au schéma + à l'INSERT de register.

ALTER TABLE "pro_accounts" ADD COLUMN IF NOT EXISTS "license_number" varchar;

-- (optionnel) Index si on veut rechercher/filtrer par numéro d'ordre plus tard :
-- CREATE INDEX IF NOT EXISTS "IDX_pro_accounts_license" ON "pro_accounts"("license_number");
