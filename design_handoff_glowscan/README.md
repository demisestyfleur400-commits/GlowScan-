# Handoff : refonte GlowScan (B2C) + GlowScan Derm (portail pro, télé-expertise, réseau, ONG)

Repo cible : `demisestyfleur400-commits/GlowScan-` (branche `main`)
Stack existante : React 18 + Vite + TypeScript, Tailwind 3 + shadcn/ui (Radix), wouter (routing), TanStack Query, Express 5 (`server/routes.ts`, `server/proRoutes.ts`), Drizzle ORM + Postgres (`shared/schema.ts`, `migrations/`), WhatsApp (`server/whatsapp.ts`), emails (`server/email.ts`), cron (`server/cron.ts`), PDF (`@react-pdf/renderer`), icônes `lucide-react`.

---

## 1. À lire en premier

Les fichiers `.dc.html` de ce dossier sont des **maquettes de référence en HTML**. Ils montrent le rendu et le comportement attendus, mais **ce n'est pas du code de production à copier**. Il faut **recréer ces écrans dans le code existant** avec ses conventions : pages React dans `client/src/pages`, composants shadcn, Tailwind, wouter, TanStack Query, routes Express, tables Drizzle.

- Ouvrir chaque `.dc.html` dans un navigateur, depuis ce dossier (il faut `support.js` et `_ds/` à côté). Toutes les maquettes sont cliquables.
- Chaque maquette contient une classe `Component` (JS) avec les **données, règles et libellés exacts**. C'est la source de vérité pour les textes et les états.
- **Fidélité : haute (hifi).** Couleurs, typo, rayons, espacements et textes sont définitifs. Reproduire au pixel près.
- **Langue** : tout le produit est en français, tutoiement interdit, pas d'émojis dans l'UI ni dans les messages WhatsApp ou email envoyés aux patients.

---

## 2. Design system « Organic » (remplace le thème actuel)

Remplacer les tokens actuels (`tailwind.config.ts`, `client/src/index.css`, `glowscan_design_system_visual.html`) par ceux-ci. La source exacte est `_ds/organic-*/styles.css`.

### Polices
`@import url('https://fonts.googleapis.com/css2?family=Caprasimo:wght@400&family=Figtree:wght@400;600;700&display=swap');`
- Titres : **Caprasimo 400**, line-height 1.12, letter-spacing −0.015em.
- Texte et UI : **Figtree** 400 / 600 / 700.
- Échelle des titres : h1 42 px (landing 38–64 px en `clamp`), h2 28–42 px, titres d'écran mobile 26–30 px, sous-titres de carte 15–19 px, texte 13–17 px, légendes 11–12 px.
- Kickers : 11–12 px, uppercase, letter-spacing .12–.14em, 700, couleur `accent-700`.

### Couleurs (hex exacts)
| Token | Hex | Usage |
|---|---|---|
| bg | `#f5ead8` | fond de page |
| surface | `#ebddc5` | cartes, champs |
| text | `#201e1d` | texte |
| accent | `#c67139` | CTA principal, alerte « avis médical » |
| accent-2 | `#7a8a5e` | succès, validé, argent reçu |
| divider | `#201e1d` à 16 % | bordures |
| neutral 100 / 200 / 300 / 400 / 500 / 600 / 700 / 800 / 900 | `#f9f4ed` `#eee7db` `#dcd3c4` `#c0b6a5` `#a19786` `#82796a` `#645c50` `#474238` `#2e2b25` | |
| accent 100 / 200 / 300 / 400 / 500 / 600 / 700 / 800 / 900 | `#fff2eb` `#ffe1d0` `#ffc6a5` `#f6a06b` `#d67f48` `#b2622d` `#8c491a` `#643312` `#402310` | |
| accent-2 100 / 200 / 300 / 400 / 500 / 600 / 700 / 800 / 900 | `#f0fae1` `#e1eecc` `#ccdbb2` `#aebf92` `#8fa073` `#728157` `#56633f` `#3d472b` `#272e1b` | |
| MTN MoMo | `#ffcb05` (texte `#1a1a1a`) | badge opérateur |
| Orange Money | `#ff7900` (texte `#1a1a1a`) | badge opérateur |

