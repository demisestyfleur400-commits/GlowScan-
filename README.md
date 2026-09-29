# GlowScan

Analyse de peau par IA pour les peaux africaines (appli patient) et portail GlowScan Derm pour les dermatologues.

## Ordre des migrations

Les migrations SQL de `migrations/` s'appliquent **à la main, avant le déploiement** du code qui en dépend. Le serveur ne modifie pas ces tables au démarrage. Toutes sont idempotentes : on peut les relancer sans risque.

Refonte Organic (étape 2), dans cet ordre : 0013 → 0014 → 0015 → 0016 → 0017 → 0018 → 0019 → 0020.

**État : 0013 à 0020 appliquées en production (projet Supabase `atjvlnzrwdeqhilvssyd`) le 29/09/2026**, après un essai complet dans une transaction annulée. Les relancer ne change rien (idempotentes).

| Ordre | Fichier | Contenu |
|---|---|---|
| 1 | `0013_consents.sql` | Tables `consents` (consentements séparés, WhatsApp, STOP) et `record_access_log` (« Qui a consulté mon dossier ») |
| 2 | `0014_product_scans.sql` | Table `product_scans` (quota de 3 scans produit gratuits par semaine) |
| 3 | `0015_orders_followups.sql` | Colonnes `followups` de `consents` (ARRÊT SUIVI), colonnes de commande de `orders` (total figé, livraison, paiement, capture), anciens statuts convertis (`envoyée` → `received`, `livrée` → `delivered`) |
| 4 | `0016_consultation_refunds.sql` | Consultations : date de paiement, première réponse du médecin, décision de remboursement à 24 h, ID de transaction du remboursement, alerte 2 h |
| 5 | `0017_wallets.sql` | Étape 3 — registres `wallet_ledger` (médecins) et `platform_ledger` (GlowScan), `withdrawals`, `payout_accounts`, `wallet_settings` (virement du vendredi) |
| 6 | `0018_rls_runtime_tables.sql` | Sécurité par ligne sur `revenue_entries`, `appointments`, `follow_up_reminders`, `clinical_ai_exchanges`, `b2c_reminders` (alerte Supabase) |
| 7 | `0019_pro_profile.sql` | Étape 4a — colonne `pro_accounts.profile` (`derm` \| `relay` \| `ngo`), choisie à l'inscription, décide de la page d'arrivée |
| 8 | `0020_sign_pin.sql` | Étape 4b — code de signature à 4 chiffres du médecin (`pro_accounts.sign_pin_hash`, haché bcrypt, hors schéma Drizzle), `consultations.signed_at` |

Commande (base Postgres / Supabase, variable `DATABASE_URL` ou `SUPABASE_URL`) :

```bash
for f in 0013_consents 0014_product_scans 0015_orders_followups 0016_consultation_refunds 0017_wallets 0018_rls_runtime_tables 0019_pro_profile 0020_sign_pin; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "migrations/$f.sql" || break
done
```

Sans `psql`, on peut coller le contenu de chaque fichier, dans le même ordre, dans l'éditeur SQL de Supabase.

Si la migration 0015 n'est pas appliquée, les routes de commande répondent `503 « Service commande en maintenance »` et le serveur écrit un log `[orders] Migration 0015 non appliquée …`. Rien ne plante.

Sans la migration 0017, aucune consultation ne peut être confirmée comme payée : le registre refuse d'écrire, le serveur répond « Registre des paiements indisponible (migration 0017) » et rien n'est crédité. Les consultations payées avant 0017 ne sont pas reprises dans le registre (elles ont pu être versées à la main).
