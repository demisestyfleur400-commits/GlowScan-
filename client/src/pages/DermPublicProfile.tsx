import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft, Star } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { PRIVACY_POLICY_VERSION } from "@/components/ConsentBanner";
import { SPECIALTY_LABEL } from "@shared/dermSpecialties";
import { OPERATORS, cmNational, opOf } from "@shared/phone";
import { PAY_METHODS, formatF } from "@shared/delivery";
import { resultStateOf } from "@shared/resultB2C";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Réserver (refonte Organic) — maquette « GlowScan App » › Réserver. Fusionne
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

  const chip = (on: boolean) => cn(
    "whitespace-nowrap rounded-pill border px-4 py-[9px] text-[14px] font-semibold",
    on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text",
  );
  const pm = op === "mtn" ? PAY_METHODS.mtn : PAY_METHODS.orange;

  if (loading) return <div className="min-h-screen bg-organic-bg" />;
  if (!d) {
    return (
      <div className="min-h-screen bg-organic-bg px-5 pt-10 text-center font-body text-organic-text">
        <p className="text-[15px]">Profil introuvable.</p>
        <button type="button" onClick={() => setLocation("/dermatologues")} className="rounded-pill border-0 bg-organic-accent px-5 py-3 font-bold text-organic-bg">Voir les dermatologues</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <button type="button" onClick={() => setLocation("/dermatologues")} className="flex items-center gap-1 self-start border-0 bg-transparent p-0 font-bold text-organic-accent-700">
          <ArrowLeft size={18} strokeWidth={1.75} /> Dermatologues
        </button>

        {/* Médecin */}
        <div className="flex items-center gap-3">
          {d.photoUrl
            ? <img src={d.photoUrl} alt="" className="h-14 w-14 flex-none rounded-pill object-cover" />
            : <span className="flex h-14 w-14 flex-none items-center justify-center rounded-pill bg-organic-accent-2-500 text-[17px] font-bold text-organic-bg">{initials(d.fullName)}</span>}
          <span className="flex flex-1 flex-col">
            <h1 className="m-0 text-[24px]">{drName(d.fullName)}</h1>
            <span className="flex items-center gap-1 text-[12px] text-organic-neutral-700">
              {d.city}
              {d.ratingsCount > 0 && <>{d.city ? " · " : ""}<Star size={12} strokeWidth={1.75} className="text-organic-accent-400" /> {String(d.rating).replace(".", ",")} ({d.ratingsCount})</>}
            </span>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {d.specialties.map((s) => SPECIALTY_LABEL[s] && <span key={s} className="rounded-pill bg-organic-neutral-100 px-2.5 py-[3px] text-[11px] text-organic-neutral-800">{SPECIALTY_LABEL[s]}</span>)}
          {responseHours !== null && <span className="rounded-pill bg-organic-accent-100 px-2.5 py-[3px] text-[11px] text-organic-accent-800">Répond en {responseHours} h environ</span>}
        </div>
        {d.bio && <p className="m-0 text-[14px] leading-normal">{d.bio}</p>}

        {!bookable ? (
          <div className="rounded-lg bg-organic-surface p-4 text-[14px]">Ce médecin ne prend pas de consultation en ligne pour le moment.</div>
        ) : !authLoading && !user ? (
          <div className="flex flex-col gap-3 rounded-lg bg-organic-surface p-4">
            <span className="text-[14px]">Consultation en ligne : <b>{formatF(d.price)}</b>, prix fixé par le médecin.</span>
            <button type="button" onClick={() => setLocation("/auth")} className="rounded-pill border-0 bg-organic-accent p-3.5 text-[15px] font-bold text-organic-neutral-100">Se connecter pour réserver</button>
          </div>
        ) : stage === "paid" ? (
          <div className="flex flex-col gap-3 rounded-lg bg-organic-accent-2-100 p-4 text-organic-accent-2-900">
            <span className="text-[16px] font-bold">Paiement reçu</span>
            <span className="text-[13px]">Il reste bloqué jusqu'à la réponse de {drName(d.fullName)}. Sans réponse sous 24 h, le remboursement est déclenché automatiquement.</span>
            <button type="button" onClick={() => setLocation(`/consultations?open=${consultationId}`)} className="rounded-pill border-0 bg-organic-accent-2-600 p-3.5 text-[15px] font-bold text-organic-bg">Ouvrir la conversation</button>
          </div>
        ) : stage === "waiting" ? (
          <div className="flex flex-col gap-2 rounded-lg bg-organic-surface p-4">
            <span className="text-[15px] font-bold">Paiement en cours de vérification</span>
            <span className="text-[13px]">Vous serez prévenu dès qu'il est confirmé. La conversation s'ouvre alors dans Messages.</span>
            <button type="button" onClick={() => setLocation("/consultations")} className="self-start rounded-pill border border-organic-divider bg-transparent px-4 py-2 text-[13px] font-bold">Aller à Messages</button>
          </div>
        ) : stage === "manual" ? (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 rounded-lg bg-organic-accent-100 p-4 text-organic-accent-900">
              <span className="text-[13px]">Envoyez <b>{formatF(d.price)}</b> par {pm.label} au :</span>
              <span className="font-heading text-[22px]">{pm.num}</span>
              <span className="text-[13px]">Code {pm.ussd} · Référence : <b>Consultation {consultationId}</b></span>
            </div>
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">ID de la transaction (dans le SMS de l'opérateur)
              <input value={txn} onChange={(e) => setTxn(e.target.value)} className="h-11 rounded-pill border border-organic-divider bg-organic-surface px-3.5 text-[15px] focus-visible:border-organic-accent focus-visible:outline-none" />
            </label>
            <button type="button" onClick={submitTxn} disabled={busy || txn.trim().length < 6} className="rounded-pill border-0 bg-organic-accent p-4 text-[16px] font-bold text-organic-neutral-100 disabled:opacity-45">J'ai payé</button>
          </div>
        ) : (
          <>
            {/* Dossier envoyé automatiquement */}
            <div className="flex items-center gap-3 rounded-lg bg-organic-surface p-3.5">
              {last?.imageUrl
                ? <span className="h-12 w-12 flex-none rounded-[14px] bg-cover bg-center" style={{ backgroundImage: `url(${last.imageUrl})`, backgroundColor: "#7a5234" }} />
                : <span className="h-12 w-12 flex-none rounded-[14px] bg-organic-accent-200" />}
              <span className="flex flex-1 flex-col">
                <span className="text-[14px] font-bold">Votre dossier part au médecin</span>
                <span className="text-[12px] text-organic-neutral-700">
                  {last ? `Photos, Glow Score${lastState !== "unusable" && typeof last.score === "number" ? ` ${last.score}` : ""} et historique` : "Aucune analyse : le médecin verra seulement vos réponses"}
                </span>
              </span>
            </div>

            {QUESTIONS.map((q) => (
              <div key={q.key} className="flex flex-col gap-2">
                <span className="text-[13px] font-bold">{q.q}</span>
                <div className="flex flex-wrap gap-1.5">
                  {q.opts.map((o) => <button key={o} type="button" className={chip(ans[q.key] === o)} onClick={() => setAns({ ...ans, [q.key]: o })}>{o}</button>)}
                </div>
              </div>
            ))}

            <label className="flex flex-col gap-1.5 text-[13px] font-bold">Numéro Mobile Money
              <span className="relative">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="677 12 45 90"
                  className="h-11 w-full rounded-pill border border-organic-divider bg-organic-surface px-3.5 pr-28 text-[15px] font-normal focus-visible:border-organic-accent focus-visible:outline-none" />
                {op && <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-pill px-2.5 py-[3px] text-[11px] font-bold" style={{ background: OPERATORS[op].bg, color: OPERATORS[op].fg }}>{OPERATORS[op].name}</span>}
              </span>
              {phone && !phoneOk && <span className="text-[12px] font-normal text-organic-accent-700">Numéro MTN ou Orange à 9 chiffres</span>}
            </label>

            <label className="flex items-start gap-2.5 text-[13px] leading-snug">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
              <span>Je partage mon dossier (photos, score, historique) avec {drName(d.fullName)}.</span>
            </label>

            <div className="rounded-lg bg-organic-accent-2-100 p-3.5 text-[13px] leading-snug text-organic-accent-2-900">
              Votre paiement reste bloqué jusqu'à la réponse du médecin. Sans réponse sous 24 h, le remboursement est déclenché automatiquement.
            </div>
            {err && <span className="text-[13px] text-organic-accent-700">{err}</span>}
            <button type="button" onClick={startPayment} disabled={!canPay}
              className="rounded-pill border-0 bg-organic-accent p-4 text-[16px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600 disabled:opacity-45">
              {busy ? "…" : !answered ? "Répondez aux 3 questions" : `Payer ${formatF(d.price)}`}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
