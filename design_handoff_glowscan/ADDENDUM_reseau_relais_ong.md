# ADDENDUM : réseau des relais, programmes ONG, réseau entre pays

À lire après `README.md`. Maquettes de référence :
- `Relais Mobile.dc.html` : écrans R1 à R7 (appli du relais, sur mobile).
- `Programmes ONG.dc.html` : écrans O1 à O5 (espace ONG, sur ordinateur) et D1 (réglages du dermatologue).
- Vidéos (comportement attendu, **pas à implémenter**) : `Parcours ONG.dc.html`, `Parcours Relais.dc.html`, `Parcours Cabinet.dc.html`.

Toutes ces fonctions marchent **avec ou sans ONG**, et **dans tous les pays du réseau**.

---

## 1. Invitation et vérification des relais (R1, R2, O2)

**Trois façons d'entrer :**
1. **Invité par un dermatologue** : un lien ou un QR code personnel (`/rejoindre?parrain=<derm_id>`). Le parrainage est automatique.
2. **Invité par une ONG** : import d'un fichier CSV ou Excel (nom, téléphone, centre), ou invitation par SMS depuis O2. Le parrainage est fait par le programme.
3. **Inscription libre** : aucun parrain. GlowScan appelle ou écrit au centre de santé.

**Deux validations sont obligatoires** avant le premier cas :
- **La carte professionnelle**, vérifiée par l'équipe GlowScan : photo du recto et selfie avec la carte. Le n° d'ordre est facultatif.
- **Un parrain** : dermatologue, ONG, ou appel de vérification par GlowScan.

Le **module photo** (R3) doit ensuite être validé : au moins 4 bonnes réponses sur 5.

**Statuts :** `invited` → `pending_card` → `pending_sponsor` → `pending_training` → `active` (ou `suspended`).

**Tables :**
- `relays` : id, user_id, profession (`nurse` | `gp` | `midwife`), health_center_id, country, status, card_front_url, card_selfie_url, order_number, sponsor_type (`derm` | `program` | `glowscan`), sponsor_id, verified_by, verified_at, training_passed_at.
- `invitations` : id, inviter_type, inviter_id, program_id, phone, token, sent_via (`sms` | `link` | `csv`), status, expires_at.
- `health_centers` : id, name, country, district, dhis2_org_unit_uid, lat, lng.
- `training_modules`, `training_attempts` : module 1 « photo », avec score et date. L'attestation est générée en PDF.

**Invitation par SMS** : réutiliser `server/whatsapp.ts` et le fournisseur SMS. Le lien expire après 14 jours. Une relance automatique part à J+2 et à J+7 (cron).

---

## 2. Discussion dermatologue ↔ relais par cas (R5)

- **Un fil de discussion par cas** : table `case_messages` (id, case_id, author_id, author_role, kind `text` | `photo` | `voice` | `system` | `request`, body, media_url, duration_s, transcript, sms_delivered_at, created_at).
- **Demandes structurées** : le dermatologue peut envoyer une demande du type `request` (« 1 photo de près », « précision : fièvre ? »). Tant qu'elle est ouverte, le délai de réponse du cas est mis en pause.
- **Messages vocaux** :
  - enregistrement dans le navigateur (`MediaRecorder`, en opus/webm), 60 s au maximum ;
  - stockage privé, comme les photos ;
  - **transcription automatique** par un service de reconnaissance vocale en français et en anglais. Elle est affichée sous le vocal et **marquée « transcription automatique »**.
- **SMS de secours** : si le relais n'a pas ouvert l'appli dans les 15 minutes, le message texte lui est envoyé par SMS. Sa **réponse par SMS** est rattachée au cas grâce au numéro et au code du cas (`#B-118`), via le webhook existant.
- **Fermeture** : le fil reste ouvert **7 jours après l'avis** pour les questions de suivi, puis passe en lecture seule.
- **Confidentialité** : aucune donnée du patient dans les SMS, seulement le code du cas.

---

## 3. Paiement de la télé-expertise sans ONG (R4, R6)

Au moment de l'envoi, le relais choisit **qui paie l'avis** :
1. **Mobile Money de la patiente** : un lien de paiement lui est envoyé par SMS. Le cas n'est transmis au dermatologue qu'une fois le paiement confirmé.
2. **Espèces** : le relais encaisse la patiente, et l'avis est **débité de son crédit prépayé**.
3. **Programme ONG** : débité du budget du programme, si le relais en fait partie.

**Crédit du relais :**
- rechargé par Mobile Money ;
- table `relay_credits` : relay_id, balance_reviews, puis un historique des mouvements dans `relay_credit_ledger`.

**Répartition, identique quel que soit le payeur :** 60 % au dermatologue, 20 % au relais, 20 % à GlowScan (constante `SPLITS.relay`).

