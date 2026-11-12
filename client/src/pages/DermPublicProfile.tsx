import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, ArrowRight, Check, Clock, FolderLock, ShieldCheck, Star } from "lucide-react";
import { ensureDermFonts } from "@/components/derm/tokens";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { PRIVACY_POLICY_VERSION } from "@/components/ConsentBanner";
import { SPECIALTY_LABEL } from "@shared/dermSpecialties";
import { OPERATORS, cmNational, opOf } from "@shared/phone";
import { PAY_METHODS, formatF } from "@shared/delivery";
import { resultStateOf } from "@shared/resultB2C";

// ════════════════════════════════════════════════════════════════════════
// Réserver (style de la nouvelle maquette B2C). Fusionne
// l'ancien profil public (/dr/:slug, indexé Google). Le dossier (photos, score,
// historique) part au médecin ; 3 questions en boutons ; opérateur détecté ;
// paiement BLOQUÉ jusqu'à la réponse du médecin, remboursement décidé
// automatiquement après 24 h sans réponse.
// ════════════════════════════════════════════════════════════════════════

type Profile = {
  id: number; slug: string; fullName: string; city: string | null; bio: string | null; specialties: string[];
  photoUrl: string | null; certified: boolean; available: boolean; price: number; rating: number; ratingsCount: number;
};

