# Addendum : Confrères et Compte rendu (validé par le fondateur)

## `Derm Confreres.dc.html` : nouvel écran, lien « Confrères » dans le menu Réseau du portail
- **Messages entre dermatologues** : 2 types de conversation, « Cas complexe » ou « Discussion ».
  - Pour un cas complexe, le dossier anonymisé reste épinglé en haut.
  - Le confrère répond par un **avis structuré** : réponse, diagnostic retenu, diagnostics à écarter, conduite à tenir.
  - Un bouton « Intégrer à mon compte rendu » ajoute l'avis au rapport.
- **Envoyer un cas complexe**, en 4 étapes :
  1. choix du dossier ;
  2. aperçu de l'anonymisation ;
  3. question précise (10 caractères minimum) et choix du délai ;
  4. choix d'un confrère, ou « premier disponible », qui propose le cas aux 3 experts les mieux placés.
- **Anonymisation** : on partage les photos, l'âge, le sexe, le phototype, l'historique des traitements, la suggestion de l'IA et les notes d'examen. Le nom, le téléphone, l'email et l'adresse sont masqués. Le visage est flouté si la lésion n'est pas sur le visage.
- **Tarifs validés** :
  - avis simple : 3 000 F, réponse sous 48 h ;
  - avis urgent : 5 000 F, réponse sous 24 h ;
  - **80 % au confrère, 20 % à GlowScan** ;
  - débité du portefeuille du demandeur à la réponse, remboursé si le délai est dépassé.
- **Annuaire du réseau** : filtre par pays, expertise, nombre d'avis rendus, délai moyen et disponibilité.
- **Données** :
  - ajouter `peer_threads` (id, from_pro, to_pro, kind `case` | `chat`, case_id) et `peer_messages` ;
  - réutiliser `peer_reviews` pour l'avis structuré ;
  - mettre à jour la constante `SPLITS.peer = {peer:80, platform:20}`.

## `Derm Compte Rendu.dc.html` : 3 versions générées depuis la même saisie du médecin
- **1a Patient** : dans le chat et sur WhatsApp. Écrit à la patiente en mots simples (guide AoMRC « Please, write to me »).
- **1b Confrère ou relais** : la réponse à la question vient en premier. Suivent le diagnostic ou les diagnostics à écarter, puis le plan (norme BAD 2024), la qualité des photos et la leçon du cas.
- **1c Dossier du cabinet** : langage médical, traitement poursuivi, ajouté ou arrêté, suite « qui fait quoi, quand », photos et scores datés.
- **1d Ordonnance** : mentions ONMC obligatoires, à savoir formation sanitaire, identité et spécialité du médecin, adresse, cachet nominatif et n° ONMC. S'y ajoutent le poids du patient, la durée de chaque produit, les produits interdits, une référence et un QR code.
- **Nouvelle route publique** : `/verif/:ref`. Elle permet à un pharmacien de vérifier qu'une ordonnance est authentique. Elle affiche le médecin, la date et le statut, sans aucune donnée de santé.