**Plusieurs devises :**
- Les prix de référence sont en **F CFA** (XAF).
- L'affichage et le paiement se font dans la monnaie du relais (BIF, CDF, XOF…).
- Le taux est **figé au moment du paiement** et enregistré : colonnes `fx_rate` et `fx_currency` dans les tables de paiement et du grand livre.
- Il faut un **agrégateur Mobile Money multi-pays** (à choisir par le fondateur). Garder une interface `PaymentProvider` pour pouvoir en changer.

---

## 4. Envoi au bon dermatologue et réseau entre pays (D1, Parcours Relais)

**Choix du dermatologue** (`server/routing.ts`) :
1. Un dermatologue du **même pays**, disponible, qui parle la langue du cas.
2. Sinon, n'importe quel dermatologue du réseau **autorisé en télé-expertise**, dans la même langue, avec un délai estimé inférieur à la limite (24 h pour un cas simple, 2 h pour un urgent).
3. Sans prise en charge au bout de 25 % du délai : envoi au dermatologue suivant.
4. Délai dépassé : **remboursement automatique** (crédit relais, Mobile Money ou programme).

**Les deux modes, dans tous les pays :**
- **Consultation assistée (télé-expertise)** : le dermatologue conseille un soignant, et le soignant local reste responsable du patient. Elle est ouverte à tous les pays du réseau.
- **Consultation directe (appli patient)** : elle n'est proposée qu'avec des dermatologues **autorisés à exercer dans le pays du patient**.
  - Table `derm_licenses` : derm_id, country, kind (`home` | `authorization`), document_url, status, verified_at.
  - La liste des dermatologues de l'appli patient filtre sur `country = pays du patient`.

**Accord du patient pour l'envoi hors de son pays :**
- La case est à cocher par le relais, qui l'a demandé à voix haute au patient, ou par le patient lui-même dans l'appli.
- Cet accord est stocké dans `consents.cross_border`, avec la date et le pays de destination.
- Sans cet accord, l'envoi se fait seulement vers un dermatologue du pays.

**Langues** : l'interface et les messages sont en français et en anglais au départ. Tous les textes passent par un fichier de traduction.

**Réglages du dermatologue** (D1) : les pays où il exerce (avec justificatif), ses langues, et son nombre maximum d'avis du réseau par jour.

---

## 5. Programmes ONG (O1 à O5)

- **O1, création d'un programme** : pays et districts, dermatologues (choisis ou automatiques), maladies suivies, avis prépayés et règles.
  - Tables : `programs` (déjà prévue) + `program_districts`, `program_derms`, `program_diseases`.
- **O2, agents** : voir la section 1. Un agent peut appartenir à plusieurs programmes.
- **O3, budget** :
  - Table `program_budget_ledger` : recharges et consommation.
  - **Alerte** quand le solde passe sous un seuil choisi (20, 30 ou 50 %), par email et WhatsApp à la coordinatrice.
  - Une facture et un reçu en PDF à chaque recharge.
  - Les avis non consommés sont remboursables à la clôture du programme.
- **O4, orientations vers l'hôpital** :
  - Le dermatologue choisit « Orienter vers l'hôpital » dans son avis. Une **fiche de référence** est créée : code `REF-XXXX`, hôpital proposé selon la distance (table `hospitals` avec coordonnées GPS), rendez-vous facultatif.
  - La fiche est envoyée au patient par SMS et affichée chez le relais (R7).
  - **L'hôpital confirme l'arrivée sans compte GlowScan**, en scannant le QR code de la fiche : page publique `/ref/<code>` avec un code à 6 chiffres. Il peut aussi déposer son compte rendu en PDF.
  - Sans nouvelle à J+7 : SMS au patient et au relais. À J+10 : alerte à l'ONG.
  - Table `referrals` : id, case_id, hospital_id, code, appointment_at, status (`referred` | `arrived` | `report_received` | `no_show`), timestamps.
- **O5, connecteurs** : voir les sections 6 et 7.
- **Relecture qualité** : 1 avis sur 10, tiré au hasard, est relu par un second dermatologue, payé comme un avis simple. Le résultat est stocké dans `quality_reviews`.

---

## 6. Export DHIS2 (méthode)

DHIS2 est le logiciel national d'information sanitaire de nombreux pays, dont le Cameroun, le Burundi et la RDC. **On n'envoie que des chiffres agrégés, jamais de données individuelles.**

**Méthode :**
1. **Authentification** :
   - Utiliser un **jeton d'accès personnel** (PAT), créé par le point focal DHIS2 du district ou du ministère.
   - Les PAT sont recommandés à la place de l'authentification Basic, et ne fonctionnent qu'à partir de la version 2.38.1 de DHIS2.
   - En-tête : `Authorization: ApiToken d2pat_…`.
   - Stocker le jeton chiffré, **un jeton par programme ou pays**. Ne jamais l'afficher après sa saisie.
