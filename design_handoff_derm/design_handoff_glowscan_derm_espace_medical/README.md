# Handoff : GlowScan Derm · Espace médical du dermatologue

Repo cible : `demisestyfleur400-commits/GlowScan-` (branche `main`), le même que le handoff précédent `design_handoff_glowscan/`.
Stack existante : React 18 + Vite + TypeScript, Tailwind 3 + shadcn/ui (Radix), wouter, TanStack Query, Express 5 (`server/routes.ts`, `server/proRoutes.ts`), Drizzle ORM + Postgres (`shared/schema.ts`), WhatsApp (`server/whatsapp.ts`), emails (`server/email.ts`), cron (`server/cron.ts`), PDF (`@react-pdf/renderer`), icônes `lucide-react`.

---

## 1. À lire en premier

`Derm Vue Ensemble.dc.html` est une **maquette de référence en HTML**. Elle est cliquable et montre le rendu et le comportement attendus. **Ce n'est pas du code de production à copier.** Il faut **recréer ces écrans dans le code existant**, avec ses conventions :
- pages dans `client/src/pages/derm/` ;
- composants shadcn et Tailwind ;
- routes wouter ;
- données via TanStack Query et Express ;
- tables Drizzle.

- **Ouvrir la maquette** dans un navigateur depuis ce dossier. `support.js` et `img/` doivent être à côté.
- **Source de vérité** :
  - le *template* (balisage entre `<x-dc>` et `</x-dc>`) donne la mise en page et les styles exacts, tous inline ;
  - la classe `Component` (bloc `<script data-dc-script>`) donne les données de démo, les règles, les libellés et les états.
- **Fidélité : haute (hifi).** Couleurs, typographie, rayons, espacements et textes sont définitifs. Reproduire au pixel près.
- **Langue** : tout est en français. Vouvoiement, jamais de tutoiement. Pas d'émojis dans l'interface ni dans les messages envoyés aux patients.
- **Fonctionnalités retirées volontairement** : télé-expertise, échanges entre confrères, programmes ONG et réseau de relais ne font **pas** partie de cet espace. Ne pas les réintroduire dans la navigation. Le menu « Assistant Glow » et l'encart « Glow est prêt » de la barre latérale ont aussi été supprimés.
- **Identité visuelle** : cet espace médical utilise **sa propre palette** (vert profond et sarcelle, DM Sans + Manrope), différente du thème « Organic » de l'appli patient grand public. Garder cette palette pour l'espace Derm (voir §5).

---

## 2. Structure générale (shell)

Disposition en 2 colonnes, `min-height: 100vh`, fond `#f3f6f3`, texte `#102c2c`, police DM Sans.

### Barre latérale (fixe, 250 px)
- `position: fixed; top:0; bottom:0; left:0; width:250px; padding:22px 18px 16px`, fond `#0d2929`, texte `#dfe9e6`, défilement vertical si nécessaire.
- **Logo** : `img/glowscan-africa-dark.png`, largeur 158 px. À côté, un badge « DERM » : 7 px, 800, letter-spacing 1.4 px, couleur `#57d8cf`, fond `rgba(22,194,181,.08)`, bordure `1px rgba(46,209,196,.35)`, rayon 5 px, padding 4×6.
- **Libellé de section** « ESPACE MÉDICAL » : 8 px, 700, letter-spacing 1.5 px, couleur `#6e8a85`.
- **Menu**, dans l'ordre :
  1. Vue d'ensemble
  2. Agenda
  3. Patients
  4. Dossiers médicaux
  5. Suivis
  6. Votre activité
  7. Auto-évaluation
  8. Messagerie
  9. Paramètres

  Chaque entrée fait 43 px de haut, rayon 9 px, gap 11 px, texte 11 px, icône lucide 18 px (trait 1.8).
  - Survol : texte `#fff`, fond `rgba(255,255,255,.05)`.
  - Entrée active : texte blanc, 700, fond légèrement éclairci avec une ombre intérieure (valeurs dans `renderVals().nav`).
- **Pied** (collé en bas via `margin-top:auto`) : séparateur `1px rgba(255,255,255,.08)`, avatar rond 34 px fond `#53d1c6` initiales « DE », nom « Dr. DEMISE Essawe », rôle « Dermatologue », icône de déconnexion.

