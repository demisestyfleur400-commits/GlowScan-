# Mise en ligne — nouvelle page d'accueil GlowScan (visiteur + connecté)

Repo : GlowScan- (React/TSX client, Express server). Déploiement : Vercel depuis `main`.
Ce dossier contient 4 maquettes validées par le fondateur et 2 images.

| Fichier | Rôle |
|---|---|
| `Main.dc.html` | Page visiteur, version ordinateur (référence visuelle et textes) |
| `Mobile.dc.html` | Page visiteur, version mobile |
| `AppNouveau.dc.html` | Accueil connecté, utilisateur sans analyse |
| `AppActif.dc.html` | Accueil connecté, utilisateur avec analyses (valeurs d'exemple) |
| `accueil-dermatologue.jpg` | Image du haut de page visiteur |
| `accueil-scan-selfie.jpg` | Image de la section « Pourquoi GlowScan » |

Les `.dc.html` sont des maquettes HTML statiques : reprends la structure, les textes et les couleurs, pas le code tel quel.
Les `src="/_blob/..."` des maquettes sont à remplacer par les fichiers ci-dessous.

## 0. Préparation

1. Créer une branche `feat/nouvel-accueil`.
2. Convertir les deux images en WebP (largeur max 1600 px, qualité ~80) et les placer dans `client/public/img/` :
   `accueil-dermatologue.webp`, `accueil-scan-selfie.webp`. Garder un `alt` descriptif.
3. Logo : utiliser `client/public/glowscan-mark.png` (ou `logo-glowscan.png`, celui qui est transparent).

## 1. Charte (commune aux deux pages)

- Police : DM Sans (déjà chargée via `ensureDermFonts`, sinon Google Fonts 400/500/600/700).
- Couleurs : vert profond `#0F3B32` (titres, boutons principaux), fond `#F6F8F7`, cartes `#FFFFFF` bordure `#E2E8E5`, vert pâle `#E3EFE9`, section claire `#E9F1ED`, texte secondaire `#4E6159` / `#3F524B`, accent texte `#1E6F61`, accent clair sur fond sombre `#9FD3C1`.
- Rayons : boutons 12 px, cartes 16–20 px. Icônes : `lucide-react` (pas d'emoji).
- Accessibilité : vrais `<a>`/`<button>`, cibles ≥ 44 px, contraste ≥ 4.5:1.

## 2. Page visiteur — `client/src/pages/Landing.tsx`

Remplacer le contenu actuel (écran « Bienvenue sur GlowScan ») par la page des maquettes `Main` (≥ 768 px) et `Mobile` (< 768 px), en une seule page responsive (flex-wrap / grid auto-fit, pas deux composants).

Sections, dans l'ordre (textes exacts dans les maquettes) :
1. **En-tête** : logo + « GlowScan », liens Comment ça marche (#comment), Dermatologues (#dermatologues), Boutique (/shop), Espace dermatologue (/derm), bouton « Analyser ma peau ». Mobile : bouton menu (44 px) qui ouvre les mêmes liens.
2. **Hero** : étiquette « Un mini dermatologue pour tous, pensé pour les peaux africaines », H1 « Un avis dermatologique fiable, sans faire la queue. », texte, 2 boutons : « Analyser ma peau gratuitement » → `/analyze` ; « Consulter un dermatologue · 5 000 FCFA » → `/dermatologues`. 3 coches. Image `accueil-dermatologue.webp` + carte flottante « Votre dossier » (desktop uniquement).
3. **Bandeau confiance** (4 éléments).
4. **Comment ça marche** (3 étapes, la 3e sur fond vert profond).
5. **Un mini dermatologue dans votre poche** (6 cartes : Analyse IA, Consultation, Scan de produit, Ma routine, Suivi de ma peau, Boutique skincare). Chaque carte renvoie vers la page correspondante : `/analyze`, `/dermatologues`, `/product-scan-camera`, `/routine`, `/ma-peau`, `/shop` (connexion demandée si nécessaire, comme aujourd'hui).
6. **Pourquoi GlowScan** + image `accueil-scan-selfie.webp`.
7. **Ce que vous obtenez** (3 offres).
8. **Encart dermatologues** → `/derm`.
9. **Pied de page** (avertissement médical, liens CGU (`/cgu` si la page CGU v2 est déjà en ligne, sinon `/derm/conditions`), Confidentialité `/confidentialite`, Contact).

Contraintes :
- Garder l'appel `useSEO` existant et le JSON-LD de `client/index.html` ; ne rien ajouter de chiffré (pas de traction, pas de nombre d'utilisateurs).
- Ne pas écrire « 100 % confidentiel ». La mention autorisée est « Données protégées selon la loi camerounaise n° 2024/017 ».
- Ne pas inventer de nom de dermatologue ni de logo partenaire.
- Images en `loading="lazy"` sauf l'image du hero (`fetchpriority="high"`).

## 3. Accueil connecté — `client/src/pages/HomeAccueil.tsx`

Garder la règle actuelle : **uniquement des données réelles**, une carte sans donnée est masquée ou propose la première action. Réutiliser les requêtes existantes (`/api/consultations/mine`, `/api/routines`, `/api/journal?days=7`, `useScans`, `useSubscription`) et ajouter `/api/product-scan/quota` (renvoie `{ isPremium, used, limit, remaining }`).

Ordre des blocs (maquettes `AppNouveau` et `AppActif`) :
1. **En-tête** : logo + « GlowScan » (remplace le mot « glowscan » seul), bouton profil rond 44 px.
2. « Bonjour {prénom}. » + date.
3. **Réponse du médecin** (bandeau vert profond) — inchangé, seulement s'il y a une réponse non lue.
4. **Carte principale** :
   - aucune analyse → carte vert profond « Étape 1 · gratuit — Faites votre première analyse de peau » avec le bouton « Analyser ma peau » DANS la carte (supprimer la carte verte non cliquable + le bouton séparé) ;
   - sinon → carte Glow Score actuelle (anneau, état, zone, « il y a X jours », lien « Voir → »).
5. **Kit conseillé** (seulement si une analyse existe et que `productsAllowed(state)` est vrai) : réutiliser `pickKit()` et `kitCard()` de `shared/kits.ts` sur le dernier résultat (`recommendations._fullResult`, zone du scan). Afficher les 3 photos des produits (`kitCard().items[].image`), le nom, le prix (`kitCard().price`, `formatF`), la raison (`kitCard().reason`) et le bouton « Ajouter le kit au panier » → `cart.add(kit.id)` puis `/shop?p={kit.id}`.
6. **« Votre mini dermatologue »** : grille 2 × 2.
   - Nouvel inscrit : Scanner un produit (« Repérez les ingrédients dangereux · {limit} gratuits / semaine »), Ma routine, Mon kit conseillé (« Disponible après votre analyse », non cliquable ou vers /analyze), Suivi de ma peau.
   - Utilisateur actif : Nouvelle analyse, Scanner un produit (« {remaining} scans gratuits restants », ou « Illimité » si Plus), Ma routine (« Aujourd'hui : {done} / {total} étapes » ou « Créer ma routine »), Suivi de ma peau (« Bilan du jour à faire » ou « {comfort} / 5 aujourd'hui »).
   - Photo de contrôle demandée par le médecin : garder la tuile existante (pleine largeur) quand `followUp` existe.
7. **Carte « Parler à un dermatologue · 5 000 FCFA »** (bordure vert profond, bouton « Choisir un dermatologue » → `/dermatologues`). Remplace la petite pastille « Un avis expert ». Retirer aussi la pastille « La boutique » (la boutique reste dans la barre du bas, onglet Soins).
8. **GlowScan Plus** : n'afficher la carte que si `!isPremium` ET l'utilisateur a au moins 3 analyses. Texte : « Déjà {n} analyses : passez à GlowScan Plus » / « Analyses et scans illimités · 2 000 FCFA / mois ».
9. Nouvel inscrit uniquement : ligne « Données protégées selon la loi n° 2024/017 ».

## 4. Barre de navigation du bas

Dans le composant qui affiche la barre (Accueil, Ma peau, Scanner, Soins, Messages) : la limiter à la largeur de l'appli (`max-width: 480px; margin: 0 auto`) pour qu'elle ne s'étale plus sur tout l'écran d'ordinateur. Ne rien changer d'autre à la navigation.

## 5. Vérifications avant de pousser

- `npm run build` sans erreur ; pas de nouvelle erreur TypeScript.
- Vérifier visuellement à 390 px et 1366 px : page visiteur (déconnecté) ; accueil connecté sans analyse ; accueil connecté avec une analyse (Glow Score + kit).
- Vérifier que tous les liens mènent à une page existante et que le panier reçoit bien le kit.
- Commit en français, puis pousser la branche et ouvrir une PR vers `main` (ne pas pousser directement sur `main`).
