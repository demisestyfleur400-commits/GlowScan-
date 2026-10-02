# GlowScan

Analyse de peau par IA pour les peaux africaines (appli patient) et portail GlowScan Derm pour les dermatologues.

## Ordre des migrations

Les migrations SQL de `migrations/` s'appliquent **à la main, avant le déploiement** du code qui en dépend. Le serveur ne modifie pas ces tables au démarrage. Toutes sont idempotentes : on peut les relancer sans risque.

Refonte Organic (étape 2), dans cet ordre : 0013 → 0014 → 0015 → 0016 → 0017 → 0018 → 0019 → 0020 → 0021 → 0022 → 0023 → 0024 → 0025 → 0026 → 0027 → 0028 → 0029 → 0030 → 0031 → 0032 → 0033 → 0034.

**État : 0013 à 0034 appliquées en production (projet Supabase `atjvlnzrwdeqhilvssyd`) le 30/09/2026**, après un essai complet dans une transaction annulée. Les relancer ne change rien (idempotentes).

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
| 9 | `0021_intake_reminders.sql` | Étape 4c — agenda : `appointments` (créée si absente) + `patient_record_id`, `created_by`, `confirmed_at` (réponse « 1 »), `reminder_j1_sent_at`, `report_reminder_sent_at`, RLS |
| 10 | `0022_relay_network.sql` | Étape 5 — `relay_cases`, `relay_progress`, `relay_links`, `programs`, `program_members`, `pro_accounts.relay_level`, urgence et avis structuré sur `peer_reviews`, RLS |
| 11 | `0023_programs_pilotage.sql` | Étape 6 — programmes : budget, email du bailleur, statut ; `program_managers` (comptes ONG), partage de progression des relais, `program_reports` (rapports envoyés), RLS |
| 12 | `0024_peer_network.sql` | Étape 8 — confrères : disponibilité, avis payant (niveau, prix, échéance, paiement, ID opérateur unique, instantané anonymisé, « premier disponible »), `peer_threads` / `peer_messages`, RLS |
| 13 | `0025_reports.sql` | Étape 9a — compte rendu en 3 versions : `consult_reports` (saisie unique signée), `prescriptions` (GS-ORD, vérifiable sur /verif), adresse, téléphone et spécialité du cabinet, RLS |
| 14 | `0026_teleexpertise_report.sql` | Étape 9b — avis relais au format 1b : diagnostics à écarter, conduite à tenir, orientation, délai de revue, qualité des photos, « Marquer comme lu » |
| 15 | `0027_relay_onboarding.sql` | Étape 10 — entrée des relais : `health_centers`, `relays` (carte, selfie, parrain, statut), `invitations` (SMS, lien, CSV ; 14 jours), `training_modules` / `training_attempts` (module photo 4/5), RLS |
| 16 | `0028_case_messages.sql` | Étape 11 — discussion par cas relais : `case_messages` (texte, photo, vocal transcrit, demande), lecture par côté, délai en pause, RLS |
| 17 | `0029_relay_credit_fx.sql` | Étape 12 — paiement relais sans ONG : `relay_credit_ledger` (crédit prépayé, recharge vérifiée par ID), `fx_rates`, taux figé (`fx_currency`, `fx_rate`) sur les cas et les grands livres, téléphone de la patiente (SMS de paiement), RLS |
| 18 | `0030_routing_licenses.sql` | Étape 13 — routage et réseau entre pays : `derm_licenses` (reprise : autorisation « home » vérifiée pour les dermatologues existants), langues et quota d'avis réseau, routage des cas (étape, prise en charge, historique, accord hors pays), RLS |
| 19 | `0031_programs_o1_o3.sql` | Étape 14a — programmes ONG : création par l'ONG (brouillon), districts, dermatologues choisis, maladies suivies, `program_budget_ledger` (budget prépayé, recharge validée par GlowScan, débit automatique des cas, clôture), alerte de solde bas, RLS |
| 20 | `0032_referrals_quality.sql` | Étape 14b — `hospitals`, `hospital_referrals` (fiche REF-XXXX, code à 6 chiffres, arrivée et compte rendu de l'hôpital, relances J+7 / J+10 ; « referrals » sert déjà au parrainage B2C), `quality_reviews` (1 avis de programme sur 10), RLS |
| 21 | `0033_dhis2.sql` | Étape 15 — export DHIS2 : `dhis2_connections` (jeton chiffré, variable Railway `DHIS2_TOKEN_KEY` requise), `dhis2_mappings`, `dhis2_exports` (essai, envoi, fichier), RLS |
| 22 | `0034_partner_api.sql` | Étape 16 — Bogou et API ouverte : `api_partners` (« partners » sert déjà à la boutique), clés hachées, `partner_access_log`, `webhook_deliveries`, cas `source` / `external_ref` / `partner_id`, export Bogou (`bogou_shared_at`, `programs.bogou_email`), RLS |

Commande (base Postgres / Supabase, variable `DATABASE_URL` ou `SUPABASE_URL`) :

```bash
for f in 0013_consents 0014_product_scans 0015_orders_followups 0016_consultation_refunds 0017_wallets 0018_rls_runtime_tables 0019_pro_profile 0020_sign_pin 0021_intake_reminders 0022_relay_network 0023_programs_pilotage 0024_peer_network 0025_reports 0026_teleexpertise_report 0027_relay_onboarding 0028_case_messages 0029_relay_credit_fx 0030_routing_licenses 0031_programs_o1_o3 0032_referrals_quality 0033_dhis2 0034_partner_api; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "migrations/$f.sql" || break
done
```

Sans `psql`, on peut coller le contenu de chaque fichier, dans le même ordre, dans l'éditeur SQL de Supabase.

Si la migration 0015 n'est pas appliquée, les routes de commande répondent `503 « Service commande en maintenance »` et le serveur écrit un log `[orders] Migration 0015 non appliquée …`. Rien ne plante.

Sans la migration 0017, aucune consultation ne peut être confirmée comme payée : le registre refuse d'écrire, le serveur répond « Registre des paiements indisponible (migration 0017) » et rien n'est crédité. Les consultations payées avant 0017 ne sont pas reprises dans le registre (elles ont pu être versées à la main).