### Espacements, rayons, ombres
- Espacements : 4.4 / 8.8 / 13.2 / 17.6 / 26.4 / 35.2 px (`--space-1,2,3,4,6,8`).
- Rayons : sm 8, md 16, lg 28 px. **Cartes et dialogues : 32 px** (lg × 1.15). **Boutons, tags, segmented, inputs : 999 px (pilule).**
- Ombres : sm `0 1px 2px rgba(46,43,37,.14)`, md `0 3px 10px rgba(46,43,37,.16)`, lg `0 12px 32px rgba(46,43,37,.22)`.

### Composants de base (classes du DS → à mapper sur shadcn)
- `.btn-primary` : fond accent, texte neutral-100, pilule, 700. Hover un cran plus foncé (accent-600).
- `.btn-secondary` : transparent, bordure divider. Hover : text à 7 %.
- `.btn-ghost` : texte accent. Hover : accent à 10 %.
- `.card` : fond surface, rayon 32, padding 13.2 px, gap 8.8 px.
- `.tag` : 11 px, padding 3×10, pilule. Variantes : `tag-accent` (accent-100 / accent-800), `tag-accent-2` (accent-2-100 / accent-2-800), `tag-neutral`.
- `.input` : fond surface, bordure divider, pilule, padding-inline 14 px, 14 px. Hover : bordure text à 45 %.
- Segmented (onglets pilule) : conteneur surface, padding 4, option active en fond accent et texte bg.

### Icônes
Utiliser **lucide-react** au trait 1.75, taille 21–24. Pas de dessins maison ni d'émojis. Barre d'onglets B2C : `House`, `ChartLine` (Ma peau), `ScanFace` ou cadre de scan (Scanner), `Droplet` (Soins), `MessageCircle` (Messages).

---

## 3. Appli patient B2C — `GlowScan App.dc.html`

**Navigation (mobile)** : 5 onglets en bas.
- Ordre : Accueil · Ma peau · **Scanner** (bouton central rond 50 px, fond neutral-900, icône neutral-100) · Soins · Messages.
- Onglet actif : pastille accent-100 de 52×30 derrière l'icône (accent-800), label 700.
- Barre : fond surface avec bordure haute divider.

**À supprimer** :
- le menu « Explorer » à 8 entrées ;
- le jargon « Console globale », « télémétrie », « SkinBot Engine » (remplacé par « Assistant GlowScan ») ;
- les émojis ;
- l'onglet Scan produit séparé ;
- l'en-tête dégradé violet de la liste des dermatologues.

