import type { ReactNode } from "react";
import { CGU_VERSION } from "@shared/cgu";

// Texte des CGU GlowScan Africa, version 2026-11-v2 (Partie B fournie par le fondateur).
// Source unique : affichée sur /cgu (appli patient) et /derm/conditions (GlowScan Derm).
// Les champs entre crochets […] restent visibles : le fondateur les complètera.
// Balisage : **gras** ; une ligne « - » = puce ; « 1. » = liste numérotée.

export const CGU_UPDATED = "[date de publication]";

export const CGU_INTRO =
  "Les présentes Conditions générales d'utilisation (« CGU ») régissent l'accès et l'utilisation de GlowScan, de GlowScan Derm et de tous les services associés fournis par GlowScan Africa. En créant un compte ou en utilisant l'un de nos services, vous acceptez les présentes CGU et la Politique de confidentialité.";

export const CGU_SECTIONS: { n: number; title: string; body: string }[] = [
  { n: 1, title: "Éditeur du service", body: `Le Service GlowScan Africa est édité par Demise Essawe, personne physique, fondateur, en attendant l'immatriculation de la société GlowScan Africa, actuellement en cours. Ces informations seront mises à jour dès l'immatriculation.
Adresse : Douala, Cameroun [adresse complète]
E-mail : demiseessawe12@gmail.com — Téléphone : [numéro]
Responsable de la publication : Demise Essawe.` },
  { n: 2, title: "Définitions", body: `- **GlowScan** : l'application et les services destinés aux patients.
- **GlowScan Derm** : le logiciel destiné aux dermatologues et aux professionnels de santé partenaires.
- **Utilisateur** : toute personne utilisant GlowScan ou GlowScan Derm.
- **Patient** : toute personne utilisant GlowScan pour soumettre une photo de peau, demander une analyse ou une consultation.
- **Professionnel** : un dermatologue ou un professionnel de santé habilité utilisant GlowScan Derm.
- **Relais** : un professionnel de santé de premier recours (infirmier, médecin généraliste, sage-femme) qui transmet un cas à un dermatologue via GlowScan Derm.
- **Service** : l'ensemble des fonctionnalités fournies par GlowScan Africa.
- **Contenu** : textes, images, photos, rapports, analyses, interfaces, logiciels, modèles, prompts, bases de données et documents présents sur GlowScan.` },
  { n: 3, title: "Objet du service", body: `GlowScan est une infrastructure numérique qui facilite l'accès aux soins dermatologiques et accompagne les dermatologues dans leur pratique quotidienne. Le Service permet notamment :
- de créer un compte ;
- de soumettre une photo de peau et des informations déclaratives, et de recevoir une analyse assistée par intelligence artificielle, à titre d'orientation ;
- de réaliser une consultation dermatologique dans l'application avec un dermatologue partenaire (article 6) ;
- de souscrire à GlowScan Plus (article 7) et d'acheter des produits de soin (article 8) ;
- pour les Professionnels : de gérer leurs dossiers patients, leur agenda, leurs suivis, leurs comptes rendus et leurs ordonnances, et de recevoir des demandes de télé-expertise.
GlowScan Africa ne réalise aucun acte médical. Les actes médicaux (diagnostic, prescription, conduite à tenir) sont réalisés exclusivement par les Professionnels, sous leur seule responsabilité.` },
  { n: 4, title: "Avertissement médical", body: `L'analyse par IA ne constitue ni un diagnostic, ni une prescription, ni un acte médical. Elle est fournie à titre d'information et d'orientation, et doit être interprétée par un professionnel de santé, au regard de l'examen clinique et des antécédents du patient. GlowScan ne garantit pas l'absence d'erreur, d'omission, de faux positif ou de faux négatif.
En cas d'urgence, de douleur importante, de fièvre, de lésion qui évolue rapidement, de saignement, de malaise ou de tout symptôme grave, consultez immédiatement un professionnel de santé ou les services d'urgence. Ne retardez jamais une consultation sur la base d'un résultat GlowScan.` },
  { n: 5, title: "Compte, accès et âge minimum", body: `L'accès au Service nécessite un appareil compatible, une connexion internet, un compte et l'acceptation des CGU et de la Politique de confidentialité. L'Utilisateur fournit des informations exactes, garde ses identifiants confidentiels, ne partage pas son compte et signale sans délai tout accès non autorisé. Il est responsable des actions réalisées depuis son compte.
GlowScan est destiné aux personnes de 18 ans ou plus. Un mineur ne peut l'utiliser qu'avec l'accord et sous la supervision de son parent ou tuteur légal, qui soumet les photos et donne les consentements.
GlowScan Africa peut modifier, suspendre ou interrompre tout ou partie du Service pour des raisons techniques, de sécurité, de maintenance, d'évolution du produit ou d'obligation légale.` },
  { n: 6, title: "Consultation dermatologique dans l'application", body: `- **Qui consulte** : la consultation est réalisée par un dermatologue partenaire, professionnel indépendant, inscrit et vérifié. GlowScan Africa fournit l'outil, pas l'acte médical.
- **Déroulement** : l'IA prépare le dossier (photos, historique, hypothèses). Le dermatologue échange avec le patient dans l'application, valide ou corrige, et peut délivrer un compte rendu et une ordonnance signée. L'ordonnance est vérifiable en ligne.
- **Prix** : [5 000 FCFA] par consultation, payable par Mobile Money avant la transmission au dermatologue. Le dermatologue perçoit [80 %] du montant ; GlowScan Africa perçoit [20 %] au titre de la mise à disposition du service.
- **Remboursement** : si le dermatologue ne répond pas dans le délai affiché au moment du paiement, la consultation est remboursée selon les modalités affichées dans l'application. Une consultation réalisée n'est pas remboursable, sauf erreur technique avérée.
- **Limites** : la consultation à distance ne remplace pas un examen physique lorsqu'il est nécessaire. Le dermatologue peut orienter le patient vers une consultation en présentiel.` },
  { n: 7, title: "GlowScan Plus", body: `GlowScan Plus est un abonnement de [2 000 FCFA] par mois donnant accès aux fonctions de suivi et aux fonctions avancées décrites dans l'application. Il se renouvelle chaque mois jusqu'à résiliation. L'Utilisateur peut le résilier à tout moment depuis son espace ; la résiliation prend effet à la fin de la période en cours, sans remboursement de la période entamée.` },
  { n: 8, title: "Produits de soin", body: `GlowScan peut proposer des produits de soin à l'achat. Les prix, frais et délais de livraison sont affichés avant la commande. [Conditions de retour et de remboursement à préciser.] Les recommandations de produits sont générales et ne remplacent pas l'avis d'un professionnel de santé.` },
  { n: 9, title: "Abonnement GlowScan Derm (Professionnels)", body: `GlowScan Derm est proposé par abonnement de [10 000 FCFA] par mois, après une éventuelle période d'essai gratuite affichée lors de l'inscription. L'abonnement se renouvelle chaque mois jusqu'à résiliation. Les conditions particulières d'un programme pilote (gratuité temporaire, par exemple) priment pendant sa durée.` },
  { n: 10, title: "Obligations du Patient", body: `Le Patient soumet uniquement des photos le concernant ou concernant une personne dont il est le représentant légal, fournit des informations sincères, n'utilise pas GlowScan pour obtenir un diagnostic définitif sans professionnel de santé et respecte la loi.` },
  { n: 11, title: "Obligations et responsabilité du Professionnel et du Relais", body: `Le Professionnel et le Relais déclarent être habilités à exercer et disposer des qualifications et inscriptions requises ; ils respectent le secret médical et la déontologie, n'accèdent qu'aux dossiers qui leur sont confiés, informent le patient de l'usage de GlowScan et de ses limites, recueillent les consentements requis et sécurisent leurs identifiants et appareils.
Le Professionnel conserve l'entière responsabilité clinique, civile, pénale et déontologique de l'évaluation du patient, de l'interprétation des résultats de GlowScan, du diagnostic, des prescriptions, de l'orientation et des recommandations. Il ne se fie jamais exclusivement à un résultat de GlowScan.` },
  { n: 12, title: "Intelligence artificielle", body: `Les analyses sont produites à l'aide de modèles d'IA, qui peuvent être fournis par des prestataires (article 14) ou développés par GlowScan Africa. Les résultats peuvent être inexacts, incomplets ou inadaptés à une situation personnelle ; la décision finale appartient au professionnel de santé. GlowScan Africa peut faire évoluer ses modèles et règles d'analyse pour améliorer la qualité et la sécurité du Service.` },
  { n: 13, title: "Données personnelles et rôles", body: `GlowScan Africa traite les données conformément à la loi n° 2024/017 du 23 décembre 2024 relative à la protection des données à caractère personnel au Cameroun, et à la Politique de confidentialité. Les données de santé sont des données sensibles et bénéficient d'une protection renforcée. [Préciser ici le numéro de déclaration ou d'autorisation auprès de l'Autorité de protection des données à caractère personnel, s'il y a lieu.]
- **Appli patient (GlowScan)** : GlowScan Africa est responsable du traitement des données que le Patient lui confie.
- **Dossiers des cabinets (GlowScan Derm)** : pour les dossiers que le Professionnel crée et gère pour sa patientèle, le Professionnel est responsable du traitement et GlowScan Africa agit comme sous-traitant, sur ses instructions, selon l'Accord de traitement des données.
- **Amélioration de l'IA et recherche** : lorsque des données sont utilisées, avec consentement, pour entraîner ou évaluer des modèles, GlowScan Africa est responsable de ce traitement.` },
  { n: 14, title: "Prestataires et transferts hors du Cameroun", body: `Pour fonctionner, le Service s'appuie sur des prestataires techniques, dont : [Google (modèles d'IA Gemini)], [Supabase (base de données, serveurs situés en Irlande)], [Railway (hébergement de l'application)], [prestataires de paiement Mobile Money], [prestataires d'envoi WhatsApp, SMS et e-mail]. Certaines données, y compris des photos de peau, peuvent donc être traitées hors du Cameroun. GlowScan Africa encadre ces transferts conformément à la loi applicable, choisit des offres contractuelles qui interdisent au prestataire de réutiliser les données pour ses propres besoins, et tient à jour la liste des prestataires dans la Politique de confidentialité.` },
  { n: 15, title: "Consentements", body: `Les consentements suivants sont recueillis séparément :
- **Analyse et rapport** : nécessaire pour utiliser l'analyse.
- **Partage avec un dermatologue** : facultatif, nécessaire pour une consultation.
- **Recherche et IA** : facultatif (voir ci-dessous).
**Consentement Recherche et IA : pourquoi nous vous le demandons.** La plupart des outils d'IA dermatologique ont été conçus à partir de peaux claires et se trompent plus souvent sur les peaux noires. Avec votre accord, vos photos nous aident à corriger cela.
**Ce que nous faisons de vos photos, si vous acceptez :**
- nous les utilisons pour entraîner, évaluer et améliorer les modèles d'IA de GlowScan Africa, y compris des modèles que nous pourrions rendre publics ;
- nous pouvons les mettre à disposition, sous licence et sous contrat, de partenaires de confiance (chercheurs, universités, laboratoires, entreprises de santé), au Cameroun ou à l'étranger. Ces licences permettent de financer GlowScan et de garder le service accessible.
**Ce que nous ne faisons jamais :**
- transmettre votre nom, votre numéro de téléphone, votre e-mail ou votre adresse ;
- autoriser un partenaire à chercher à vous reconnaître, à vous contacter ou à revendre vos photos : chaque partenaire s'y engage par contrat ;
- utiliser vos photos pour de la publicité.
Une photo de peau peut parfois laisser reconnaître une personne (visage, signe particulier). Lorsque c'est possible, nous recadrons ou masquons ces éléments avant tout partage.
**Vos choix.** Ce consentement est facultatif ; le refuser ne change rien à votre accès au Service. Vous pouvez le retirer à tout moment depuis votre profil ou en écrivant à demiseessawe12@gmail.com : vos photos ne seront plus utilisées pour de nouveaux entraînements ni pour de nouveaux partages. Un modèle déjà entraîné ne contient pas vos photos et ne peut pas être « désentraîné ».` },
  { n: 16, title: "Propriété intellectuelle et licences libres", body: `GlowScan, GlowScan Derm, leur code source, interfaces, algorithmes, prompts, règles d'analyse, documentation, marques et logos sont la propriété de GlowScan Africa, sauf les éléments que GlowScan Africa choisit de publier sous licence libre (notamment certains modèles d'IA) : ceux-ci sont alors régis par leur propre licence. Les modèles d'IA de GlowScan Africa et la base de données constituée avec le consentement des patients lui appartiennent ; GlowScan Africa peut en concéder des licences, dans le respect de l'article 15.
GlowScan Africa accorde à l'Utilisateur une licence d'utilisation non exclusive, non transférable, révocable, limitée à l'usage personnel (Patient) ou professionnel autorisé (Professionnel). Il est interdit de copier, décompiler, extraire massivement les données ou les prompts, revendre le Service ou l'utiliser pour développer un service concurrent.` },
  { n: 17, title: "Contributions des Professionnels", body: `Lorsqu'un Professionnel valide, corrige ou annote une analyse, il autorise GlowScan Africa à utiliser cette contribution pour améliorer ses modèles et services, y compris des modèles publiés en open source, dans le respect des consentements des patients concernés.` },
  { n: 18, title: "Interdictions", body: `Il est interdit d'utiliser GlowScan à des fins illégales ou frauduleuses, d'importer des données fausses ou obtenues sans autorisation, d'accéder à un compte ou un dossier sans autorisation, de contourner les mesures de sécurité, d'introduire du code malveillant, de perturber la plateforme, d'utiliser des robots sans autorisation écrite ou de porter atteinte aux droits d'autrui.` },
  { n: 19, title: "Suspension et résiliation", body: `GlowScan Africa peut suspendre ou résilier un compte en cas de violation des CGU, de fraude, de tentative d'accès non autorisé, de fausse déclaration de qualification professionnelle ou de non-paiement. L'Utilisateur peut supprimer son compte à tout moment ; certaines données peuvent être conservées pendant la durée imposée par la loi, notamment pour les dossiers médicaux et la facturation.` },
  { n: 20, title: "Disponibilité et responsabilité", body: `Le Service est fourni « en l'état » et selon sa disponibilité. GlowScan Africa met en œuvre des moyens raisonnables pour en assurer l'accès et la sécurité, sans garantir un accès ininterrompu ni l'absence d'erreur. Dans la mesure permise par la loi, GlowScan Africa n'est pas responsable des décisions médicales prises par les Professionnels, des conséquences d'un retard de consultation, des erreurs dues à des informations inexactes de l'Utilisateur, ni des dommages indirects. Ces limitations ne s'appliquent pas en cas de faute lourde, de dol ou lorsque la loi l'interdit.` },
  { n: 21, title: "Modification des CGU", body: `GlowScan Africa peut modifier les CGU. Toute modification importante (IA, données de santé, responsabilité, fonctions payantes) est notifiée avant son entrée en vigueur et nécessite une nouvelle acceptation explicite. À défaut d'acceptation, l'Utilisateur peut fermer son compte.` },
  { n: 22, title: "Droit applicable et litiges", body: `Les CGU sont soumises au droit camerounais. Les parties recherchent d'abord une solution amiable ; à défaut, le litige est soumis aux juridictions compétentes du Cameroun.` },
  { n: 23, title: "Contact", body: `GlowScan Africa (Demise Essawe) — demiseessawe12@gmail.com — Douala, Cameroun [adresse complète] — [numéro]` },
];