### Barre du haut (zone de contenu, décalée de 250 px)
- Bouton **« ← Retour »** (bordure, rayon 8) : revient à l'**écran précédent** de l'historique interne, **pas** à l'accueil. Il est masqué sur Vue d'ensemble quand il n'y a pas d'historique. Voir §6, historique.
- Champ « Rechercher un patient, un dossier… ».
- Bouton principal **« + Nouvelle consultation »** (fond `#0d746f`, texte blanc, rayon 9, hauteur 39) : ouvre le parcours de consultation (§3.10).

### En-tête d'écran (même motif sur tous les écrans)
- Conteneur `max-width:1240px; margin:auto; padding:30px 32px 40px`.
- Kicker : 10 px, 700, letter-spacing .4 px, couleur `#2a6b4f`, en majuscules.
- Titre h1 : DM Sans 600, 31 px / 1.1, letter-spacing −0.6 px, couleur `#17392c`.
- Sous-titre : 13 px, couleur `#66766f`.
- Actions à droite, alignées en bas (`flex`, `justify-content:space-between`, `align-items:flex-end`, wrap).

---

## 3. Écrans

Les textes exacts sont dans la maquette. Ci-dessous : rôle, structure et règles de chaque écran.

### 3.1 Vue d'ensemble (`active = 0`)
- Kicker « CENTRE CLINIQUE ». Titre « Bonjour, Dr. DEMISE » (Manrope 700, 28 px, letter-spacing −1.1 px). Sous-titre « Glow a préparé l'essentiel de votre activité. »
- **Bandeau sombre** (fond `#0d2929` avec motif léger, rayon 18) : kicker « INTELLIGENCE CLINIQUE ACTIVE », titre « Tout ce qui exige votre regard. Rien de plus. », lien « Ouvrir mon brief IA → ».
- **3 cartes compteurs** : Rendez-vous · Patients actifs · Suivis à examiner. Chacune a une icône dans une pastille `#e6f4f1` et un nombre en 22 px, 700.
- **2 cartes en bas** : « Prochains rendez-vous » (lien « Voir l'agenda ») et « Évolutions récentes » (lien « Tout voir »). Elles ont chacune un **état vide** : icône, titre, texte et lien d'action.

### 3.2 Agenda (`active = 1`)
- Kicker « ORGANISATION DU CABINET ».
- Vue semaine du lundi au vendredi, créneaux de 08:00 à 17:00 (données `AGW`).
- Types de rendez-vous : « Consultation » ou « Suivi ».
- Statuts (`AST`) : En attente de confirmation · Confirmé · « 1 » (le patient a répondu 1 sur WhatsApp) · Pas de réponse · En salle d'attente…
- Clic sur un rendez-vous : panneau de détail. Il contient le bouton **« Démarrer la consultation »**, actif uniquement le jour même pour un rendez-vous confirmé. Ce bouton ouvre le parcours §3.10 avec le patient déjà choisi (étape 2).
- Création et déplacement de rendez-vous depuis le panneau.

### 3.3 Patients (`active = 2`)
- Kicker « RÉPERTOIRE ADMINISTRATIF ».
- Liste des patients sous forme de **codes** (GS-0xx), avec âge, sexe et dernière visite (`PDIR`). Recherche, filtres et action « Importer des patients » (fichier CSV).
- **Fiche administrative** (kicker « PATIENTS · FICHE ADMINISTRATIVE »), avec lien « ← Tous les patients ».
- Un patient créé à l'étape 1 de la nouvelle consultation apparaît ici (`pdNew`).

### 3.4 Dossiers médicaux (`active = 3`)
- Liste (kicker « DOSSIERS MÉDICAUX · ESPACE CLINIQUE ») et **vue longitudinale** d'un patient (kicker « … · VUE LONGITUDINALE »).
- Onglets du dossier :
  - Vue d'ensemble (synthèse, allergies, prescriptions, consentement photo) ;
  - Consultations (fil chronologique) ;
  - Documents ;
  - Photographies cliniques.
- Bouton « Nouvelle consultation » : ouvre §3.10. Si un patient est sélectionné, il est repris.
- Après une nouvelle consultation remise, le dossier reflète **exactement** le compte rendu signé :
  - 1 consultation, nommée « Première consultation » pour un nouveau patient ;
  - 1 document, qui ouvre le même A4 ;
  - les médicaments saisis dans l'encadré Prescriptions ;
  - le consentement documenté ;
  - la synthèse reprenant la conclusion et le suivi.

### 3.5 Compte rendu (sous-écran de Dossiers)
- Fil d'Ariane « ← Dossiers médicaux ». Kicker « COMPTE RENDU · CONSULTATION DU … ». Badge de statut en pilule.
- **3 points obligatoires** : Conclusion du dermatologue · Conduite à tenir · Suivi (J+14 / J+28 / 3 mois / Aucun suivi).
- Les champs pré-remplis indiquent leur source (« SOURCE : ACCUEIL », « SOURCES : NOTES · DICTÉE »). Un champ requis vide a le fond `#fdf6ea`, la bordure `#efd9b0` et l'étiquette « À COMPLÉTER » en `#b0652a`. Une fois rempli : « COMPLÉTÉ » en `#2a6b4f`.
- **Prescription** : lignes répétables (Médicament ou soin · Forme / dosage · Voie · Posologie · Durée · Consignes). Mention « Aucun traitement n'est déduit ou inventé par l'IA. »
- Case **« Votre validation fait foi »** + **code de signature à 4 chiffres** puis bouton « Valider et signer », actif uniquement si les 3 points sont remplis, la case cochée et le code saisi.

### 3.6 Suivis (`active = 4`)
- Kicker « CONTINUITÉ DES SOINS ». Liste des patients suivis (`SUV`), avec filtres : aujourd'hui, en retard, planifiés.
- Fiche individuelle (kicker « SUIVI · FICHE INDIVIDUELLE ») :
  - prochain contrôle ;
  - rappel programmé ;
  - dernier message du patient (sa voix, entre guillemets) ;
  - fil d'évolution.
- Un contrôle choisi dans un compte rendu remis crée l'entrée correspondante ici (`ncFiles`).

### 3.7 Votre activité (`active = 5`)
- Kicker « PILOTAGE DU CABINET ». Titre « Votre activité, en un regard. »
- Choix du mois (`MONTHS`, de mai à octobre). Consultations par pathologie (`DIS`) :

  | Pathologie | Couleur |
  |---|---|
  | Acné | `#16b8ae` |
  | Troubles pigmentaires | `#d7ad5a` |
  | Eczéma | `#ed836f` |
  | Psoriasis | `#52a9ff` |
  | Autres | `#c4d3cf` |

  Écart par rapport au mois précédent. Export.

### 3.8 Auto-évaluation (`active = 'auto'`)
- Kicker « AUTO-ÉVALUATION & APPRENTISSAGE ».
- Plusieurs parties reliées par des onglets visibles (`auTab`) : **Bilan hebdomadaire** (kicker « MA PRATIQUE · BILAN HEBDOMADAIRE », semaine du 23 au 29 novembre 2026), retours patients, pistes de progression.
- Partie **Recherche & mémoires** :
  - plan de mémoire (`PLAN`) avec étapes faites ou à faire ;
  - bibliothèque de références (`RLIB`, mention « auteurs et PMID à vérifier sur PubMed ») ;
  - assistant de recherche.
- Depuis le bilan hebdomadaire, on doit **toujours voir comment passer à la partie suivante** (onglets et lien de retour dans le kicker).

### 3.9 Messagerie (`active = 6`)
- Kicker « CONSULTATIONS EN LIGNE ». Titre « Un échange. Un avis médical. Un suivi. » Encart « Patients de la plateforme grand public ».
- 3 colonnes :
  - liste des demandes (`MSG`, code GP-xxx, statut « à valider », etc.) ;
  - fil d'échange avec pré-analyse (titre et lignes) ;
  - rédaction du compte rendu.
- Le compte rendu remis utilise **le même modèle A4** que partout ailleurs (§4). L'en-tête dit « Patiente » pour une femme, « Patient » pour un homme.

### 3.10 Nouvelle consultation (`active = 'nc'`) — parcours au cabinet
Kicker « NOUVELLE CONSULTATION · AU CABINET ». Titre « Accueillir, examiner, documenter. » Lien « Recommencer ».

Un **stepper horizontal** de 5 étapes (boutons flex 1 1 150 px) :
- numéro dans un carré de 24 px ; étape active : fond `#eef4e8`, carré `#1f5c48` ;
- étape faite : carré `#cfe0c4`, coche « ✓ » ;
- une étape non atteinte est désactivée, à 50 % d'opacité ;
- après signature, on ne peut plus revenir en arrière.

Mise en page : colonne principale (flex 3 1 560 px) et colonne latérale (flex 1 1 280 px).

**Colonne latérale**
1. Carte patient (kicker « PATIENT » / « NOUVEAU PATIENT · GS-0xx » / « PATIENT DU CABINET », nom, âge · sexe · diagnostic en cours) et, à partir de l'étape 3, le motif entre guillemets.
2. Après signature : bloc **« Remettre au patient »**. Canaux cochables : WhatsApp, Email, Imprimer. Bouton « Remettre au patient ».
3. Après remise : bloc vert `#e5eedd` **« Ce que Glow a mis à jour »**, 4 lignes ✓, et deux boutons « Ouvrir le dossier médical → » et « Patient suivant ».
4. Encart « Qui fait quoi » : étapes 1 à 3 par la secrétaire ou l'infirmière, étapes 4 et 5 par le dermatologue. La signature est réservée au médecin.

**Étape 1 · Patient**
- Deux cartes de choix :
  - « Patient du cabinet » : recherche par code, âge ou dernière visite, liste de 8 résultats au plus, ligne sélectionnée avec liseré gauche `#1f5c48`. Si aucun résultat : lien « Créer une nouvelle fiche → ».
  - « Nouveau patient » :
    - champs Nom et prénom, Âge, Téléphone WhatsApp ;
    - Sexe (Femme / Homme) et canal de rappel (WhatsApp / SMS), en pastilles ;
    - **case de consentement** obligatoire.
- Bouton « Créer la fiche et continuer → » (nouveau patient) ou « Continuer avec GS-0xx → ». Désactivé tant que nom, âge, sexe et consentement manquent.
- La création attribue le code suivant (`max(code) + 1`, au format `GS-0xx`) et ajoute le patient à Patients.

**Étape 2 · Accueil & photos** (badge « Secrétaire ou infirmière »)
- Motif de la visite dans les mots du patient (zone de texte).
- « Ce qui l'amène » (pastilles multiples, `NCZ`) : Acné, Taches, Eczéma, Démangeaisons, Mycose, Contrôle.
- Zones concernées (`NCZONES`), « Depuis » (liste).
- **3 photos** (Face, Profil gauche, Profil droit) : vignettes 3:4 en pointillés, `input type="file" accept="image/*" capture="environment"`. Compteur « n / 3 photos ».
- Boutons « Continuer sans analyse » (lien) et « Lancer l'analyse Glow → », actifs si motif + au moins 1 photo.

**Étape 3 · Analyse Glow**
- Barre de progression en 3 messages : qualité des photos, puis analyse sur phototype IV à VI, puis préparation du dossier.
- Résultat : bloc « PROPOSITION GLOW · INDICATIVE » + mention **« Glow ne pose pas de diagnostic. Le dermatologue confirme ou corrige. »**
- 3 indicateurs : Photos exploitables · Score cutané Glow (avec dernière mesure pour un patient suivi) · Priorité.
- « Envoyer en salle d'attente → » puis bandeau sombre `#17392c` « En salle d'attente · dossier prêt » avec le bouton **« Faire entrer → »** (fond `#cfe08a`).

**Étape 4 · Examen**
- Photos du jour.
- Pour un patient suivi : rappel de la dernière visite (diagnostic, score avant → après) et lien vers le dossier.
- Proposition Glow avec **« Confirmer »** ou **« Corriger »** (ouvre le champ « Votre diagnostic retenu »).
- Observations cliniques. Dictée facultative (enregistrement micro, réécoute). **La dictée n'est pas prioritaire et peut être omise dans cette version.**
- « Rédiger le compte rendu → », actif si des observations sont saisies.

**Étape 5 · Compte rendu**
- Mêmes règles que §3.5 : motif et observations pré-remplis, 3 points obligatoires, prescription, case « Votre validation fait foi », code à 4 chiffres, « Aperçu du document », « Valider et signer ».
- Après signature : A4 affiché en iframe (hauteur 1140) et bouton « Ouvrir · imprimer · image ».
- À la remise :
  - le patient est ajouté ou mis à jour dans Dossiers médicaux ;
  - si un contrôle a été choisi, il est ajouté dans Suivis ;
  - si le parcours vient de l'Agenda, le rendez-vous passe au statut terminé.

### 3.11 Paramètres (`active = 8`)
Kicker « PARAMÈTRES DU CABINET ». Titre « Votre cabinet, à votre façon. » Menu de sections à gauche (190 à 260 px) et contenu à droite. **Barre d'enregistrement collante en bas** : message d'état, « Annuler », « Enregistrer les modifications » (actifs seulement si quelque chose a changé). Les réglages sont persistés (dans la maquette : `localStorage['glow-params']`, à remplacer par une table).

1. **Profil & cabinet** : nom affiché, n° d'ordre, signature (texte), nom, adresse, ville et pays, téléphone, email du cabinet. Aperçu de l'en-tête et lien « Voir un compte rendu avec ces informations → ». **Ces valeurs alimentent l'en-tête et la signature de tous les A4 (`CAB`).**
2. **Équipe & accès** : membres et rôles (Secrétaire, Infirmier·e). Droits : ✓ Accueil & photos, ✓ Agenda, ✕ Diagnostic · signature, ✕ Portefeuille. Actions : « Retirer » et invitation par WhatsApp (nom, téléphone, rôle).
3. **Agenda & rappels** :
   - horaires d'ouverture et de fermeture, durée d'un rendez-vous, pause, jours d'ouverture ;
   - 5 interrupteurs : veille WhatsApp, 2 h avant par SMS, compte rendu après la visite, demande de photo au contrôle, relance après un rendez-vous manqué ;
   - exemple de rappel sans détail médical.
4. **Tarifs & paiements** :
   - tarifs du cabinet, du contrôle et de la consultation en ligne, numéro Mobile Money ;
   - répartitions fixes : en ligne 80/20 ; avis 3 000 F (urgent 5 000 F) partagé 60/20/20 ; cabinet 100 % ;
   - opérateur Orange Money ou MTN MoMo ;
   - encart abonnement pro à 10 000 FCFA par mois.
5. **Signature & sécurité** : code actuel, nouveau code et confirmation (4 chiffres, différent de l'actuel). Appareils connectés avec « Déconnecter ».
6. **Confidentialité & données** : interrupteurs pour le consentement avant photo, les statistiques agrégées vers DHIS2, la pré-analyse Glow et la conservation 20 ans. **Export CSV anonymisé** (mois ; pathologie ; nombre de consultations, séparateur `;`, BOM UTF-8).

Interrupteur : 38×22, pastille blanche de 16 px. Activé `#1f5c48`, désactivé `#d6ddd8`.

---

## 4. Modèle de compte rendu A4 (commun à tout l'espace)

Fonction `RAPPORT(d)` dans la maquette. Elle génère le **même document** dans Dossiers médicaux, Messagerie et Nouvelle consultation. À recréer avec `@react-pdf/renderer` (PDF) et une vue HTML identique.

- Page de 794×1123 px (A4), padding 54/62/96, fond blanc, `@page { size: A4; margin: 0 }`.
- **En-tête** :
  - à gauche : kicker « DERMATOLOGIE » (9 px, 700, `#2a6b4f`), nom du cabinet (Manrope 700, 19 px), adresse, ville, téléphone et email (10 px, `#66766f`) ;
  - à droite : nom du médecin, « Dermatologue », n° d'ordre ;
  - filet bas 2 px `#17392c`.
- Titre (Manrope 700, 24 px) + « Consultation du JJ/MM/AAAA · Ville ».
- Bandeau patient sur fond `#eef4e8`, rayon 6 : PATIENT (Patiente / Patient + code) et ÂGE.
- Sections (h3 Manrope 700, 12.5 px, `#1f5c48`; texte 11.5 px / 1.65) :
  1. Motif de consultation
  2. Observations cliniques
  3. Conclusion du dermatologue
  4. Conduite à tenir
  5. Prescription : un tableau par médicament (MÉDICAMENT / SOIN, FORME / DOSAGE, VOIE D'ADMINISTRATION, POSOLOGIE, DURÉE, CONSIGNES)
  6. Suivi

  Un champ vide affiche « Non renseigné. » en `#8a9894`.
- Signature :
  - document signé : signature manuscrite (Georgia italique, 20 px, `#1f5c48`), « Validé le … », et à gauche « Document vérifiable glow-scan.com/v/{code} » ;
  - brouillon : filigrane « BROUILLON · NON TRANSMISSIBLE » (rotation −24°, `rgba(176,101,42,.13)`, 64 px) et « En attente de validation ».
- Pied de page : « Document médical confidentiel · Remis au patient » et « Seuls les éléments confirmés figurent dans la version remise. Aucun brouillon n'est transmis. » · « 1 / 1 ».
- Fenêtre d'aperçu (920 px de large) : boutons « Imprimer · PDF », « Télécharger l'image », « Fermer », sans retour à la ligne.

---

## 5. Design tokens (espace Derm)

**Polices** : `DM Sans` 400/500/600/700/800 (interface) et `Manrope` 500 à 800 (titres d'accueil, A4). Google Fonts.

**Couleurs**

| Rôle | Hex |
|---|---|
| Fond de page | `#f3f6f3` |
| Barre latérale | `#0d2929` |
| Texte principal | `#17392c` / `#102c2c` |
| Texte secondaire | `#66766f` |
| Texte tertiaire | `#8a9894` |
| Vert action | `#2a6b4f` (boutons), `#1f5c48` (actif, foncé), `#0d746f` (CTA du haut) |
| Sarcelle marque | `#138b83`, `#11988f`, `#53d1c6`, `#57d8cf` |
| Teintes vertes | `#eef4e8` (actif), `#eaf2e5` (chip activée), `#e5eedd`, `#f3f7f1`, `#f8faf7` (champs), `#cfe0c4` |
| Bordures | `#e4e8e3`, `#eef1ec` (séparateurs), `#c9d8c0` (secondaire), `#9dc3a9` (chip activée) |
| Alerte / à compléter | `#b0652a` sur `#fbeee0` / `#fdf6ea`, bordure `#efd9b0` |
| Erreur / retard | `#9b3a28` sur `#fbe9e4` |
| Info | `#1d5f8f` sur `#e7f0fa` |
| Accent salle d'attente | `#cfe08a` |

Statuts patient (`STS`) : Sous traitement `#138c84` / `#e3f3ef` · Contrôle J+28 `#1d5f8f` / `#e7f0fa` · En retard `#9b3a28` / `#fbe9e4` · Nouveau `#5f706c` / `#f3f6f3`.

**Rayons** :
- cartes 12 px (accueil 18 px) ;
- boutons 4 px (CTA du haut 9 px) ;
- champs 4 px ;
- pastilles et chips 999 px ;
- blocs internes 8 px ;
- badges 3 px.

**Boutons** :
- principal : hauteur 38, padding 0 18, fond `#2a6b4f`, texte blanc 12 px ; désactivé : opacité .45, ou fond `#d5ddd9` avec texte `#8a9894` ;
- secondaire : fond blanc, bordure `#c9d8c0` ;
- lien : `#2a6b4f`, 600, 11 px.

**Champs** : hauteur 36, padding 0 10, fond `#f8faf7`, bordure `#e4e8e3`, rayon 4, texte 11.5 px. Étiquette au-dessus : 9.5 px, `#66766f`, gap 5.

**Cartes** : fond blanc, bordure `1px #e4e8e3`, rayon 12, padding 20×22, gap interne 14 à 16.

**Ombres** : barre d'enregistrement `0 10px 30px rgba(13,41,41,.1)` ; CTA `0 4px 12px` sarcelle léger.

**Icônes** : `lucide-react`, trait 1.8, 16 à 18 px (menu : grid, calendar, user, folder, activity, bar-chart, check, message-square, settings).

**Responsive** : le contenu passe à la ligne via flex-wrap et `minmax(0,1fr)`. Sous 640 px, l'A4 passe en largeur fluide.

---

## 6. État & données (à porter en back-end)

États clés de la maquette (`state` de `Component`) :
- **Navigation** : `active` (0 à 8, `'auto'`, `'nc'`), plus les sélections `ptSel`, `pdSel`, `mdSel`, `mdTab`, `agSel`, `msSel`, `suV`, `auTab`.
- **Historique** : la liste `NAVK` est sérialisée à chaque changement d'écran pour le bouton « ← Retour ». À reproduire avec l'historique wouter (`history.back()`), et non avec un lien vers l'accueil.
- **Nouvelle consultation** : `nc` = `{ step, maxStep, mode: 'existing' | 'new', code, appt, f: { name, age, phone, sex, chan }, consent, motif, reasons[], zones[], since, photos[3], anaState, waitAt, inAt, dxOk, fixing, dxFix, notes, rep: { motif, obs, concl, cat, meds[], suivi }, attest, pin, signed, signedAt, ch: { wa, mail, print }, sent }`.
- **Données créées** : `pdNew` (patients créés) et `ncFiles` (consultations remises, avec le document `doc`, utilisées par Dossiers et Suivis).
- **Paramètres** : `prm` (enregistrés) et `prmD` (brouillon), qui mettent à jour `CAB`.

Tables Drizzle suggérées :
- `patients` : code, nom, âge, sexe, téléphone, canal, consentement, date ;
- `appointments` ;
- `consultations` : étapes, motif, zones, photos, analyse, observations ;
- `reports` : champs du compte rendu, médicaments, suivi, signé le, code de vérification ;
- `followups` ;
- `clinic_settings` ;
- `team_members` : rôle et droits.

Endpoints suggérés : `POST /api/derm/consultations`, `PATCH …/:id/step`, `POST …/:id/sign` (vérifier le code à 4 chiffres côté serveur), `POST …/:id/deliver` (WhatsApp, email, impression), `GET /api/derm/reports/:id.pdf`.

**Rôles** : la secrétaire et l'infirmière ont accès aux étapes 1 à 3, à l'Agenda et aux Patients. Diagnostic, signature, Paramètres > Tarifs et portefeuille sont réservés au médecin.

---

## 7. Ce qui reste à faire (connu, non couvert par la maquette)

1. Questionnaire de l'étape 2 à compléter selon le parcours GlowScan Derm :
   - anamnèse : motif, durée, antécédents (diabète, grossesse, allergies, éclaircissants, asthme, chéloïdes) ;
   - examen : phototype IV, V ou VI, zones, lésions (macule, papule, pustule, nodule, comédon, plaque, squame, cicatrice/HPI, chéloïde) ;
   - 5 questions oui/non : démangeaisons, douleur, soleil sans protection, éclaircissants, antécédents familiaux.
2. Analyse Glow réelle : diagnostic différentiel en pourcentages, statut du dossier (Priorité haute / En suivi / Stable / Résolu), mention « Analyse indicative, calibrée sur les phototypes IV à VI ».
3. Cas « Reprenons cette photo » si une photo est floue ou sombre.
4. Vérifier le code de signature contre celui défini dans Paramètres. La maquette accepte n'importe quels 4 chiffres.
5. Faire apparaître le contrôle choisi dans l'Agenda (aujourd'hui il va seulement dans Suivis) et appliquer les horaires de Paramètres à l'Agenda.
6. Transcription de la dictée : hors périmètre pour le moment.

---

## 8. Fichiers

- `Derm Vue Ensemble.dc.html` : maquette complète et cliquable de l'espace médical (tous les écrans ci-dessus).
- `support.js` : moteur nécessaire pour ouvrir la maquette dans un navigateur. **Ne pas porter.**
- `img/glowscan-africa-dark.png` : logo de la barre latérale.
- `screenshots/` : captures à 1440 px de large, une par écran : `01-vue`, `02-agenda`, `03-patients`, `04-dossiers`, `05-suivis`, `06-activite`, `07-auto`, `08-messagerie`, `09-parametres`, `10-consultation` (étape 1). Elles servent de repère visuel ; en cas d'écart, la maquette `.dc.html` fait foi.
- Handoff précédent (appli patient, design system Organic, portail pro initial) : `../design_handoff_glowscan/README.md`.
