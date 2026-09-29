import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { useProAccount } from "@/hooks/use-pro";
import { DermBrand } from "@/components/pro/DermAuthShell";
import { proHomeOf } from "@shared/proProfile";
import { SPLITS } from "@shared/splits";
import { PRO_SUBSCRIPTION_FCFA } from "@shared/premium";

// ════════════════════════════════════════════════════════════════════════
// Landing GlowScan Derm (refonte Organic) — maquette « Derm Landing ».
// glow-scan.com/derm. Libellés repris mot pour mot. Les parts affichées
// viennent de shared/splits.ts, le prix de shared/premium.ts.
// ════════════════════════════════════════════════════════════════════════

const SIGNUP = "/derm/inscription";
const LOGIN = "/derm/connexion";
const WA_SUPPORT = "https://wa.me/237674377959";

const PAINS = [
  ["30 min", "par compte rendu écrit à la main", "Temps pris sur vos consultations."],
  ["20 h", "et encore des questions WhatsApp", "Gratuitement, sans structure."],
  ["5 ans", "de carnets à feuilleter", "Pour retrouver un ancien dossier."],
] as const;

const FEATURES = [
  ["Dossier patient numérisé", "Créé et retrouvé en 10 secondes, photos incluses."],
  ["Diagnostic IA déjà proposé", "Calibré sur les phototypes IV à VI. Vous validez ou corrigez."],
  ["Compte rendu signé en 1 clic", "Pré-rempli, relu, signé avec votre code, envoyé sur WhatsApp ou par email."],
  ["Consultations en ligne", "Des patients de Douala à Kinshasa, payés sur Mobile Money."],
  ["Second avis entre confrères", "Un cas difficile, anonymisé, discuté dans l'appli."],
  ["Profil public sur Google", "Vos patients vous trouvent. Vos confrères vous rejoignent."],
] as const;

const FLOWS = {
  b2c: {
    label: "Patients GlowScan",
    note: "Tout se fait depuis votre téléphone. Sans déplacement, sans paperasse.",
    steps: [
      ["Le patient fait son analyse", "Photo de peau et Glow Score gratuits sur son téléphone."],
      ["GlowScan repère un cas sérieux", "Un score faible déclenche la recommandation de consulter."],
      ["Il choisit votre profil et paie", "Orange Money ou MTN MoMo. L'argent est bloqué jusqu'à votre réponse."],
      ["Vous répondez, le PDF part signé", `Le diagnostic IA est déjà proposé : vous validez, signez, ${SPLITS.consultation.pro} % pour vous.`],
    ],
  },
  relais: {
    label: "Relais de terrain",
    note: "Vous formez les soignants des zones sans dermatologue, à chaque cas.",
    steps: [
      ["Le patient est chez le relais", "Infirmier ou médecin d'un centre de santé éloigné."],
      ["Le relais propose son diagnostic", "Avant de voir l'IA, pour apprendre vraiment."],
      ["Vous validez ou corrigez", "Une phrase suffit : le signe qui aurait dû l'orienter."],
      ["Le relais progresse", "À 85 % d'accord sur 20 cas, il traite seul cette maladie."],
    ],
  },
} as const;

const NETWORK = [
  "Des cas réels envoyés par des relais de votre région",
  "Un avis simple ou urgent, payé sur Mobile Money",
  "Chaque validation enrichit l'atlas des peaux africaines",
  "Des programmes financés par des ONG et des districts",
];

const INCLUDED = [
  "Dossiers patients illimités",
  "Diagnostic IA indicatif",
  "Comptes rendus signés sur WhatsApp",
  "Consultations en ligne",
  "Avis confrères et relais",
  "Profil public sur Google",
];