2. **Correspondance (mapping)** :
   - Le point focal fournit les identifiants (`uid`) du **data set**, des **data elements** (ex. « Cas de teigne »), des **category option combos** (sexe × tranche d'âge) et des **org units** (district ou centre).
   - Table `dhis2_mappings` : program_id, glowscan_key (ex. `disease:tinea`), data_element_uid, coc_uid.
   - Colonne `health_centers.dhis2_org_unit_uid`.
   - Écran « Voir la correspondance » dans O5 : tableau éditable, avec un bouton « Tester ».
3. **Format envoyé** :
   - Un **dataValueSet** en JSON : `{ dataSet, period: "202611", orgUnit, dataValues: [{ dataElement, categoryOptionCombo, value }] }`.
   - Envoi par `POST {baseUrl}/api/dataValueSets`.
4. **Toujours tester d'abord** : `?dryRun=true&importStrategy=CREATE_AND_UPDATE`, puis l'envoi réel. Lire le résumé de l'import (`importCount`, `conflicts`) et l'enregistrer dans `dhis2_exports` (programme, période, statut, nombre de valeurs, conflits, JSON envoyé).
5. **Automatisation** : un cron le **5 de chaque mois** envoie le mois précédent. Un bouton permet l'envoi manuel. En cas d'erreur, une alerte part à l'ONG.
6. **Solution de secours** : si l'instance n'est pas joignable ou refuse l'accès, proposer le **téléchargement du fichier** dataValueSet (JSON ou CSV). Le point focal l'importe lui-même avec l'application Import/Export de DHIS2.
7. **Tester sans risque** sur une instance de démonstration DHIS2 publique, avant toute connexion à une instance nationale.

**Données agrégées envoyées :**
- cas par maladie, sexe et tranche d'âge ;
- avis urgents ;
- orientations et arrivées confirmées ;
- agents formés.

**Règle de discrétion** : si une valeur est inférieure à 3 dans une cellule, elle est **masquée** (petit effectif, risque de reconnaître la personne).

---

## 7. Connexion avec Bogou et les autres plateformes

- **Aucune API publique connue pour Bogou.** Le fondateur doit **négocier un accord avec le RAFT**. En attendant :
  - **export d'un cas en paquet** : PDF du dossier minimum, photos et avis, envoyé à l'adresse du cercle Bogou ou téléchargé par le relais ;
  - **import** : un relais peut créer un cas GlowScan à partir d'un cas Bogou (saisie manuelle et photos).
- **API ouverte GlowScan** (`/api/v1/network`) pour tout partenaire (réseau de télémédecine, hôpital, ministère) :
  - `POST /cases` (reçoit un cas), `GET /cases/:id/opinion` (récupère l'avis), webhooks `case.answered` et `referral.arrived`.
  - Authentification par clé partenaire, journal d'accès et limite du nombre d'appels.
  - Un seul format de cas, documenté en OpenAPI.

---

## 8. Hors ligne et réseau faible (R4, R5)

- **Brouillon local** : le cas est enregistré sur le téléphone (IndexedDB, dans la PWA existante) et **envoyé automatiquement** quand le réseau revient (service worker, synchronisation en arrière-plan). Le message « cas enregistré, envoi automatique » s'affiche.
- **Contrôle photo sur le téléphone, avant l'envoi** : flou (variance du Laplacien), luminosité, taille minimale. Une photo refusée affiche une consigne claire.
- **Compression** : 1600 px au maximum sur le grand côté, en JPEG à qualité 0,8, soit environ 80 à 150 Ko par photo.
- **SMS** : voir la section 2.

---

## 9. Plan d'implémentation (après les étapes 1 à 7 du README)

1. Invitation et vérification des relais, module photo, puis l'écran de validation des cartes pour l'admin GlowScan.
2. Discussion par cas : texte et photos, puis vocaux et transcription, puis SMS de secours.
3. Paiement sans ONG (crédit du relais, lien Mobile Money patient) et affichage en plusieurs devises.
4. Choix automatique du dermatologue entre pays, `derm_licenses`, accord pour l'envoi hors du pays, remboursement en cas de délai dépassé.
5. Programmes ONG O1 à O4.
6. DHIS2 : correspondance, test à blanc, cron, fichier de secours.
7. API partenaires, export et import au format Bogou.
8. Hors ligne complet (PWA).

Chaque étape passe par `npm run check`. Avant de commencer, montre au fondateur la liste des fichiers que tu vas modifier.

**À faire valider par un juriste avant d'ouvrir un pays :** l'exercice de la télémédecine, l'envoi de données de santé hors du pays et la conservation des messages vocaux.