export type CguTheme = { ink: string; body: string; accent: string; placeholder?: string };

/** Rend **gras** et garde les champs […] visibles (surlignés, à compléter). */
function inline(s: string, t: CguTheme): ReactNode[] {
  return s.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g).filter(Boolean).map((part, i) => {
    if (part.startsWith("**")) return <strong key={i} style={{ color: t.ink }}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("[")) return <mark key={i} style={{ background: t.placeholder || "#fff3c4", color: t.ink, padding: "0 2px", borderRadius: 3 }}>{part}</mark>;
    return <span key={i}>{part}</span>;
  });
}

/** Corps d'un article : paragraphes, puces « - » et listes « 1. ». */
export function CguBody({ body, theme }: { body: string; theme: CguTheme }) {
  const out: ReactNode[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.kind;
    out.push(<Tag key={out.length} style={{ margin: "6px 0 10px", paddingLeft: 22, listStyle: list.kind === "ul" ? "disc" : "decimal" }}>
      {list.items.map((it, i) => <li key={i} style={{ marginBottom: 4 }}>{inline(it, theme)}</li>)}
    </Tag>);
    list = null;
  };
  for (const line of body.split("\n")) {
    const ul = line.match(/^- (.*)$/), ol = line.match(/^\d+\. (.*)$/);
    if (ul || ol) {
      const kind = ul ? "ul" : "ol";
      if (!list || list.kind !== kind) { flush(); list = { kind, items: [] }; }
      list.items.push((ul || ol)![1]);
    } else { flush(); out.push(<p key={out.length} style={{ margin: "0 0 8px" }}>{inline(line, theme)}</p>); }
  }
  flush();
  return <>{out}</>;
}

export const CGU_VERSION_LABEL = `Dernière mise à jour : ${CGU_UPDATED} — Version ${CGU_VERSION}`;
