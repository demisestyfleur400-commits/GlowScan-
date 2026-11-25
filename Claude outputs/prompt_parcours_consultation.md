# Prompt pour Claude Code — Réparer le parcours « analyse → consultation payée »

## Contexte

Audit du 16 novembre 2026, fait en lecture seule sur le dépôt et sur la base de production.
Constat : 114 analyses patient ont affiché « Un dermatologue doit voir votre peau » (score sous 60), et presque aucune n'a abouti à une consultation payée par un vrai patient.
Les causes sont dans le parcours lui-même. Corrige-les dans l'ordre ci-dessous, un commit par point, et ne touche à rien d'autre.

Le parcours actuel, côté patient :

1. Résultat (`client/src/components/b2c/ResultB2C.tsx`, textes dans `client/src/lib/resultView.ts`) → bouton « Consulter un dermatologue » → `/dermatologues`
2. `client/src/pages/DermPublicList.tsx` : écran d'introduction, puis liste
3. `client/src/pages/DermPublicProfile.tsx` (`/dr/:slug`) : connexion exigée, 3 questions, numéro, accord, paiement manuel, saisie de l'ID de transaction
4. Confirmation manuelle par l'admin (`POST /api/admin/consultations/:id/confirm` dans `server/routes.ts`)

## 1. Ramener le patient où il était après la connexion

Aujourd'hui, toute connexion ou inscription finit par `setLocation("/")` :
`client/src/pages/AuthPage.tsx` (lignes 77, 95, 172) et `client/src/pages/AuthRegisterWizard.tsx` (lignes 130, 148).
Un patient qui clique « Se connecter pour réserver » sur `/dr/:slug` atterrit donc sur l'accueil et doit tout refaire.
`ConsultationLauncher.tsx` écrit bien `postLoginIntent` dans `sessionStorage`, mais personne ne le lit.

À faire :
- Avant d'envoyer vers `/auth` (dans `DermPublicProfile.tsx` et `ConsultationLauncher.tsx`), enregistrer le chemin de retour dans `sessionStorage` (clé `postLoginRedirect`).
- Après une connexion ou une inscription réussie, rediriger vers ce chemin puis effacer la clé. Sinon, garder `/`.
- N'accepter qu'un chemin interne : il commence par `/` et pas par `//`.

## 2. Garder l'analyse du patient jusqu'au médecin

Une analyse faite sans compte est enregistrée avec `session_id` et sans `user_id` (`server/routes.ts`, vers les lignes 2724 et 3001). Rien ne la rattache au compte créé ensuite.
`DermPublicProfile.tsx` prend `scans[0]` du compte : pour un nouveau compte, c'est vide, et le médecin reçoit « Aucune analyse ».
62 des 114 analyses sous 60 ont été faites sans compte : c'est le cas majoritaire.

À faire :
- À la connexion et à l'inscription, rattacher au compte les analyses anonymes de la même session (`UPDATE scans SET user_id = … WHERE user_id IS NULL AND session_id = …`). Vérifie d'abord que l'identifiant de session survit à la connexion ; s'il est régénéré, transmets l'ancien.
- Faire suivre l'identifiant de l'analyse dans l'URL : résultat → `/dermatologues?scan=ID` → `/dr/:slug?scan=ID`, et l'utiliser à la place de `scans[0]`.
- Sécurité, à vérifier puis corriger si besoin : `POST /api/consultations` (vers la ligne 882) enregistre le `scanId` et l'`imageUrl` reçus du navigateur sans vérifier qu'ils appartiennent au patient. Le serveur doit vérifier que l'analyse est bien à lui (même `user_id`, ou même session) et lire lui-même `condition` et `image_url` dans la table `scans`.

## 3. Raccourcir le chemin depuis un résultat

