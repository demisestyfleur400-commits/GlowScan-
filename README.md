# GlowScan

Analyse de peau par IA pour les peaux africaines (appli patient) et portail GlowScan Derm pour les dermatologues.

## Ordre des migrations

Les migrations SQL de `migrations/` s'appliquent **à la main, avant le déploiement** du code qui en dépend. Le serveur ne modifie pas ces tables au démarrage. Toutes sont idempotentes : on peut les relancer sans risque.

Refonte Organic (étape 2), dans cet ordre :

| Ordre | Fichier | Contenu |
|---|---|---|
| 1 | `0013_consents.sql` | Tables `consents` (consentements séparés, WhatsApp, STOP) et `record_access_log` (« Qui a consulté mon dossier ») |
| 2 | `0014_product_scans.sql` | Table `product_scans` (quota de 3 scans produit gratuits par semaine) |
| 3 | `0015_orders_followups.sql` | Colonnes `followups` de `consents` (ARRÊT SUIVI), colonnes de commande de `orders` (total figé, livraison, paiement, capture), anciens statuts convertis (`envoyée` → `received`, `livrée` → `delivered`) |

Commande (base Postgres / Supabase, variable `DATABASE_URL` ou `SUPABASE_URL`) :

```bash
for f in 0013_consents 0014_product_scans 0015_orders_followups; do
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "migrations/$f.sql" || break
done
```

Sans `psql`, on peut coller le contenu de chaque fichier, dans le même ordre, dans l'éditeur SQL de Supabase.

Si la migration 0015 n'est pas appliquée, les routes de commande répondent `503 « Service commande en maintenance »` et le serveur écrit un log `[orders] Migration 0015 non appliquée …`. Rien ne plante.
