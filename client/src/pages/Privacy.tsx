import { Link } from "wouter";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, ShieldCheck, FileText, Globe, Trash2, Download, Mail, Lock } from "lucide-react";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-secondary/30">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
        <Link href="/profile">
          <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-pink-600 mb-6" data-testid="link-back-profile">
            <ArrowLeft className="w-4 h-4" /> Retour au profil
          </button>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900" data-testid="text-privacy-title">Politique de confidentialité</h1>
            <p className="text-xs text-gray-500">Dernière mise à jour : 30 avril 2026</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
          Chez <strong>GlowScan</strong>, ta vie privée compte. Cette page t'explique en français simple
          quelles données nous collectons, pourquoi, et quels droits tu as. Conforme au <strong>RGPD</strong> (UE)
          et à la loi camerounaise n° 2010-012 du 21 décembre 2010.
        </p>

        <Section icon={<FileText className="w-5 h-5 text-pink-600" />} title="1. Qui sommes-nous ?">
          <p>
            GlowScan est une application d'analyse dermatologique assistée par IA, opérée depuis le Cameroun.
            Pour toute question, contacte-nous : <a href="mailto:contact@glowscan.app" className="text-pink-600 underline">contact@glowscan.app</a>.
          </p>
        </Section>

        <Section icon={<FileText className="w-5 h-5 text-pink-600" />} title="2. Quelles données nous collectons">
          <ul className="list-disc ml-5 space-y-1.5">
            <li><strong>Compte</strong> : email, prénom, mot de passe (chiffré avec bcrypt).</li>
            <li><strong>Photos</strong> : les images que tu téléverses pour analyse (visage, corps, cheveux).</li>
            <li><strong>Diagnostics</strong> : type de peau, score, conditions détectées, recommandations.</li>
            <li><strong>Activité</strong> : historique de scans, routines, journal bien-être, points de fidélité.</li>
            <li><strong>Commandes</strong> : nom, téléphone, adresse de livraison (uniquement quand tu commandes via WhatsApp).</li>
            <li><strong>Données techniques</strong> : pages visitées (anonymisées), pour améliorer l'app.</li>
          </ul>
        </Section>

        <Section icon={<FileText className="w-5 h-5 text-pink-600" />} title="3. Pourquoi nous les collectons">
          <ul className="list-disc ml-5 space-y-1.5">
            <li>Te fournir une analyse dermatologique personnalisée.</li>
            <li>Te recommander des produits adaptés à ta peau.</li>
            <li>Te permettre de suivre l'évolution de ta peau dans le temps.</li>
            <li>Faciliter tes commandes auprès de nos partenaires (pharmacies, marques).</li>
            <li>Améliorer l'app (statistiques anonymisées).</li>
          </ul>
        </Section>

        <Section icon={<Globe className="w-5 h-5 text-pink-600" />} title="4. Où vont tes données">
          <p className="mb-2">
            Nos serveurs sont hébergés via <strong>Replit</strong>. La base de données PostgreSQL stocke ton compte,
            tes diagnostics et ton historique.
          </p>
          <p className="mb-2">
            <strong className="text-pink-700">Important — Analyse IA :</strong> les photos que tu téléverses sont envoyées
            à <strong>OpenAI</strong> (États-Unis) pour produire l'analyse dermatologique. OpenAI ne conserve pas tes images
            au-delà du temps nécessaire à l'analyse (selon leur politique). Aucun humain ne consulte tes photos.
          </p>
          <p>
            Nous ne vendons <strong>jamais</strong> tes données à des tiers. Aucune publicité ciblée n'est diffusée dans l'app.
          </p>
        </Section>

        <Section icon={<FileText className="w-5 h-5 text-pink-600" />} title="5. Combien de temps">
          <p>
            Tes données sont conservées tant que ton compte est actif. Si tu supprimes ton compte (voir §7), <strong>tout est effacé immédiatement</strong>.
            Les statistiques anonymisées (sans aucun identifiant rattaché à toi) peuvent être conservées pour le suivi de l'app.
          </p>
        </Section>

        <Section icon={<Lock className="w-5 h-5 text-pink-600" />} title="6. Comment nous protégeons tes données">
          <ul className="list-disc ml-5 space-y-1.5">
            <li>Connexion HTTPS chiffrée pour toutes les communications.</li>
            <li>Mots de passe stockés chiffrés (bcrypt) — nous ne les voyons jamais en clair.</li>
            <li>Sessions sécurisées (cookie httpOnly) avec expiration automatique.</li>
            <li>Accès admin restreint et authentifié.</li>
          </ul>
        </Section>

        <Section icon={<ShieldCheck className="w-5 h-5 text-pink-600" />} title="7. Tes droits">
          <p className="mb-3">Tu peux à tout moment, depuis ton profil :</p>
          <ul className="list-disc ml-5 space-y-1.5 mb-3">
            <li><strong className="inline-flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Exporter tes données</strong> — au format JSON (droit d'accès, art. 15 RGPD).</li>
            <li><strong className="inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Supprimer ton compte</strong> — efface définitivement tout (droit à l'oubli, art. 17 RGPD).</li>
            <li>Modifier ton profil (rectification, art. 16 RGPD).</li>
            <li>Retirer ton consentement à tout moment (art. 7 RGPD).</li>
          </ul>
          <p>
            Pour toute demande complémentaire (opposition, limitation, portabilité), écris-nous à{" "}
            <a href="mailto:contact@glowscan.app" className="text-pink-600 underline">contact@glowscan.app</a>.
          </p>
        </Section>

        <Section icon={<Mail className="w-5 h-5 text-pink-600" />} title="8. Contact & réclamations">
          <p className="mb-2">
            Email : <a href="mailto:contact@glowscan.app" className="text-pink-600 underline">contact@glowscan.app</a>
          </p>
          <p>
            Si tu estimes que tes droits ne sont pas respectés, tu peux saisir l'autorité de protection des données
            de ton pays (CNIL en France, ANTIC au Cameroun, etc.).
          </p>
        </Section>

        <div className="mt-8 p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100">
          <p className="text-xs text-gray-600 italic">
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
    <section className="mb-6 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm" data-testid={`section-${title.split(".")[0]}`}>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-base font-black text-gray-900">{title}</h2>
      </div>
      <div className="text-sm text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}