- Quand le patient arrive d'un résultat (`?scan=ID`), sauter l'écran d'introduction de `DermPublicList.tsx` et afficher directement la liste, comme pour `?urgent=1`.
- S'il n'y a qu'un seul dermatologue disponible, aller directement sur son profil.
- Si la liste est vide, ne pas renvoyer vers l'assistant : proposer de laisser son numéro pour être rappelé dès qu'un dermatologue est disponible, avec une case d'accord explicite.

## 4. Mesurer chaque étape

Aujourd'hui `page_visits` ne contient que `/`, `/analyze`, `/shop`, `pro_login` et `pro_register`. Entre l'analyse et le paiement, rien n'est mesuré.

À faire : enregistrer ces événements (dans `page_visits.page` avec un préfixe `evt:` ou dans une petite table dédiée, au choix le plus simple), avec la session, sans donnée personnelle ni donnée de santé :

- `result_view` avec l'état (`good`, `watch`, `medical`, `urgent`, `unusable`)
- `cta_derm_click`
- `derm_list_view` avec le nombre de médecins affichés
- `derm_profile_view`
- `auth_wall_shown`
- `booking_started` (première question répondue)
- `pay_click`
- `payment_ref_submitted`
- `paid` (côté serveur, à la confirmation)

Ajouter aussi l'événement Meta `InitiateCheckout` au clic sur « Payer ».
Ajouter dans `/admin` un tableau simple : nombre de sessions par étape sur 7 et 30 jours.

## 5. Ne promettre que ce qui est tenu

- `client/src/lib/resultView.ts`, état `urgent` : le bouton dit « Avis urgent · réponse sous 2 h ». Aucun délai de 2 h n'est garanti aujourd'hui. Remplacer par « Consulter un dermatologue rapidement ».
- Remboursement : les consultations 4, 5 et 11 sont payées, au statut `timeout`, sans réponse du médecin, avec `refund_due_at` vide et `refunded_at` vide. Le cron de `server/cron.ts` (vers la ligne 784) ne les a donc pas prises. Trouve pourquoi (statut `timeout` posé par un ancien traitement ?) et fais en sorte que toute consultation payée sans réponse après 24 h passe en `refund_due` et prévienne le propriétaire. Ne modifie pas ces trois lignes en base : signale-les à Demise.
- `client/src/components/AnalysisStates.tsx`, composant `PhotoUnusable` : il affiche des valeurs écrites en dur (« Flou de bougé — netteté 21 % », « Vue 1 · macro : Exploitable »). Si le composant est encore utilisé, retire ces valeurs inventées. S'il ne l'est plus, supprime-le.

## 6. Paiement manuel : moins d'allers-retours

Dans `DermPublicProfile.tsx`, étape `manual` :
- Ajouter un bouton qui ouvre le composeur du téléphone avec le code USSD (`tel:` avec `#` encodé en `%23`).
- Ajouter un bouton « Copier le numéro ».
- Remettre le bouton « Envoyer ma preuve sur WhatsApp » qui existait dans `ConsultationLauncher.tsx`, en plus de la saisie de l'ID de transaction.

## 7. À vérifier et à signaler, sans corriger

- `shared/models/auth.ts` ligne 25 : le rôle par défaut est `doctor`. En production, 151 comptes sur 155 ont ce rôle, patients compris. `server/proRoutes.ts` s'en sert (lignes 511 et 731, dont l'obligation de double authentification). Dis à Demise ce que ça change concrètement pour un patient, et propose un correctif séparé.
- La règle d'affichage des dermatologues (`/api/b2c/dermatologists`, vers la ligne 602) exige un abonnement ou un essai en cours. Ne la change pas sans l'accord de Demise : c'est une décision commerciale.

## 8. Réécrire les textes du parcours

But : le patient doit savoir ce qu'il reçoit, à quel prix, par qui et dans quel délai. Vouvoiement partout. Aucun mot de diagnostic, aucune promesse de délai autre que « 24 h ou remboursé ».
`{prix}` est le tarif du médecin, formaté avec `formatF`. `{nom}` est le nom du médecin, formaté avec `drName`.