const FAQS = [
  ["L'IA va-t-elle remplacer mon diagnostic ?", "Non. La suggestion de l'IA est marquée « indicative ». Seule votre validation apparaît dans le compte rendu signé de votre nom."],
  ["Comment mes patients me trouvent-ils ?", "Par votre profil public visible sur Google, et par les patients GlowScan dont le score est faible : ils sont orientés vers un dermatologue disponible dans leur région."],
  ["Qu'est-ce qu'un relais ?", "Un infirmier ou un médecin d'une zone sans dermatologue. Il vous envoie ses cas, vous validez, il apprend. Vous êtes payé à chaque avis."],
  ["Le second avis entre confrères, c'est quoi ?", "Un cas difficile ? Envoyez-le à un confrère du réseau. Seules la photo, l'âge et le sexe sont partagés, jamais le nom ni le téléphone. Vous restez le médecin traitant."],
  ["Comment suis-je payé ?", "Vos gains arrivent dans votre portefeuille GlowScan. Retrait vers Orange Money ou MTN MoMo à la demande ou chaque vendredi."],
  ["Que se passe-t-il après les 14 jours ?", "Vous choisissez de continuer. Aucun prélèvement automatique, aucune carte bancaire."],
] as const;

const wrap = "mx-auto max-w-[1160px] px-[clamp(16px,4vw,40px)]";
const kicker = "text-[12px] font-bold uppercase tracking-[.14em] text-organic-accent-700";
const h2 = "m-0 text-[clamp(28px,3.4vw,42px)] leading-[1.15] [text-wrap:balance]";
const btnPrimary = "inline-flex items-center justify-center rounded-pill bg-organic-accent px-[26px] py-3.5 text-[16px] font-bold text-organic-neutral-100 no-underline hover:bg-organic-accent-600";
const btnSecondary = "inline-flex items-center justify-center rounded-pill border border-organic-divider px-[22px] py-3.5 text-[16px] font-bold text-organic-text no-underline hover:bg-organic-text/[.07]";

