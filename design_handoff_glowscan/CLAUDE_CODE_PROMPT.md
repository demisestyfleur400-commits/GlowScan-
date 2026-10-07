# À coller dans Claude Code (à la racine du repo GlowScan-)

Copie d'abord le dossier `design_handoff_glowscan/` à la racine du repo, puis colle ce message :

---

Tu es l'ingénieur principal de GlowScan. Le dossier `design_handoff_glowscan/` contient la refonte complète validée par le fondateur : des maquettes HTML haute fidélité et un README qui détaille les règles métier.

Objectif : **modifier l'application existante pour qu'elle soit identique à ces maquettes**, dans la stack actuelle (React 18 + Vite + TS, Tailwind + shadcn, wouter, TanStack Query, Express, Drizzle/Postgres, WhatsApp, cron). Ne copie pas le HTML : recrée-le avec les conventions du repo.

Méthode :
1. Lis en entier `design_handoff_glowscan/README.md`, puis `shared/schema.ts`, `client/src/App.tsx` (les routes), `server/routes.ts`, `server/proRoutes.ts`, `server/cron.ts` et `server/whatsapp.ts`.
2. Pour chaque écran, ouvre la maquette `.dc.html` correspondante. Lis la classe `Component` en bas du fichier : elle contient les textes, les données et les règles exactes. Reprends les libellés **mot pour mot**.
3. Suis le plan de la section 6 du README, **une étape à la fois**. Avant chaque étape, montre-moi la liste des fichiers que tu vas créer, modifier ou supprimer, et attends mon OK.
4. Réutilise les tables et routes existantes avant d'en créer. Chaque nouvelle table passe par une migration SQL numérotée dans `migrations/` et le schéma Drizzle.
5. Règles à ne jamais casser :
   - sous 60 et en urgent, aucun produit n'est proposé ;
   - la mention « analyse indicative » reste visible ;
   - aucune métrique inventée ;
   - séquestre et remboursement à 24 h ;
   - répartitions 80/20 et 60/20/20 dans une seule constante ;
   - aucun crédit sans ID de transaction opérateur vérifié ;
   - la routine prescrite reste gratuite ;
   - aucun émoji dans les messages envoyés aux patients.
6. Ne touche pas à `Challenge.tsx`, à `decks/`, ni à la démo investisseur.
7. À la fin de chaque étape, lance `npm run check`, corrige les erreurs, puis résume ce qui a changé et ce qui reste.

Commence par l'étape 1 (tokens du design system Organic).