### Écran résultat, état `medical` uniquement

Les autres états ne changent pas, sauf le bouton `urgent` déjà traité au point 5.

| Emplacement | Texte actuel | Nouveau texte |
|---|---|---|
| `components/b2c/ResultB2C.tsx`, `HEADLINE.medical` | « Mieux comprendre, / sans s'inquiéter. » | « Votre peau a besoin / d'un avis médical. » |
| `lib/resultView.ts`, `STATES.medical.vText` | « Sous 60, GlowScan ne conseille aucun produit seul. Votre dossier est prêt : photos et historique partent au médecin. » | « Une crème choisie au hasard peut aggraver ce que nous voyons. Un dermatologue peut regarder vos photos et vous dire quoi faire. » |
| `STATES.medical.cta.label` | « Consulter un dermatologue » | « Faire voir mes photos à un dermatologue · {prix} » |
| Sous le bouton, nouvelle ligne | rien | « Compte rendu signé et ordonnance si besoin, envoyés sur WhatsApp. Réponse sous 24 h, ou vous êtes remboursé. » |

`STATES.medical.vTitle` (« Un dermatologue doit voir votre peau ») reste tel quel.

Pour le prix dans le bouton : l'écran résultat ne le connaît pas aujourd'hui. Charger `/api/b2c/dermatologists` et afficher le tarif le plus bas, sous la forme « dès {prix} » s'il y a plusieurs médecins. Si la liste est vide ou si l'appel échoue, garder le bouton sans prix (« Faire voir mes photos à un dermatologue ») et ne pas afficher la ligne sur le délai et le remboursement.

### Liste (`pages/DermPublicList.tsx`)

- Titre de la vue liste : « Choisir un dermatologue » → « Qui va regarder votre peau ? »
- L'écran d'introduction est déjà sauté quand on vient d'un résultat (point 3). Son texte ne change pas pour les autres entrées.

### Profil et réservation (`pages/DermPublicProfile.tsx`)

| Emplacement | Texte actuel | Nouveau texte |
|---|---|---|
| Bouton du mur de connexion | « Se connecter pour réserver » | « Créer mon compte pour envoyer mon dossier » |
| Carte dossier, quand une analyse existe | « Votre dossier pour le médecin » + « Photos, Glow Score … et historique » | « {nom} recevra vos photos et votre analyse. » + « Vous n'avez rien à refaire. » |
| Encadré avant paiement | « Votre paiement reste bloqué jusqu'à la réponse du médecin. Sans réponse sous 24 h, le remboursement est déclenché automatiquement. » | « Vous payez {prix}. Si {nom} ne répond pas sous 24 h, nous vous remboursons sur votre numéro Mobile Money. » |
| Étape `waiting`, titre | « Paiement en cours de vérification » | « Paiement reçu, nous le vérifions » |
| Étape `waiting`, texte | « Vous serez prévenu dès qu'il est confirmé. La conversation s'ouvre alors dans Messages. » | « {nom} vous répond ici, dans Messages. Vous êtes prévenu dès que c'est confirmé. » |
| Étape `paid`, texte | « Il reste bloqué jusqu'à la réponse de {nom}. Sans réponse sous 24 h, le remboursement est déclenché automatiquement. » | « {nom} a reçu votre dossier. Sans réponse sous 24 h, nous vous remboursons sur votre numéro Mobile Money. » |

La carte dossier sans analyse (« Aucune analyse : le médecin verra seulement vos réponses ») ne change pas.
Ne pas écrire « prévenu sur WhatsApp » : l'envoi WhatsApp automatique n'est pas encore en service.

## Règles

- Un commit par point, message en français.
- Aucune modification de données en production.
- Après chaque point, dis ce que tu as testé et ce que tu n'as pas pu tester.