### Écrans et fichiers repo
| Maquette | Fichiers repo à modifier |
|---|---|
| Accueil | `HomeAccueil.tsx`, `Home.tsx` |
| Scanner (peau + produit) | `Analyze.tsx`, `ScanProduct.tsx` (fusionnés dans un seul onglet avec un segmented « Ma peau / Un produit ») |
| Résultat | `components/ResultCard*`, **supprimer `components/LowScoreExperience.tsx`** |
| Scan produit | `ScanProduct.tsx` |
| Ma peau | nouvel écran (reprendre la courbe d'évolution de `Profile.tsx`) |
| Soins (Routine + Boutique) | `Routine.tsx`, `Shop.tsx` |
| Commande | `components/OrderModal.tsx` → écran plein, 4 étapes |
| Messages / Consultation | `Chat.tsx`, `MesConsultations.tsx` |
| Dermatologues / Réserver | `DermPublicList.tsx`, `DermPublicProfile.tsx` (le profil public est fusionné dans « Réserver ») |
| Profil | `Profile.tsx` |
| Premium | `Premium.tsx` |

Défis (`Challenge.tsx`) n'est pas repris : **ne pas le toucher**, en attente de décision.

### Règles métier B2C (non négociables)
1. **Résultat : 5 états** selon le Glow Score.
   - `good` si ≥ 75 : « Bonne santé ».
   - `watch` si 60 à 74 : « À surveiller ».
   - `medical` si < 60 : « Avis médical conseillé ».
   - `urgent` : drapeau d'alerte renvoyé par l'IA.
   - `unusable` : photo trop sombre ou floue.

   Libellés, couleurs, CTA et observations exacts : constante `RSTATES` dans la maquette.
2. **Sous 60 et en urgent : aucun produit n'est proposé.** Le seul CTA est « Consulter un dermatologue ». En urgent, c'est « Avis urgent · réponse sous 2 h ».
3. **Supprimer toutes les métriques inventées** de `LowScoreExperience` :
   - surfaces en cm² et tailles en mm ;
   - grade GEA ;
   - « critères ABCDE » ;
   - « hypothèses écartées » avec des % codés en dur ;
   - âge cutané et rides.

   N'afficher que ce que le modèle renvoie réellement : score, type de peau, phototype, hydratation et 5 indicateurs (Taches, Imperfections, Sébum, Hydratation, Sensibilité).
4. **Photo de résultat avec 5 zones numérotées** (front, joue droite, nez, joue gauche, menton), colorées selon l'état. Au toucher, un bandeau affiche le détail de la zone.
5. **Échelle horizontale** avec des seuils visibles : Urgent | Médecin (< 60) | À surveiller (60–74) | Bonne santé (≥ 75), et un curseur au niveau du score.
6. **Mention obligatoire**, affichée sous chaque résultat : « Analyse indicative, calibrée sur les phototypes IV à VI. Elle ne pose pas de diagnostic et ne remplace pas un examen médical. »
7. **Scan produit** :
   - verdict « Compatible » ou « À éviter pour votre peau » ;
   - détection de l'hydroquinone, des corticoïdes (clobétasol…) et du mercure ;
   - bouton « Voir une alternative sans danger » qui mène à la Boutique ;
   - version gratuite : 3 scans par semaine.
8. **Consultation** :
   - le dossier (photos, score, historique) part automatiquement ;
   - seulement 3 questions en boutons : « Depuis quand ? », « Ça démange ? », « Éclaircissant utilisé ? » ;
   - paiement Mobile Money avec **détection de l'opérateur** : MTN = 67x, 68x, 650–654 ; Orange = 69x, 655–659 (fonction `opOf`) ;
   - **argent bloqué (séquestre) jusqu'à la réponse du médecin, remboursement automatique après 24 h sans réponse** ;
   - dans la conversation : le compte rendu signé (PDF) et une note de 1 à 5 étoiles.
9. **Routine prescrite par le médecin : toujours gratuite.** Aujourd'hui elle est derrière un paiement : à retirer.
10. **Premium** :
    - 500 F par semaine ou 2 000 F par mois ;
    - inclus : analyses illimitées, scans produit illimités, Assistant, comparaison détaillée ;
    - **les consultations ne sont pas incluses** : c'est le médecin qui fixe son prix.
11. **Profil : consentements séparés**, chacun avec son interrupteur :
    - « Partager avec mes médecins » : obligatoire, verrouillé ;
    - « Aider la recherche » : atlas anonymisé ;
    - « Rappels WhatsApp ».

    Ajouter aussi le journal « Qui a consulté mon dossier », « Télécharger toutes mes données » et « Supprimer mon compte ».
12. **Commande de produits** : 4 étapes, puis un écran de suivi. Reprendre `OrderModal.tsx` en entier.
    1. **Panier** : quantités modifiables avec + et −.
    2. **Livraison** : nom, téléphone WhatsApp/MoMo, ville en boutons. **Tarifs validés : Douala = livraison 1 000 F ; autres villes = expédition 2 500 à 3 000 F** (Yaoundé, Kribi, Bafoussam, Buea 2 500 F ; Garoua et Nord 3 000 F). Hors Douala, la ligne s'appelle « Expédition · <ville> » et le suivi affiche « Expédiée · sous 48 à 72 h », quartier ou point de repère, précisions pour le livreur.
    3. **Paiement** : récapitulatif (produits, livraison, total), puis un choix :
       - Orange Money `690 501 392` (`#150#`) ;
       - MTN MoMo `674 377 959` (`*126#`) ;
       - espèces à la livraison.

       Bouton « Copier » sur le numéro, et le **n° de commande sert de référence** du paiement.
    4. **Preuve** : la capture du paiement est obligatoire, sauf en paiement à la livraison. On affiche l'aperçu du message WhatsApp pré-rempli : n° de commande, produits, total, adresse, Glow Score et type de peau, **sans émojis**. À l'envoi, le message part vers `wa.me/237674377959` (logique existante).

    Écran de suivi : Reçue → Paiement vérifié (ou « Confirmée » en cas d'espèces) → En livraison → Livrée. La commande apparaît aussi dans le Profil. **Le total est figé au moment de l'envoi** (bug corrigé dans la maquette).

---

## 4. Portail pro GlowScan Derm

Fichiers : `client/src/pages/pro/*`, `components/ProLayout.tsx`, `server/proRoutes.ts`.

| Maquette | Fichiers repo |
|---|---|
| `Derm Landing.dc.html` | `pages/DermLanding.tsx` |
| `Derm Connexion.dc.html` | `pro/ProConnexion.tsx`, `ProInscription.tsx`, `ProMotDePasseOublie.tsx` |
| `Derm Portal.dc.html` : Tableau de bord, Patientèle, Fiche patient, Analyse, Consultations, Agenda, Performances, Paiements, Cabinet | `ProDashboard`, `ProPatients`, `ProPatient`, `ProAnalyze`, `ProConsultations`, `ProAgenda`, `ProStats`, `ProPayments`, `ProCabinet` |
| `Derm Dashboard.dc.html` | `ProDashboard.tsx` (variante détaillée) |
| `Derm Teleexpertise.dc.html` | `ProPeerReviews.tsx` + `create_peer_reviews.sql` |
| `Derm Reseau.dc.html` | **nouveau** : réseau relais et formation |
| `Derm Encaissement.dc.html` | `ProPayments.tsx` + nouveau portefeuille |
| `Derm Pilotage.dc.html` | **nouveau** : tableau de bord ONG et fondateur |

### Règles métier Derm
1. **Consultation B2C** : le patient arrive depuis l'appli GlowScan, et **le diagnostic IA est déjà proposé**.
   - Le médecin **valide ou corrige** ; ne pas lui imposer une nouvelle analyse longue.
   - Le compte rendu se pré-remplit : patient, diagnostic, traitement, contrôle.
   - Le médecin signe avec son code à 4 chiffres, puis le compte rendu part **sur le WhatsApp et l'email du patient**.
2. **Répartition d'une consultation B2C : 80 % médecin, 20 % GlowScan.** Le portefeuille est crédité quand la réponse est envoyée, c'est-à-dire à la sortie du séquestre.
3. **Patients du cabinet** (secrétaire ou infirmière) :
   - rôle `secretary`, via la table existante `migrations/0004_create_secretary_accounts.sql` ;
   - à l'accueil : identité, motif, puis 3 photos prises depuis la tablette ou le téléphone de l'infirmière ;
   - **l'analyse IA tourne avant la consultation**, puis le patient passe en « Salle d'attente » avec son dossier prêt ;
   - accès limité : pas de portefeuille, pas de validation de diagnostic.
4. **Agenda** géré par le médecin ou la secrétaire : créneaux, prise de rendez-vous, confirmation du patient sur WhatsApp (« Répondez 1 pour confirmer »).
5. **Rappels automatiques** (à brancher sur `server/cron.ts` et `server/whatsapp.ts`) :
   - la veille : rappel WhatsApp ;
   - 2 h avant : SMS ;
   - après la visite : compte rendu PDF ;
   - J+28 : demande de photo de contrôle (colonnes existantes `alter_patients_followup_reminder.sql`, `alter_scans_followup.sql`).
6. **Suivi** : la photo de contrôle reçue et l'évolution du score (ex. 58 → 66) remontent dans la fiche patient et sur le tableau de bord.
7. **Télé-expertise (relais de terrain)** :
   - Le relais (infirmier ou médecin d'un CSI) envoie un cas et **propose son diagnostic AVANT de voir l'IA**.
   - La suggestion IA n'est montrée qu'après sa proposition.
   - Tarif : **avis simple 3 000 F, avis urgent 5 000 F (réponse sous 2 h)**. Le paiement vient de la patiente au CSI par MoMo, ou du programme ONG.
   - **Répartition : 60 % dermatologue, 20 % relais, 20 % GlowScan.**
   - Le dermatologue confirme ou corrige, et sa correction (« Votre avis · devient la leçon du relais ») est envoyée au relais.
8. **Formation du relais** : un suivi par maladie.
   - **Autonome à ≥ 85 % d'accord sur au moins 20 cas** (ex. 17/20).
   - Badge « Autonome sur <maladie> ».
9. **Second avis entre confrères** : même flux, mais seuls la photo, l'âge et le sexe sont partagés, jamais le nom ni le téléphone.
10. **Pilotage ONG** :
    - indicateurs : cas traités, agents formés, accord moyen avec le dermatologue ;
    - courbe mensuelle de l'accord avec le seuil de 85 % en pointillé ;
    - liste des agents avec leur % ;
    - bouton « Générer le rapport mensuel » (PDF envoyé au bailleur).
11. **Fondateur** : rapprochement des paiements.
    - Chaque transaction Mobile Money est vérifiée auprès de l'opérateur (ID de transaction) avant tout crédit.
    - Les 20 % GlowScan s'accumulent sur un compte plateforme, retirable vers MoMo.
    - Voir `Derm Encaissement.dc.html`.
12. **Abonnement pro** : 10 000 FCFA par mois, 14 jours gratuits sans carte bancaire. Les gains en avis sont déduits automatiquement de l'abonnement.
13. **Connexion** : email et mot de passe, lien magique, 2FA par code email à 6 chiffres avec codes de secours (colonnes existantes `alter_users_2fa_*`). À l'inscription, choix du profil : Dermatologue / Relais / ONG. **Redirection selon le rôle.**
14. **Mobile** : le portail doit fonctionner sur téléphone.
    - En dessous de 768 px : barre du bas à 5 onglets (Accueil, Patients, Analyse au centre, Messages, Plus).
    - L'agenda passe en vue jour, les tableaux deviennent des cartes, la conversation s'ouvre en plein écran.
    - Le Pilotage reste lisible, avec la mention « plus confortable sur ordinateur ».

---

## 5. Données : nouvelles tables (Drizzle, dans `shared/schema.ts` et `migrations/0013_*`)

Lire d'abord `shared/schema.ts`, puis **réutiliser** ce qui existe : `consultations`, `peer_reviews`, `secretary_accounts`, `patients`, `scans`. Ajouter seulement ce qui manque :

- `wallet_ledger` : id, pro_id, type (`consultation` | `relay_review` | `peer_review` | `withdrawal` | `subscription`), gross_fcfa, share_pct, amount_fcfa, source_id, operator_txn_id, status (`pending` | `escrow` | `available` | `paid_out` | `refunded`), created_at.
- `platform_ledger` : même structure, pour la part GlowScan.
- `withdrawals` : id, owner_id, operator (`mtn` | `orange`), msisdn, amount_fcfa, status, operator_ref, created_at.
- `relay_cases` : id, relay_id, center_name, patient_age, patient_sex, zone, photos[], relay_diagnosis, ai_diagnosis, ai_confidence, tier (`simple` | `urgent`), price_fcfa, payer (`patient` | `program`), program_id, derm_id, derm_verdict (`confirm` | `correct`), derm_diagnosis, derm_note, answered_at.
- `relay_progress` : relay_id, disease_code, cases, agreements, autonomous_at.
- `programs` : id, name, funder, district, created_at, et `program_members` (relay_id, program_id).
- `appointments` : id, pro_id, patient_id, starts_at, kind (`first` | `followup` | `online` | `relay`), status (`booked` | `confirmed` | `done` | `no_show`), created_by (pro ou secrétaire).
- `reminders` : id, patient_id, appointment_id, channel (`whatsapp` | `sms` | `email`), kind (`j-1` | `h-2` | `report` | `followup_j28`), send_at, sent_at.
- `orders` : id (format `GS-XXXXXX`), user_id, items JSON, subtotal, delivery_city, delivery_fee, total (figé), name, phone, quartier, notes, pay_method (`orange` | `mtn` | `cash`), proof_url, status (`received` | `paid_verified` | `shipping` | `delivered`), created_at.
- `consents` : user_id, care (toujours vrai), research, reminders, updated_at ; et `record_access_log` (patient_id, viewer_id, viewer_role, at).

Les montants sont toujours des entiers en FCFA. Les pourcentages sont centralisés dans une constante partagée : `SPLITS = { consultation: {pro:80, platform:20}, relay: {derm:60, relay:20, platform:20} }`.

---

## 6. Plan d'implémentation conseillé (à suivre dans l'ordre)

Faire une PR par étape, et vérifier `npm run check` à chaque fois.

1. **Tokens** : Tailwind et CSS vars Organic, polices, composants shadcn restylés (Button, Card, Badge, Input, Tabs en pilule).
2. **B2C** : navigation à 5 onglets, puis Résultat (supprimer `LowScoreExperience`), Scanner, Ma peau, Soins, Commande, Consultation, Profil, Premium.
3. **Paiements** : séquestre, remboursement à 24 h, `wallet_ledger`, `platform_ledger`, vérification des transactions opérateur, retraits.
4. **Derm** : landing, connexion avec rôles, Portal (9 écrans), accueil secrétaire, agenda et rappels dans le cron.
5. **Télé-expertise, Réseau et Formation** : `relay_cases`, `relay_progress`, écran relais sur mobile.
6. **Pilotage ONG** et rapport PDF mensuel.
7. **Responsive** du portail Derm (section 4, point 14).

---

## 7. Assets

- `client/public/glowscan-mark.png`, `client/public/glowscan-derm-hero-full.webp` : existent déjà dans le repo.
- `img/*.jpeg` : photos fournies par le fondateur, **utilisées uniquement pour la démo investisseur**.
  - Plusieurs viennent de Google Images (icône Lens visible) : **droits à vérifier, ne pas les mettre en production.**
  - Pour le produit, utiliser l'atlas interne avec consentement.

---

## 8. Fichiers du dossier

- `GlowScan App.dc.html` : appli patient complète, avec un panneau « Ajouté / Retiré » par écran.
- `Derm Landing.dc.html`, `Derm Connexion.dc.html`, `Derm Portal.dc.html`, `Derm Dashboard.dc.html`, `Derm Teleexpertise.dc.html`, `Derm Reseau.dc.html`, `Derm Encaissement.dc.html`, `Derm Pilotage.dc.html` : portail pro.
- `Demo Investisseur.dc.html` + `derm-demo.jsx` + `animations-v3.jsx` : vidéo de démo (**hors produit**, ne pas implémenter).
- `_ds/` : design system Organic (tokens et classes de référence).
- `support.js` : moteur qui fait tourner les maquettes. **Ne pas le porter dans l'app.**
- `CLAUDE_CODE_PROMPT.md` : le message à coller dans Claude Code.