const QUESTIONS: { key: "duration" | "itching" | "lightener"; q: string; opts: string[] }[] = [
  { key: "duration", q: "Depuis quand ?", opts: ["< 1 mois", "1 à 3 mois", "+ de 3 mois"] },
  { key: "itching", q: "Ça démange ?", opts: ["Oui", "Non"] },
  { key: "lightener", q: "Vous avez utilisé un éclaircissant ?", opts: ["Oui", "Non", "Je ne sais pas"] },
];
const G = { dark: "#164034", text: "#17392c", muted: "#5f6f69", line: "#e3e8e2", sage: "#e7eedc", soft: "#f1f5ec", peach: "#f7e8dc", peachFg: "#7a3f1d", lime: "#cfe08a", red: "#9b3a28" };
const drName = (n: string) => (/^(dr|pr)\.?\s/i.test(n) ? n : `Dr ${n}`);
const initials = (n: string) => n.replace(/^(dr|pr)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

export default function DermPublicProfile() {
  const [, params] = useRoute("/dr/:slug");
  const slug = params?.slug || "";
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { data: scans } = useScans();
  const [d, setD] = useState<Profile | null>(null);
  const [responseHours, setResponseHours] = useState<number | null>(null);
  const [bookable, setBookable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ans, setAns] = useState<Record<string, string>>({});
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [provider, setProvider] = useState<"monetbil" | "cinetpay" | "simulated">("simulated");
  const [consultationId, setConsultationId] = useState<number | null>(null);
  const [stage, setStage] = useState<"form" | "manual" | "waiting" | "paid">("form");
  const [txn, setTxn] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { ensureDermFonts(); }, []);

  useSEO({
    title: d ? `${drName(d.fullName)} — Dermatologue ${d.city || ""} | GlowScan` : "Dermatologue | GlowScan",
    description: d ? `${d.bio || `Consultez ${drName(d.fullName)}, dermatologue à ${d.city || ""}.`} Consultation en ligne : ${formatF(d.price)}.` : "Profil dermatologue GlowScan.",
    canonical: `https://glow-scan.com/dr/${slug}`,
  });

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/public/dermatologues/${slug}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetch("/api/b2c/dermatologists").then((r) => r.json()).catch(() => null),
      fetch("/api/payments/config").then((r) => r.json()).catch(() => null),
    ]).then(([pub, list, cfg]) => {
      const p: Profile | null = pub?.dermatologue || null;
      setD(p);
      const inList = (list?.dermatologists || []).find((x: any) => x.slug === slug);
      setBookable(!!inList);
      setResponseHours(inList?.responseHours ?? null);
      if (cfg?.provider) setProvider(cfg.provider);
    }).finally(() => setLoading(false));
    return () => { if (poll.current) clearInterval(poll.current); };
  }, [slug]);

  const last: any = Array.isArray(scans) && scans.length ? scans[0] : null;
  const lastState = last ? resultStateOf(last.recommendations?._fullResult ?? { score: last.score, condition: last.condition }) : null;
  const op = opOf(phone);
  const phoneOk = !!cmNational(phone) && !!op;
  const answered = QUESTIONS.every((q) => ans[q.key]);
  const canPay = !!d && bookable && answered && phoneOk && consent && !busy;

  const startPayment = async () => {
    if (!d) return;
    setBusy(true); setErr("");
    try {
      let id = consultationId;
      if (!id) {
        const res = await fetch("/api/consultations", {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proAccountId: d.id, scanId: last?.id, condition: last?.condition, imageUrl: last?.imageUrl }),
        });
        const data = await res.json();
        if (res.status === 401) { setLocation("/auth"); return; }
        if (!res.ok) throw new Error(data?.message || "Consultation impossible");
        id = data.consultation.id as number;
        setConsultationId(id);
      }
      // Réponses aux 3 questions + consentement au partage du dossier + numéro.
      await fetch(`/api/consultations/${id}/context`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duration: ans.duration, itching: ans.itching, lightener: ans.lightener, products: `Éclaircissant utilisé : ${ans.lightener}`, consent: true, consentVersion: PRIVACY_POLICY_VERSION }),
      });
      await fetch(`/api/consultations/${id}/patient-phone`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: cmNational(phone) }),
      });
      if (provider === "simulated") { setStage("manual"); return; }
      // Paiement en ligne (Monetbil / CinetPay) puis suivi du statut.
      const res = await fetch(`/api/consultations/${id}/pay/init`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.alreadyPaid) { setStage("paid"); return; }
      if (!res.ok || !data.paymentUrl) throw new Error(data?.message || "Paiement impossible");
      window.open(data.paymentUrl, "_blank", "noopener,noreferrer");
      setStage("waiting");
      let elapsed = 0;
      poll.current = setInterval(async () => {
        elapsed += 3;
        try {
          const s = await (await fetch(`/api/consultations/${id}/pay/status`, { credentials: "include" })).json();
          if (s.status === "paid") { clearInterval(poll.current!); setStage("paid"); }
          else if (s.status === "failed") { clearInterval(poll.current!); setStage("form"); setErr("Paiement refusé. Vérifiez votre solde et réessayez."); }
        } catch { /* on réessaie au prochain tour */ }
        if (elapsed >= 180) clearInterval(poll.current!);
      }, 3000);
    } catch (e: any) {
      setErr(e?.message || "Erreur réseau. Réessayez.");
    } finally { setBusy(false); }
  };

  const submitTxn = async () => {
    if (!consultationId || txn.trim().length < 6) return;
    setBusy(true);
    try {
      await fetch(`/api/consultations/${consultationId}/payment-ref`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: txn.trim() }),
      });
      setStage("waiting");
    } catch { setErr("Erreur réseau. Réessayez."); } finally { setBusy(false); }
  };

  const pm = op === "mtn" ? PAY_METHODS.mtn : PAY_METHODS.orange;
  const btn = "w-full rounded-[12px] border-0 p-4 text-[15px] font-semibold text-white disabled:opacity-45";
  const input = "h-12 w-full rounded-[12px] border bg-white px-3.5 text-[15px] font-normal focus-visible:outline-none";
  const backBtn = (
    <div className="flex items-center gap-2.5">
      <button type="button" onClick={() => (window.history.length > 1 ? window.history.back() : setLocation("/dermatologues"))} aria-label="Retour" className="-ml-1 border-0 bg-transparent p-1" style={{ color: G.dark }}>
        <ArrowLeft size={20} strokeWidth={1.9} />
      </button>
      <span className="flex-1 text-[16px] font-semibold" style={{ color: G.text }}>Réserver une consultation</span>
    </div>
  );

  if (loading) {
    return (
      <div className="b2c-theme min-h-screen bg-organic-bg font-body">
        <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">{backBtn}<span className="text-[14px]" style={{ color: G.muted }}>Chargement du profil…</span></main>
      </div>
    );
  }
  if (!d) {
    return (
      <div className="b2c-theme min-h-screen bg-organic-bg font-body">
        <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
          {backBtn}
          <div className="flex flex-col items-start gap-3 rounded-[16px] border bg-white p-5" style={{ borderColor: G.line }}>
            <b className="text-[16px] font-semibold" style={{ color: G.text }}>Ce profil est introuvable.</b>
            <span className="text-[14px]" style={{ color: G.muted }}>Le lien est peut-être ancien. Choisissez un dermatologue dans la liste du réseau.</span>
            <button type="button" onClick={() => setLocation("/dermatologues")} className="rounded-[12px] border-0 px-5 py-3 text-[15px] font-semibold text-white" style={{ background: G.dark }}>Voir les dermatologues</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="b2c-theme min-h-screen bg-organic-bg font-body" style={{ color: G.text }}>
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        {backBtn}

        {/* Médecin */}
        <div className="flex flex-col gap-3 rounded-[18px] p-5 text-white" style={{ background: G.dark }}>
          <div className="flex items-center gap-3">
            {d.photoUrl
              ? <img src={d.photoUrl} alt="" className="h-16 w-16 flex-none rounded-[16px] object-cover" />
              : <span className="flex h-16 w-16 flex-none items-center justify-center rounded-[16px] text-[19px] font-bold" style={{ background: G.lime, color: G.dark }}>{initials(d.fullName)}</span>}
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <h1 className="m-0 text-[23px] leading-tight text-white">{drName(d.fullName)}</h1>
              <span className="flex items-center gap-1 text-[13px] opacity-85">
                Dermatologue{d.city ? ` · ${d.city}` : ""}
                {d.ratingsCount > 0 && <> · <Star size={12} strokeWidth={1.75} fill={G.lime} color={G.lime} /> {String(d.rating).replace(".", ",")} ({d.ratingsCount})</>}
              </span>
            </span>
          </div>
          <div className="flex items-baseline justify-between border-t pt-3" style={{ borderColor: "rgba(255,255,255,.15)" }}>
            <span className="text-[13px] opacity-85">Consultation en ligne</span>
            <b className="font-heading text-[22px] font-bold">{formatF(d.price)}</b>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {d.specialties.map((s) => SPECIALTY_LABEL[s] && <span key={s} className="rounded-pill px-3 py-1 text-[12.5px] font-semibold" style={{ background: G.sage, color: G.dark }}>{SPECIALTY_LABEL[s]}</span>)}
          {responseHours !== null && <span className="flex items-center gap-1 rounded-pill px-3 py-1 text-[12.5px] font-semibold" style={{ background: G.peach, color: G.peachFg }}><Clock size={12} strokeWidth={2} />Répond en {responseHours} h environ</span>}
        </div>
        {d.bio && <p className="m-0 text-[14.5px] leading-relaxed" style={{ color: G.muted }}>{d.bio}</p>}

        {!bookable ? (
          <div className="flex flex-col items-start gap-2 rounded-[16px] border bg-white p-4 text-[14px]" style={{ borderColor: G.line, color: G.muted }}>
            Pour l'instant, ce médecin ne prend pas de consultation en ligne.
            <button type="button" onClick={() => setLocation("/dermatologues")} className="border-0 bg-transparent p-0 text-[14px] font-semibold" style={{ color: G.dark }}>Voir les autres dermatologues →</button>
          </div>
        ) : !authLoading && !user ? (
          <div className="flex flex-col gap-3 rounded-[16px] p-4" style={{ background: G.sage }}>
            <span className="text-[14.5px]">Consultation en ligne : <b>{formatF(d.price)}</b>, prix fixé par le médecin.</span>
            <button type="button" onClick={() => setLocation("/auth")} className={btn} style={{ background: G.dark }}>Se connecter pour réserver</button>
          </div>
        ) : stage === "paid" ? (
          <div className="flex flex-col gap-3 rounded-[16px] p-4" style={{ background: G.sage, color: G.dark }}>
            <b className="flex items-center gap-2 text-[16px] font-semibold"><Check size={18} strokeWidth={2.4} />Paiement reçu</b>
            <span className="text-[14px] leading-relaxed">Il reste bloqué jusqu'à la réponse de {drName(d.fullName)}. Sans réponse sous 24 h, le remboursement est déclenché automatiquement.</span>
            <button type="button" onClick={() => setLocation(`/consultations?open=${consultationId}`)} className={btn} style={{ background: G.dark }}>Ouvrir la conversation</button>
          </div>
        ) : stage === "waiting" ? (
          <div className="flex flex-col gap-2.5 rounded-[16px] p-4" style={{ background: G.peach, color: G.peachFg }}>
            <b className="flex items-center gap-2 text-[16px] font-semibold"><Clock size={17} strokeWidth={2} />Paiement en cours de vérification</b>
            <span className="text-[14px] leading-relaxed">Vous serez prévenu dès qu'il est confirmé. La conversation s'ouvre alors dans Messages.</span>
            <button type="button" onClick={() => setLocation("/consultations")} className="self-start rounded-[10px] border-0 px-4 py-2.5 text-[14px] font-semibold text-white" style={{ background: G.dark }}>Aller à Messages</button>
          </div>
        ) : stage === "manual" ? (
          <div className="flex flex-col gap-3">
            <b className="text-[17px] font-semibold">Paiement Mobile Money</b>
            <div className="flex flex-col gap-1.5 rounded-[16px] p-4" style={{ background: G.sage, color: G.dark }}>
              <span className="text-[14px]">Envoyez <b>{formatF(d.price)}</b> par {pm.label} au :</span>
              <b className="font-heading text-[24px] font-bold">{pm.num}</b>
              <span className="text-[13px]" style={{ color: G.muted }}>Code {pm.ussd} · Référence : <b style={{ color: G.text }}>Consultation {consultationId}</b></span>
            </div>
            <label className="flex flex-col gap-1.5 text-[13.5px] font-semibold">ID de la transaction (dans le SMS de l'opérateur)
              <input value={txn} onChange={(e) => setTxn(e.target.value)} className={input} style={{ borderColor: G.line }} />
            </label>
            {err && <span className="text-[13.5px]" style={{ color: G.red }}>{err}</span>}
            <button type="button" onClick={submitTxn} disabled={busy || txn.trim().length < 6} className={btn} style={{ background: G.dark }}>J'ai payé</button>
          </div>
        ) : (
          <>
            {/* Dossier envoyé au médecin */}
            <div className="flex items-center gap-3 rounded-[16px] border bg-white p-3.5" style={{ borderColor: G.line }}>
              {last?.imageUrl
                ? <span className="h-12 w-12 flex-none rounded-[12px] bg-cover bg-center" style={{ backgroundImage: `url(${last.imageUrl})`, backgroundColor: G.sage }} />
                : <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[12px]" style={{ background: G.sage, color: G.dark }}><FolderLock size={20} strokeWidth={1.7} /></span>}
              <span className="flex flex-1 flex-col">
                <b className="text-[14.5px] font-semibold">Votre dossier pour le médecin</b>
                <span className="text-[12.5px]" style={{ color: G.muted }}>
                  {last ? `Photos, Glow Score${lastState !== "unusable" && typeof last.score === "number" ? ` ${last.score}` : ""} et historique` : "Aucune analyse : le médecin verra seulement vos réponses"}
                </span>
              </span>
            </div>

            <b className="mt-1 text-[17px] font-semibold">Trois questions rapides</b>
            {QUESTIONS.map((q) => (
              <div key={q.key} className="flex flex-col gap-2">
                <span className="text-[14px] font-semibold">{q.q}</span>
                <div className="flex flex-wrap gap-1.5">
                  {q.opts.map((o) => {
                    const on = ans[q.key] === o;
                    return <button key={o} type="button" onClick={() => setAns({ ...ans, [q.key]: o })} className="rounded-pill border px-4 py-2 text-[14px] font-semibold"
                      style={{ borderColor: on ? G.dark : G.line, background: on ? G.dark : "#fff", color: on ? "#fff" : G.text }}>{o}</button>;
                  })}
                </div>
              </div>
            ))}

            <label className="flex flex-col gap-1.5 text-[14px] font-semibold">Numéro Mobile Money
              <span className="relative">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="677 12 45 90" className={`${input} pr-28`} style={{ borderColor: G.line }} />
                {op && <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-pill px-2.5 py-[3px] text-[11px] font-bold" style={{ background: OPERATORS[op].bg, color: OPERATORS[op].fg }}>{OPERATORS[op].name}</span>}
              </span>
              {phone && !phoneOk && <span className="text-[12.5px] font-normal" style={{ color: G.peachFg }}>Numéro MTN ou Orange à 9 chiffres</span>}
            </label>

            <label className="flex items-start gap-2.5 rounded-[14px] border bg-white p-3.5 text-[14px] leading-snug" style={{ borderColor: consent ? G.dark : G.line }}>
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 flex-none" style={{ accentColor: G.dark }} />
              <span>J'accepte de partager mon dossier (photos, score, historique) avec {drName(d.fullName)}.</span>
            </label>

            <div className="flex items-start gap-2.5 rounded-[14px] p-3.5 text-[13.5px] leading-snug" style={{ background: G.sage, color: G.dark }}>
              <ShieldCheck size={18} strokeWidth={1.8} className="mt-0.5 flex-none" />
              <span>Votre paiement reste bloqué jusqu'à la réponse du médecin. Sans réponse sous 24 h, le remboursement est déclenché automatiquement.</span>
            </div>
            {err && <span className="text-[13.5px]" style={{ color: G.red }}>{err}</span>}
            <button type="button" onClick={startPayment} disabled={!canPay} className={`${btn} inline-flex items-center justify-center gap-2`} style={{ background: G.dark }}>
              {busy ? "Préparation…" : !answered ? "Répondez aux 3 questions" : !phoneOk ? "Indiquez votre numéro Mobile Money" : !consent ? "Cochez l'accord de partage" : <>Payer {formatF(d.price)} <ArrowRight size={17} /></>}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
