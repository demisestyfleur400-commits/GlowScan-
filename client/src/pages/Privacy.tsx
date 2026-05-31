import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, ShieldCheck, FileText, Globe, Trash2, Download, Mail, Lock } from "lucide-react";

const DS = {
  base: "#0d0a0e",
  surface: "#13101f",
  text: "#f3f0ff",
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
};

export default function Privacy() {
  return (
    <div className="min-h-screen pb-24" style={{ background: DS.base, fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/profile">
          <button
            className="flex items-center gap-2 text-sm font-medium mb-6 active:scale-95 transition-all"
            style={{ color: "#a78bfa" }}
            data-testid="link-back-profile"
          >
            <ArrowLeft className="w-4 h-4" /> Retour au profil
          </button>
        </Link>

        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}
          >
            <ShieldCheck className="w-6 h-6" style={{ color: "#a78bfa" }} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: DS.text }} data-testid="text-privacy-title">
              Politique de confidentialité
            </h1>
            <p className="text-xs mt-0.5" style={{ color: DS.muted }}>Dernière mise à jour : 31 mai 2026</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-6" style={{ color: DS.body }}>
          Chez <strong style={{ color: DS.text }}>GlowScan</strong>, ta vie privée compte. Cette page t'explique
          clairement quelles données nous collectons, pourquoi, et quels droits tu as.
        </p>

        <Section icon={<FileText className="w-4 h-4" style={{ color: "#a78bfa" }} />} title="1. Qui sommes-nous ?">
          <p>
            GlowScan est une application d'analyse dermatologique assistée par IA, créée et opérée depuis Douala, Cameroun,
            par <strong style={{ color: DS.text }}>Démise Essawe</strong>. Site :{" "}
            <a href="https://glow-scan.com" style={{ color: "#a78bfa" }}>glow-scan.com</a>. Contact :{" "}
            <a href="mailto:demiseessawe12@gmail.com" style={{ color: "#a78bfa" }}>demiseessawe12@gmail.com</a>
          </p>
        </Section>

        <Section icon={<FileText className="w-4 h-4" style={{ color: "#a78bfa" }} />} title="2. Données collectées">
          <ul className="list-disc ml-5 space-y-1.5">
            <li><strong style={{ color: DS.text }}>Identité</strong> : prénom, email ou numéro de téléphone, mot de passe (chiffré bcrypt — jamais visible).</li>
            <li><strong style={{ color: DS.text }}>Photos uploadées</strong> : images de visage ou de cheveux envoyées pour l'analyse. Elles sont traitées par l'IA puis <strong style={{ color: DS.text }}>non stockées de façon permanente</strong>.</li>
            <li><strong style={{ color: DS.text }}>Diagnostics</strong> : type de peau, Glow Score, conditions détectées, recommandations produits.</li>
            <li><strong style={{ color: DS.text }}>Données d'utilisation</strong> : pages visitées, historique de scans (anonymisé pour améliorer l'app).</li>
          </ul>
        </Section>

        <Section icon={<FileText className="w-4 h-4" style={{ color: "#a78bfa" }} />} title="3. Utilisation des données">
          <ul className="list-disc ml-5 space-y-1.5">
            <li>Générer ton <strong style={{ color: DS.text }}>diagnostic cutané personnalisé</strong>.</li>
            <li>Te recommander des routines et produits adaptés à ta peau.</li>
            <li>Suivre l'évolution de ta peau dans le temps.</li>
            <li>Améliorer le modèle IA GlowScan (données anonymisées uniquement).</li>
          </ul>
        </Section>

        <Section icon={<Globe className="w-4 h-4" style={{ color: "#a78bfa" }} />} title="4. Partage des données">
          <p className="mb-3">
            Nous ne vendons <strong style={{ color: DS.text }}>jamais</strong> tes données personnelles à des tiers.
            Aucune publicité ciblée n'est diffusée dans l'app.
          </p>
          <div
            className="rounded-xl p-3 mb-3"
            style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.2)" }}
          >
            <p className="text-xs font-bold mb-1" style={{ color: "#fbbf24" }}>⚠ Seule exception — Analyse IA</p>
            <p>
              Les photos que tu uploades sont transmises à <strong style={{ color: DS.text }}>Groq API</strong> (modèle Llama 4)
              pour générer l'analyse dermatologique. Groq ne conserve pas tes images au-delà du temps nécessaire au traitement.
              Aucun humain ne consulte tes photos. Elles ne sont <strong style={{ color: DS.text }}>pas stockées de façon permanente</strong> ni partagées avec d'autres tiers.
            </p>
          </div>
          <p>
            Infrastructure d'hébergement : <strong style={{ color: DS.text }}>Railway</strong> avec base de données
            PostgreSQL sécurisée.
          </p>
        </Section>

        <Section icon={<Lock className="w-4 h-4" style={{ color: "#a78bfa" }} />} title="5. Sécurité">
          <ul className="list-disc ml-5 space-y-1.5">
            <li>Connexion <strong style={{ color: DS.text }}>HTTPS</strong> chiffrée pour toutes les communications.</li>
            <li>Mots de passe hachés avec <strong style={{ color: DS.text }}>bcrypt</strong> — nous ne les voyons jamais en clair.</li>
            <li>Sessions sécurisées (cookie httpOnly) avec expiration automatique.</li>
            <li>Données stockées sur <strong style={{ color: DS.text }}>Railway + PostgreSQL</strong>, accès sécurisé et restreint.</li>
          </ul>
        </Section>

        <Section icon={<ShieldCheck className="w-4 h-4" style={{ color: "#a78bfa" }} />} title="6. Tes droits">
          <p className="mb-3">Tu peux à tout moment :</p>
          <ul className="list-disc ml-5 space-y-1.5 mb-3">
            <li>
              <strong className="inline-flex items-center gap-1" style={{ color: DS.text }}>
                <Download className="w-3.5 h-3.5" /> Exporter tes données
              </strong>{" "}
              — depuis ton profil, au format JSON.
            </li>
            <li>
              <strong className="inline-flex items-center gap-1" style={{ color: DS.text }}>
                <Trash2 className="w-3.5 h-3.5" /> Demander la suppression de ton compte
              </strong>{" "}
              — tout est effacé définitivement. Envoie un email à{" "}
              <a href="mailto:demiseessawe12@gmail.com" style={{ color: "#a78bfa" }}>demiseessawe12@gmail.com</a>.
            </li>
            <li>Rectifier tes informations personnelles depuis les paramètres de ton profil.</li>
            <li>Retirer ton consentement à tout moment.</li>
          </ul>
        </Section>

        <Section icon={<Mail className="w-4 h-4" style={{ color: "#a78bfa" }} />} title="7. Contact">
          <p className="mb-1">
            Pour toute question sur tes données ou demande de suppression :
          </p>
          <p>
            📧{" "}
            <a href="mailto:demiseessawe12@gmail.com" style={{ color: "#a78bfa" }} className="font-bold">
              demiseessawe12@gmail.com
            </a>
          </p>
          <p className="mt-1">
            🌐{" "}
            <a href="https://glow-scan.com" style={{ color: "#a78bfa" }}>glow-scan.com</a>
          </p>
        </Section>

        <div
          className="mt-8 p-4 rounded-2xl"
          style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)" }}
        >
          <p className="text-xs italic" style={{ color: DS.body }}>
            En utilisant GlowScan, tu acceptes cette politique. Nous t'informerons de tout changement important
            par email ou via une notification dans l'app.
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
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
      data-testid={`section-${title.split(".")[0]}`}
    >
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-sm font-extrabold" style={{ color: "#f3f0ff" }}>{title}</h2>
      </div>
      <div className="text-sm leading-relaxed" style={{ color: "rgba(200,185,255,0.65)" }}>{children}</div>
    </section>
  );
}