export default function DermLanding() {
  useSEO({
    title: "GlowScan Derm — Vos patients viennent à vous, partout en Afrique",
    description: "GlowScan Derm numérise votre cabinet, rédige votre compte rendu en 3 minutes et l'envoie signé sur le WhatsApp du patient. 14 jours gratuits, sans carte bancaire.",
    canonical: "https://glow-scan.com/derm",
  });

  // Déjà connecté : on va directement à la page de son rôle.
  const [, setLocation] = useLocation();
  const { data: accData } = useProAccount();
  useEffect(() => {
    if (accData?.account) setLocation(proHomeOf((accData.account as any).profile, "doctor"));
    else if (accData?.user?.role === "secretary") setLocation(proHomeOf(null, "secretary"));
  }, [accData, setLocation]);

  const [flow, setFlow] = useState<keyof typeof FLOWS>("b2c");
  const [faq, setFaq] = useState(0);
  const F = FLOWS[flow];

  return (
    <div className="overflow-x-hidden bg-organic-bg font-body text-organic-text">
      <header className="sticky top-0 z-50 bg-organic-bg/90 backdrop-blur-[10px]">
        <div className={`${wrap} flex items-center justify-between gap-4 py-3.5`}>
          <Link href="/derm" className="text-organic-text no-underline"><DermBrand size={34} /></Link>
          <nav className="flex items-center gap-[clamp(8px,2vw,24px)]">
            <a href="#reseau" className="hidden whitespace-nowrap text-[14px] font-semibold text-organic-text no-underline sm:inline">Le réseau</a>
            <a href="#tarif" className="hidden whitespace-nowrap text-[14px] font-semibold text-organic-text no-underline sm:inline">Tarif</a>
            <Link href={LOGIN} className="whitespace-nowrap text-[14px] font-bold text-organic-text no-underline">Connexion</Link>
            <Link href={SIGNUP} className="inline-flex whitespace-nowrap rounded-pill bg-organic-accent px-4 py-2 text-[14px] font-bold text-organic-neutral-100 no-underline hover:bg-organic-accent-600">
              14 jours gratuits
            </Link>
          </nav>
        </div>
      </header>

      {/* Héros */}
      <section className={`${wrap} flex flex-wrap items-center gap-[clamp(28px,5vw,56px)] pb-[clamp(40px,6vw,72px)] pt-[clamp(32px,6vw,80px)]`}>
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
          <span className={kicker}>Dermatologie numérique · Afrique</span>
          <h1 className="m-0 text-[clamp(38px,5.2vw,64px)] leading-[1.05] [text-wrap:balance]">
            Vos patients viennent à vous. <span className="text-organic-accent">Votre expertise va partout en Afrique.</span>
          </h1>
          <p className="m-0 max-w-[540px] text-[17px] leading-relaxed text-organic-neutral-800">
            GlowScan Derm numérise votre cabinet, rédige votre compte rendu en 3 minutes et l'envoie signé sur le WhatsApp du patient. Vous consultez, GlowScan documente.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={SIGNUP} className={btnPrimary} data-testid="cta-hero">Créer mon profil gratuitement</Link>
            <a href="#comment" className={btnSecondary}>Comment ça marche</a>
          </div>
          <span className="text-[13px] text-organic-neutral-700">Sans carte bancaire · paiement Orange Money ou MTN MoMo</span>
        </div>
        <div className="flex min-w-0 flex-[1_1_380px] justify-center">
          <img src="/glowscan-derm-hero-full.webp" alt="GlowScan Africa" className="block h-auto w-full max-w-[560px] rounded-card" />
        </div>
      </section>

      {/* Constat */}
      <section className="bg-organic-surface py-[clamp(56px,8vw,104px)]">
        <div className={`${wrap} flex flex-col gap-[clamp(28px,4vw,44px)]`}>
          <div className="flex max-w-[640px] flex-col gap-2.5">
            <h2 className={h2}>Il est 19 h. Il vous reste 3 dossiers à écrire à la main.</h2>
            <p className="m-0 text-[16px] text-organic-neutral-800">Chaque jour, l'administratif vous prend le temps que vous devriez passer avec vos patients.</p>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-organic-3">
            {PAINS.map(([big, t, s]) => (
              <div key={big} className="flex flex-col gap-1.5 rounded-card bg-organic-accent-100 p-organic-6">
                <span className="font-heading text-[34px] leading-none text-organic-accent-800">{big}</span>
                <span className="text-[15px] font-bold">{t}</span>
                <span className="text-[13px] text-organic-neutral-800">{s}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fonctions */}
      <section className={`${wrap} flex flex-col gap-[clamp(28px,4vw,44px)] py-[clamp(56px,8vw,104px)]`}>
        <div className="flex flex-col items-center gap-2.5 text-center">
          <span className={kicker}>Ce que GlowScan Derm fait pour vous</span>
          <h2 className={h2}>Tout votre cabinet. Dans votre téléphone.</h2>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-organic-3">
          {FEATURES.map(([t, s], i) => (
            <div key={t} className="flex flex-col gap-2.5 rounded-card bg-organic-surface p-organic-6">
              <span className={`flex h-11 w-11 items-center justify-center rounded-full font-heading text-[18px] ${i % 2 ? "bg-organic-accent-2-200 text-organic-accent-2-800" : "bg-organic-accent-200 text-organic-accent-800"}`}>{i + 1}</span>
              <span className="font-heading text-[19px] leading-tight">{t}</span>
              <span className="text-[14px] leading-normal text-organic-neutral-800">{s}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Comment ça marche */}
      <section id="comment" className="scroll-mt-20 bg-organic-accent-2-100 py-[clamp(56px,8vw,104px)]">
        <div className={`${wrap} flex flex-col gap-[clamp(24px,4vw,40px)]`}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className={`${h2} text-organic-accent-2-900`}>Comment ça marche</h2>
            <div className="flex gap-1.5 rounded-pill bg-organic-surface p-1" role="tablist">
              {(Object.keys(FLOWS) as (keyof typeof FLOWS)[]).map((k) => (
                <button key={k} type="button" role="tab" aria-selected={flow === k} onClick={() => setFlow(k)}
                  className={`cursor-pointer rounded-pill border-0 px-4 py-2.5 font-body text-[13px] font-bold ${flow === k ? "bg-organic-accent-2-600 text-organic-bg" : "bg-transparent text-organic-text"}`}>
                  {FLOWS[k].label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-organic-3">
            {F.steps.map(([t, d], i) => (
              <div key={t} className="flex flex-col gap-2.5 rounded-card bg-organic-surface p-organic-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-organic-accent-2-600 font-heading text-[18px] text-organic-bg">{i + 1}</span>
                <span className="text-[16px] font-bold">{t}</span>
                <span className="text-[13px] leading-normal text-organic-neutral-800">{d}</span>
              </div>
            ))}
          </div>
          <p className="m-0 text-[16px] font-bold text-organic-accent-2-900">{F.note}</p>
        </div>
      </section>

      {/* Réseau */}
      <section id="reseau" className={`${wrap} flex scroll-mt-20 flex-wrap items-center gap-[clamp(28px,5vw,56px)] py-[clamp(56px,8vw,104px)]`}>
        <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-4">
          <span className={kicker}>Le réseau GlowScan Derm</span>
          <h2 className={h2}>Là où il n'y a pas de dermatologue, vous devenez le référent.</h2>
          <p className="m-0 text-[16px] leading-relaxed text-organic-neutral-800">
            Des infirmiers et des médecins de terrain vous envoient leurs cas. Vous validez ou corrigez, et votre correction devient leur leçon. Vous êtes payé pour chaque avis.
          </p>
          <div className="flex flex-col gap-2.5">
            {NETWORK.map((t) => (
              <div key={t} className="flex items-start gap-3">
                <span className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-organic-accent-2-600" />
                <span className="text-[15px] leading-normal">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-organic-3">
          <div className="flex flex-col gap-2.5 rounded-card bg-organic-surface p-organic-6">
            <span className="text-[10px] font-bold uppercase tracking-[.1em] text-organic-accent-700">Avis relais · CSI de Mokolo</span>
            <span className="text-[15px] font-bold">Plaques du cuir chevelu, garçon de 7 ans</span>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-pill bg-organic-bg px-3 py-1 text-[12px] font-semibold">Relais : pelade</span>
              <span className="rounded-pill bg-organic-bg px-3 py-1 text-[12px] font-semibold">IA : teigne 82 %</span>
            </div>
            <div className="rounded-card bg-organic-accent-2-100 px-4 py-3 text-[14px] leading-normal text-organic-accent-2-900">
              <b>Votre correction :</b> plaques rondes + squames + fratrie touchée = teigne jusqu'à preuve du contraire.
            </div>
          </div>
          <div className="grid grid-cols-3 gap-organic-2">
            {([
              [SPLITS.relay.derm, "pour vous", "bg-organic-accent-100"],
              [SPLITS.relay.relay, "pour le relais", "bg-organic-accent-2-100"],
              [SPLITS.relay.platform, "pour GlowScan", "bg-organic-surface"],
            ] as const).map(([pct, l, bg]) => (
              <div key={l} className={`flex flex-col items-center gap-1 rounded-card px-2 py-organic-4 ${bg}`}>
                <span className="font-heading text-[24px]">{pct} %</span>
                <span className="text-center text-[12px]">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-[clamp(16px,4vw,40px)] pb-[clamp(56px,8vw,104px)]">
        <div className="mx-auto flex max-w-[760px] flex-col gap-2.5 rounded-card bg-organic-accent-2-600 p-[clamp(32px,5vw,56px)] text-center text-organic-bg">
          <span className="font-heading text-[clamp(28px,3.6vw,44px)] leading-[1.15]">GlowScan ne diagnostique pas. GlowScan documente.</span>
          <span className="text-[17px] font-bold">Vous restez le médecin. Toujours.</span>
        </div>
      </section>

      {/* Tarif */}
      <section id="tarif" className="scroll-mt-20 bg-organic-surface py-[clamp(56px,8vw,104px)]">
        <div className={`${wrap} flex flex-wrap items-center gap-[clamp(28px,5vw,56px)]`}>
          <div className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5">
            <span className={kicker}>Un seul tarif</span>
            <h2 className={h2}>Votre abonnement se paie avec vos avis.</h2>
            <p className="m-0 text-[16px] leading-relaxed text-organic-neutral-800">
              Vos gains en consultations et en avis sont déduits automatiquement. Avec 6 avis par mois, vous ne payez plus rien.
            </p>
          </div>
          <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3.5 rounded-card bg-organic-bg p-[clamp(24px,4vw,40px)]">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-heading text-[48px] leading-none">{PRO_SUBSCRIPTION_FCFA.toLocaleString("fr-FR").replace(/ /g, " ")}</span>
              <span className="text-[16px] font-bold">FCFA / mois</span>
            </div>
            <span className="self-start rounded-pill bg-organic-accent-2-200 px-3 py-1 text-[12px] font-semibold text-organic-accent-2-900">14 jours gratuits · sans engagement</span>
            <div className="flex flex-col gap-2">
              {INCLUDED.map((t) => (
                <span key={t} className="flex gap-2.5 text-[14px] font-semibold"><span className="font-bold text-organic-accent-2-700">✓</span>{t}</span>
              ))}
            </div>
            <Link href={SIGNUP} className={`${btnPrimary} px-6`} data-testid="cta-pricing">Commencer 14 jours gratuits</Link>
            <span className="text-[12px] text-organic-neutral-700">Aucune carte bancaire. Paiement Orange Money ou MTN MoMo après l'essai.</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto flex max-w-[760px] flex-col gap-organic-4 px-[clamp(16px,4vw,40px)] py-[clamp(56px,8vw,96px)]">
        <h2 className="m-0 text-center text-[clamp(26px,3vw,36px)]">Questions fréquentes</h2>
        <div className="flex flex-col gap-organic-2">
          {FAQS.map(([q, a], i) => {
            const open = faq === i;
            return (
              <div key={q} className={`rounded-card ${open ? "bg-organic-surface" : "bg-transparent"}`}>
                <button type="button" onClick={() => setFaq(open ? -1 : i)} aria-expanded={open}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 border-0 bg-transparent px-5 py-4 text-left font-body text-[15px] font-bold text-organic-text">
                  {q}<span className="flex-none text-[20px] text-organic-accent-700">{open ? "−" : "+"}</span>
                </button>
                {open && <p className="m-0 px-5 pb-[18px] text-[14px] leading-relaxed text-organic-neutral-800">{a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-organic-accent px-[clamp(16px,4vw,40px)] py-[clamp(56px,8vw,104px)] text-center">
        <div className="mx-auto flex max-w-[760px] flex-col items-center gap-5">
          <h2 className="m-0 text-[clamp(28px,3.8vw,46px)] leading-[1.15] text-organic-bg [text-wrap:balance]">
            Consultez toute l'Afrique depuis votre cabinet.
          </h2>
          <Link href={SIGNUP} className="inline-flex rounded-pill bg-organic-bg px-[30px] py-[15px] text-[16px] font-bold text-organic-accent-800 no-underline" data-testid="cta-final">
            Créer mon profil — 14 jours gratuits
          </Link>
          <span className="text-[14px] text-organic-bg">Votre profil est en ligne en moins de 5 minutes.</span>
        </div>
      </section>

      <footer className={`${wrap} flex flex-col items-center gap-3.5 py-[clamp(32px,5vw,56px)] text-center`}>
        <span className="flex items-center gap-2.5">
          <img src="/glowscan-mark.png" alt="" width={28} height={28} className="rounded-full" />
          <span className="font-heading text-[17px]">GlowScan Derm</span>
        </span>
        <div className="flex flex-wrap justify-center gap-[18px] text-[13px]">
          <Link href={LOGIN} className="text-organic-accent-700">Connexion</Link>
          <a href={WA_SUPPORT} className="text-organic-accent-700">Support WhatsApp</a>
          <a href="https://glow-scan.com" className="text-organic-accent-700">glow-scan.com</a>
        </div>
        <p className="m-0 max-w-[560px] text-[12px] leading-relaxed text-organic-neutral-700">
          GlowScan Derm est un outil d'aide à la pratique médicale. Il ne remplace ni le diagnostic ni la responsabilité du praticien.
        </p>
        <p className="m-0 text-[12px] text-organic-neutral-700">© 2026 GlowScan Africa</p>
      </footer>
    </div>
  );
}
