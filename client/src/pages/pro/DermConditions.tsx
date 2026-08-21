import { useEffect } from "react";
import { useLocation } from "wouter";

// ════════════════════════════════════════════════════════════════════════
// Conditions Générales d'Utilisation & Politique de Confidentialité — GlowScan DERM
// Le dermatologue (responsable de la plateforme) accepte ce document à l'inscription.
// Il couvre notamment son engagement à obtenir le consentement de ses patients et la
// réutilisation anonymisée des données par GlowScan. Version affichée : v1-2026-07.
// (À faire valider par un juriste avant usage définitif.)
// ════════════════════════════════════════════════════════════════════════

export const DERM_TERMS_VERSION = "v1-2026-07";

const INK = "#0F172A";
const BODY = "rgba(243,240,255,0.82)";
const MUTED = "#64748B";
const VIOLET = "#0369A1";
const CARD = "#F1F5F9";
const BORDER = "rgba(167,139,250,0.18)";

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: INK, margin: "0 0 8px" }}>
        <span style={{ color: VIOLET }}>{n}.</span> {title}
      </h2>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: BODY }}>{children}</div>
    </div>
  );
}

export default function DermConditions() {
  const [, setLocation] = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#F6FAFD", color: INK, padding: "0 0 60px" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, zIndex: 10, background: "rgba(13,10,14,0.92)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${BORDER}`, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => history.length > 1 ? history.back() : setLocation("/derm")}
          style={{ background: "#F1F5F9", border: "none", color: INK, borderRadius: 10, width: 34, height: 34, cursor: "pointer", fontSize: 16 }}>←</button>
        <div>
          <p style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>Conditions & Confidentialité</p>
          <p style={{ fontSize: 10, color: MUTED, margin: 0 }}>GlowScan DERM · {DERM_TERMS_VERSION}</p>
        </div>
      </div>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 18px 0" }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "16px 18px", marginBottom: 24 }}>
          <p style={{ fontSize: 12.5, lineHeight: 1.7, color: BODY, margin: 0 }}>
            Le présent document régit l'utilisation de la plateforme professionnelle <strong>GlowScan DERM</strong>
            {" "}par les dermatologues et leurs cabinets. En créant un compte, le praticien reconnaît l'avoir lu,
            compris et l'accepter dans son intégralité.
          </p>
        </div>

        <Section n="1" title="Définitions">
          <p><strong>GlowScan</strong> : l'éditeur de la plateforme. <strong>Praticien</strong> : le dermatologue titulaire du compte.
          {" "}<strong>Cabinet</strong> : la structure de soins du praticien. <strong>Patient</strong> : la personne examinée par le praticien.
          {" "}<strong>Données patient</strong> : photos cliniques, dossier clinique et diagnostics associés à un patient.</p>
        </Section>

        <Section n="2" title="Rôles et responsabilités">
          <p>Le <strong>praticien (et son cabinet) est le responsable de traitement</strong> des données de ses patients :
          il décide de leur collecte et en répond. <strong>GlowScan agit comme sous-traitant</strong> pour l'hébergement et le
          traitement technique, et comme éditeur de l'outil d'aide au diagnostic.</p>
        </Section>

        <Section n="3" title="Compte et éligibilité">
          <p>Le compte est réservé aux professionnels de santé habilités. Le praticien garantit l'exactitude des informations
          fournies (identité, numéro d'ordre) et la confidentialité de ses identifiants. Le numéro d'ordre peut faire l'objet
          d'une vérification.</p>
        </Section>

        <Section n="4" title="Données collectées">
          <p>Données du praticien (identité, cabinet, contact, facturation) et données des patients saisies par le praticien
          (photos cliniques, dossier clinique, diagnostics). Les images sont dépouillées de leurs métadonnées techniques
          (EXIF/GPS) lors de leur enregistrement.</p>
        </Section>

        <Section n="5" title="Consentement des patients — engagement du praticien">
          <p>Le praticien <strong>s'engage à recueillir, auprès de chaque patient, le consentement éclairé</strong> nécessaire :
          (a) à l'analyse de sa peau au moyen de la plateforme, et (b) à la <strong>réutilisation anonymisée</strong> de ses
          données à des fins de recherche et d'amélioration de l'intelligence artificielle. Le praticien informe le patient de
          ses droits et conserve la preuve de ce consentement. GlowScan met à disposition un modèle de formulaire de consentement.</p>
        </Section>

        <Section n="6" title="Finalités du traitement">
          <p>Les données sont traitées pour : assurer la consultation et l'aide au diagnostic ; générer les rapports ; améliorer
          la qualité et la sécurité du service ; et <strong>constituer un jeu de données anonymisé</strong> destiné à la recherche
          et au perfectionnement de l'IA sur les peaux à fort phototype.</p>
        </Section>

        <Section n="7" title="Anonymisation et réutilisation">
          <p>GlowScan peut <strong>réutiliser les données sous forme anonymisée</strong> (sans identité du patient ni du praticien,
          sans lien réversible) pour la recherche, l'amélioration de ses modèles et d'éventuelles <strong>licences à des tiers</strong>
          (laboratoires, instituts de recherche). Aucune donnée directement identifiante n'est partagée ni vendue.</p>
        </Section>

        <Section n="8" title="Propriété intellectuelle">
          <p>La plateforme, ses modèles et le <strong>jeu de données agrégé et anonymisé demeurent la propriété de GlowScan</strong>.
          Le praticien conserve la propriété du dossier médical de ses patients. Aucune licence n'est accordée au praticien sur
          le jeu de données agrégé.</p>
        </Section>

        <Section n="9" title="Sécurité et hébergement">
          <p>GlowScan met en œuvre des mesures techniques et organisationnelles raisonnables (chiffrement en transit, contrôle
          d'accès). Les données sont hébergées chez des prestataires d'infrastructure et un fournisseur d'IA agissant comme
          sous-traitants ultérieurs, tenus à des obligations de confidentialité.</p>
        </Section>

        <Section n="10" title="Conservation">
          <p>Les données sont conservées le temps nécessaire aux finalités ci-dessus et aux obligations légales du praticien.
          Les données anonymisées peuvent être conservées sans limitation, ne permettant plus l'identification.</p>
        </Section>

        <Section n="11" title="Droits des personnes">
          <p>Les patients disposent de droits d'accès, de rectification et d'effacement. Ces demandes s'exercent auprès du
          praticien, responsable de traitement, qui peut solliciter GlowScan pour leur mise en œuvre technique.</p>
        </Section>

        <Section n="12" title="Avertissement médical">
          <p>GlowScan est un <strong>outil d'aide au diagnostic</strong>. Il ne remplace pas l'examen clinique ni le jugement du
          praticien, qui demeure seul responsable du diagnostic et de la prise en charge.</p>
        </Section>

        <Section n="13" title="Abonnement et paiement">
          <p>L'accès peut être soumis à un abonnement selon les tarifs en vigueur. Les conditions financières sont présentées
          séparément dans l'espace du praticien.</p>
        </Section>

        <Section n="14" title="Résiliation">
          <p>Le praticien peut fermer son compte à tout moment. GlowScan peut suspendre un compte en cas de manquement aux
          présentes conditions, notamment en matière de consentement des patients.</p>
        </Section>

        <Section n="15" title="Modifications">
          <p>GlowScan peut faire évoluer ces conditions. La version en vigueur et sa date sont indiquées en tête. Les modifications
          substantielles sont notifiées au praticien.</p>
        </Section>

        <Section n="16" title="Droit applicable et contact">
          <p>Les présentes conditions sont régies par le droit applicable au lieu d'établissement de GlowScan. Contact :
          {" "}demiseessawe12@gmail.com.</p>
        </Section>

        <p style={{ fontSize: 10.5, color: MUTED, marginTop: 24, lineHeight: 1.6 }}>
          Version {DERM_TERMS_VERSION}. Ce document est fourni à titre de cadre général et doit être validé par un conseil
          juridique avant tout usage contractuel définitif.
        </p>
      </div>
    </div>
  );
}
