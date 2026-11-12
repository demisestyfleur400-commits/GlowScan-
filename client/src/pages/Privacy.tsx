import { Link } from "wouter";
import { GsTopBar } from "@/components/GsTopBar";
import { ArrowLeft, ShieldCheck, FileText, Globe, Trash2, Download, Mail, Lock } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";

const DS = {
  base: "#f8f8f6",
  surface: "#ffffff",
  text: "#17392c",
  body: "#3d4f48",
  muted: "#5f6f69",
  border: "#e3e8e2",
};
const ACCENT = "#164034";

export default function Privacy() {
  useSEO({
    title: "Politique de Confidentialité | GlowScan",
    description: "Politique de confidentialité de GlowScan. Vos données dermatologiques sont protégées et ne sont jamais vendues. Transparence totale sur leur usage.",
    canonical: "https://glow-scan.com/confidentialite",
  });

  return (
    <div className="b2c-theme min-h-screen pb-24" style={{ background: DS.base, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <GsTopBar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/profile">
          <button
            className="flex items-center gap-2 text-sm font-medium mb-6 active:scale-95 transition-all"
            style={{ color: ACCENT }}
            data-testid="link-back-profile"
          >
            <ArrowLeft className="w-4 h-4" /> Retour au profil
          </button>
        </Link>

        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "#e7eedc", border: "1px solid #cfdfc4" }}
          >
            <ShieldCheck className="w-6 h-6" style={{ color: ACCENT }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: DS.text, fontFamily: "Manrope, 'DM Sans', sans-serif" }} data-testid="text-privacy-title">
              Politique de confidentialité
            </h1>
            <p className="text-xs mt-0.5" style={{ color: DS.muted }}>Dernière mise à jour : 15 septembre 2026 · version 2026-09-15</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-6" style={{ color: DS.body }}>
          Chez <strong style={{ color: DS.text }}>GlowScan</strong>, votre vie privée compte. Cette page vous explique
          clairement quelles données nous collectons, pourquoi, et quels droits vous avez.
        </p>

        <Section icon={<FileText className="w-4 h-4" style={{ color: ACCENT }} />} title="1. Qui sommes-nous ?">
          <p>
            GlowScan est une application d'analyse dermatologique assistée par IA, créée et opérée depuis Douala, Cameroun,
            par <strong style={{ color: DS.text }}>Démise Essawe</strong>. Site :{" "}
            <a href="https://glow-scan.com" style={{ color: ACCENT }}>glow-scan.com</a>. Contact :{" "}
            <a href="mailto:demiseessawe12@gmail.com" style={{ color: ACCENT }}>demiseessawe12@gmail.com</a>
          </p>
        </Section>

        <Section icon={<FileText className="w-4 h-4" style={{ color: ACCENT }} />} title="2. Données collectées">
          <ul className="list-disc ml-5 space-y-1.5">
            <li><strong style={{ color: DS.text }}>Identité</strong> : prénom, email ou numéro de téléphone, mot de passe (haché bcrypt — jamais visible).</li>
            <li><strong style={{ color: DS.text }}>Photos de peau</strong> : images envoyées pour l'analyse. Elles sont <strong style={{ color: DS.text }}>conservées de façon sécurisée et à accès restreint</strong> le temps de votre suivi, et <strong style={{ color: DS.text }}>anonymisées</strong> (métadonnées EXIF/GPS retirées). Vous pouvez les supprimer à tout moment.</li>
            <li><strong style={{ color: DS.text }}>Informations médicales (intake)</strong> : âge, sexe, durée du problème, produits utilisés, allergies déclarées.</li>
            <li><strong style={{ color: DS.text }}>Diagnostics</strong> : type de peau, Glow Score, conditions détectées, recommandations.</li>
            <li><strong style={{ color: DS.text }}>Localisation approximative</strong> : pays / ville (jamais de position GPS précise).</li>
            <li><strong style={{ color: DS.text }}>Paiement</strong> : pour les consultations, le paiement passe par Mobile Money (Monetbil/CinetPay). <strong style={{ color: DS.text }}>Nous ne stockons aucun numéro de carte.</strong></li>
            <li><strong style={{ color: DS.text }}>Données d'utilisation</strong> : pages visitées, historique de scans.</li>
          </ul>
        </Section>

        <Section icon={<FileText className="w-4 h-4" style={{ color: ACCENT }} />} title="3. Utilisation des données">
          <ul className="list-disc ml-5 space-y-1.5">
            <li>Générer votre <strong style={{ color: DS.text }}>diagnostic cutané personnalisé</strong>.</li>
            <li>Vous recommander des routines et produits adaptés à votre peau.</li>
            <li>Suivre l'évolution de votre peau dans le temps.</li>
            <li>Améliorer le modèle IA GlowScan (données anonymisées uniquement).</li>
          </ul>
        </Section>

        <Section icon={<Globe className="w-4 h-4" style={{ color: ACCENT }} />} title="4. Partage & mesure d'audience">
          <p className="mb-3">
            Nous ne vendons <strong style={{ color: DS.text }}>jamais</strong> vos données personnelles.
            Vos <strong style={{ color: DS.text }}>photos et vos diagnostics ne sont jamais transmis à des fins publicitaires</strong>.
          </p>
          <div
            className="rounded-xl p-3 mb-3"
            style={{ background: "#f7e8dc", border: "1px solid #ecd2bd" }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: "#7a3f1d" }}>Prestataires IA (sous-traitants)</p>
            <p>
              Pour analyser votre peau, GlowScan s'appuie sur <strong style={{ color: DS.text }}>Google Gemini</strong> (analyse d'image par IA)
              et <strong style={{ color: DS.text }}>Groq</strong> (transcription vocale et traitement IA de secours). Ils traitent la
              donnée le temps nécessaire au service, sans autre usage. Aucun humain ne consulte vos photos en dehors d'une
              consultation que vous avez vous-même demandée avec un dermatologue.
            </p>
          </div>
          <div
            className="rounded-xl p-3 mb-3"
            style={{ background: "#f8f8f6", border: "1px solid #e3e8e2" }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: DS.text }}>Mesure d'audience & amélioration</p>
            <p>
              Pour comprendre comment l'app est utilisée et l'améliorer, et pour mesurer l'efficacité de nos actions de
              communication, nous utilisons <strong style={{ color: DS.text }}>Microsoft Clarity</strong> (statistiques d'usage
              et d'ergonomie — clics, navigation, de façon agrégée) et le <strong style={{ color: DS.text }}>pixel Meta / Facebook</strong>
              (mesure publicitaire). Ces outils reçoivent des données de navigation et d'interaction et déposent des cookies de
              mesure. En utilisant GlowScan, vous en acceptez l'usage ; vous pouvez vous y opposer via les réglages de votre navigateur.
            </p>
          </div>
          <div
            className="rounded-xl p-3"
            style={{ background: "#f8f8f6", border: "1px solid #e3e8e2" }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: DS.text }}>Hébergement (transparence)</p>
            <p>
              Vos données, <strong style={{ color: DS.text }}>y compris vos photos</strong>, sont hébergées sur
              <strong style={{ color: DS.text }}> Supabase (PostgreSQL)</strong> et <strong style={{ color: DS.text }}>Railway</strong>.
              Leurs serveurs peuvent être situés <strong style={{ color: DS.text }}>hors d'Afrique (Union Européenne ou États-Unis)</strong>.
              Les échanges sont chiffrés (HTTPS) et l'accès à la base est restreint.
            </p>
          </div>
        </Section>

        <Section icon={<Lock className="w-4 h-4" style={{ color: ACCENT }} />} title="5. Sécurité">
          <ul className="list-disc ml-5 space-y-1.5">
            <li>Connexion <strong style={{ color: DS.text }}>HTTPS</strong> chiffrée pour toutes les communications.</li>
            <li>Mots de passe hachés avec <strong style={{ color: DS.text }}>bcrypt</strong> — nous ne les voyons jamais en clair.</li>
            <li>Sessions sécurisées (cookie httpOnly) avec expiration automatique.</li>
            <li>Données stockées sur <strong style={{ color: DS.text }}>Railway + PostgreSQL</strong>, accès sécurisé et restreint.</li>
          </ul>
        </Section>

        <Section icon={<FileText className="w-4 h-4" style={{ color: ACCENT }} />} title="6. Durée de conservation">
          <ul className="list-disc ml-5 space-y-1.5">
            <li><strong style={{ color: DS.text }}>Compte actif</strong> : vos données sont conservées tant que votre compte existe.</li>
            <li><strong style={{ color: DS.text }}>Analyses anonymes</strong> (sans compte) : conservées au maximum <strong style={{ color: DS.text }}>24 mois</strong>, puis la photo est retirée (anonymisation renforcée).</li>
            <li><strong style={{ color: DS.text }}>Suppression de compte</strong> : toutes vos données sont effacées définitivement, immédiatement.</li>
            <li><strong style={{ color: DS.text }}>Données de recherche</strong> : seules les analyses pour lesquelles vous avez donné votre accord explicite alimentent, sous forme <strong style={{ color: DS.text }}>anonymisée</strong>, l'amélioration de l'IA.</li>
          </ul>
        </Section>

        <Section icon={<ShieldCheck className="w-4 h-4" style={{ color: ACCENT }} />} title="7. Vos droits">
          <p className="mb-3">Vous pouvez à tout moment :</p>
          <ul className="list-disc ml-5 space-y-1.5 mb-3">
            <li>
              <strong className="inline-flex items-center gap-1" style={{ color: DS.text }}>
                <Download className="w-3.5 h-3.5" /> Exporter vos données
              </strong>{" "}
              — depuis votre profil, au format JSON.
            </li>
            <li>
              <strong className="inline-flex items-center gap-1" style={{ color: DS.text }}>
                <Trash2 className="w-3.5 h-3.5" /> Demander la suppression de votre compte
              </strong>{" "}
              — tout est effacé définitivement. Envoyez un email à{" "}
              <a href="mailto:demiseessawe12@gmail.com" style={{ color: ACCENT }}>demiseessawe12@gmail.com</a>.
            </li>
            <li>Rectifier vos informations personnelles depuis les paramètres de votre profil.</li>
            <li>Retirer votre consentement à tout moment.</li>
          </ul>
        </Section>

        <Section icon={<Mail className="w-4 h-4" style={{ color: ACCENT }} />} title="8. Contact — protection des données">
          <p className="mb-1">
            Responsable de la protection des données : <strong style={{ color: DS.text }}>Démise Essawe</strong> (GlowScan Africa).
            Pour toute question, demande d'accès, de rectification, d'export ou de suppression :
          </p>
          <p>
            Email :{" "}
            <a href="mailto:demiseessawe12@gmail.com" style={{ color: ACCENT }} className="font-bold">
              demiseessawe12@gmail.com
            </a>
          </p>
          <p className="mt-1">
            Site :{" "}
            <a href="https://glow-scan.com" style={{ color: ACCENT }}>glow-scan.com</a>
          </p>
        </Section>

        <div
          className="mt-8 p-4 rounded-2xl"
          style={{ background: "#e7eedc", border: "1px solid #cfdfc4" }}
        >
          <p className="text-xs italic" style={{ color: DS.body }}>
            En créant votre compte et en utilisant GlowScan, vous acceptez l'ensemble de cette politique : un seul
            consentement couvre le traitement de vos données pour l'analyse, la mesure d'audience et les cookies décrits
            ci-dessus. Nous vous informerons de tout changement important par email ou via une notification dans l'app.
          </p>
        </div>
      </main>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section
      className="mb-5 rounded-2xl p-5"
      style={{ background: "#ffffff", border: "1px solid #e3e8e2" }}
      data-testid={`section-${title.split(".")[0]}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-[15px] font-bold" style={{ color: "#17392c", fontFamily: "Manrope, 'DM Sans', sans-serif" }}>{title}</h2>
      </div>
      <div className="text-[14px] leading-relaxed" style={{ color: "#3d4f48" }}>{children}</div>
    </section>
  );
}
