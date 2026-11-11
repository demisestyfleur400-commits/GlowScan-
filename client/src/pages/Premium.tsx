import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Star, ScanFace, ScanBarcode, MessageCircle, Images, HeartHandshake } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { PREMIUM_PERKS, PREMIUM_PLANS, type PremiumPlan } from "@shared/premium";
import { OPERATORS, cmNational, opOf } from "@shared/phone";
import { PAY_METHODS, formatF } from "@shared/delivery";
import { ensureDermFonts } from "@/components/derm/tokens";

// ════════════════════════════════════════════════════════════════════════
// GlowScan Plus (nouvelle maquette B2C). 500 F / semaine ou 2 000 F / mois :
// le navigateur n'envoie QUE la formule, le serveur fixe le montant et la
// durée. Les consultations restent payées à part (chaque médecin fixe son
// prix). Activation par l'admin après vérification de l'ID de transaction.
// ════════════════════════════════════════════════════════════════════════

const G = { dark: "#164034", text: "#17392c", muted: "#5f6f69", line: "#e3e8e2", sage: "#e7eedc", soft: "#f1f5ec", lime: "#cfe08a" };
const PERK_ICON = [ScanFace, ScanBarcode, MessageCircle, Images, HeartHandshake];

export default function Premium() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const { isPremium } = useSubscription();
  const { data: sub } = useQuery<{ subscription?: { expiresAt?: string } | null }>({ queryKey: ["/api/subscription/me"], enabled: !!user });
  const { data: statusData } = useQuery<{ request: { reference: string; status: string; amount?: number } | null }>({
    queryKey: ["/api/premium/status"], enabled: !!user && !isPremium, refetchInterval: 15_000,
  });
  const [plan, setPlan] = useState<PremiumPlan>("month");
  const [paying, setPaying] = useState(false);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerWaUrl, setOwnerWaUrl] = useState<string | null>(null);

  useEffect(() => { ensureDermFonts(); }, []);
  useEffect(() => { if (!authLoading && !user) setLocation("/auth"); }, [authLoading, user, setLocation]);

  const op = opOf(phone);
  const pm = op === "mtn" ? PAY_METHODS.mtn : PAY_METHODS.orange;
  const pending = statusData?.request?.status === "pending" ? statusData.request : null;
  const price = PREMIUM_PLANS[plan].amountFcfa;
  const per = plan === "week" ? "semaine" : "mois";

  const submit = async () => {
    if (!cmNational(phone) || !op) { toast({ title: "Numéro requis", description: "Le numéro MTN ou Orange qui a payé (9 chiffres).", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/premium/request", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, method: op === "mtn" ? "mtn_momo" : "orange_money", phone: cmNational(phone) }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.message);
      setOwnerWaUrl(d.ownerWaUrl || null);
      if (typeof (window as any).fbq === "function") (window as any).fbq("track", "InitiateCheckout", { value: price, currency: "XAF", content_name: `GlowScan Premium ${plan}` });
    } catch (e: any) {
      toast({ title: "Demande non envoyée", description: e?.message || "Réessayez dans un instant.", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const back = () => (paying && !ownerWaUrl ? setPaying(false) : window.history.length > 1 ? window.history.back() : setLocation("/profile"));
  const btn = "inline-flex items-center justify-center gap-2 rounded-[12px] border-0 p-4 text-[15px] font-semibold text-white disabled:opacity-45";

  const perks = (
    <div className="flex flex-col gap-3.5 rounded-[16px] border bg-white p-4" style={{ borderColor: G.line }}>
      {PREMIUM_PERKS.map((t, i) => {
        const I = PERK_ICON[i] || Check;
        return (
          <div key={t} className="flex items-center gap-3">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px]" style={{ background: G.sage, color: G.dark }}><I size={18} strokeWidth={1.7} /></span>
            <span className="text-[14.5px] font-medium leading-snug">{t}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="b2c-theme min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={back} aria-label="Retour" className="-ml-1 border-0 bg-transparent p-1" style={{ color: G.dark }}>
            <ArrowLeft size={20} strokeWidth={1.9} />
          </button>
          <span className="flex-1 text-[16px] font-semibold">GlowScan Plus</span>
        </div>

        {isPremium ? (
          <>
            <h1 className="m-0 text-[30px] leading-[1.12]">Merci, votre peau<br />est bien suivie.</h1>
            <div className="flex flex-col gap-1 rounded-[18px] p-5 text-white" style={{ background: G.dark }}>
              <span className="text-[11px] font-bold uppercase tracking-[.1em] opacity-80">GlowScan Plus · actif</span>
              {sub?.subscription?.expiresAt
                ? <span className="text-[17px] font-semibold">Jusqu'au {new Date(sub.subscription.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span>
                : <span className="text-[17px] font-semibold">Abonnement en cours</span>}
              <span className="text-[13px] opacity-80">Rien ne se renouvelle sans vous : vous serez prévenu avant la fin.</span>
            </div>
            {perks}
          </>
        ) : pending || ownerWaUrl ? (
          <>
            <h1 className="m-0 text-[30px] leading-[1.12]">Presque prêt.</h1>
            <div className="flex flex-col gap-3 rounded-[16px] p-4" style={{ background: "#f7e8dc", color: "#7a3f1d" }}>
              <b className="text-[16px] font-semibold">Paiement en cours de vérification</b>
              <span className="text-[14px] leading-relaxed">Nous vérifions votre paiement auprès de l'opérateur. Plus s'active dès la confirmation{pending?.reference ? ` (réf. ${pending.reference})` : ""}.</span>
              {ownerWaUrl && (
                <button type="button" onClick={() => window.open(ownerWaUrl, "_blank", "noopener,noreferrer")} className="self-start rounded-[10px] border-0 px-4 py-2.5 text-[14px] font-semibold text-white" style={{ background: G.dark }}>
                  Envoyer la capture sur WhatsApp
                </button>
              )}
            </div>
            <button type="button" onClick={() => setLocation("/analyze")} className="self-center border-0 bg-transparent p-1 text-[14px] font-semibold" style={{ color: G.dark }}>Continuer avec l'analyse gratuite</button>
          </>
        ) : !paying ? (
          <>
            <div className="flex flex-col gap-1.5">
              <h1 className="m-0 text-[30px] leading-[1.12]">Votre peau mérite<br />de la régularité.</h1>
              <span className="text-[14px]" style={{ color: G.muted }}>L'analyse reste gratuite. Le suivi va plus loin.</span>
            </div>

            <div className="flex flex-col gap-2 rounded-[18px] p-5 text-white" style={{ background: G.dark }}>
              <span className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-[.1em] opacity-80">GlowScan Plus</span>
                <Star size={19} strokeWidth={1.6} />
              </span>
              <span className="flex items-baseline gap-1.5"><b className="font-heading text-[38px] font-bold leading-none">{formatF(price)}</b><span className="text-[14px] opacity-80">/ {per}</span></span>
              <span className="text-[13.5px] leading-snug opacity-85">Un accompagnement au quotidien, sans engagement.</span>
              <div className="mt-2 flex gap-1 rounded-[10px] p-1" style={{ background: "rgba(255,255,255,.12)" }}>
                {(Object.keys(PREMIUM_PLANS) as PremiumPlan[]).map((k) => (
                  <button key={k} type="button" onClick={() => setPlan(k)} aria-pressed={plan === k}
                    className="flex-1 rounded-[8px] border-0 py-2 text-[13px] font-semibold"
                    style={{ background: plan === k ? G.lime : "transparent", color: plan === k ? G.dark : "#fff" }}>
                    {PREMIUM_PLANS[k].label} · {formatF(PREMIUM_PLANS[k].amountFcfa)}
                  </button>
                ))}
              </div>
            </div>

            {perks}

            <div className="flex items-start gap-2.5 rounded-[14px] p-3.5" style={{ background: G.sage, color: G.dark }}>
              <Check size={17} strokeWidth={2.2} className="mt-0.5 flex-none" />
              <span className="flex flex-col">
                <b className="text-[14px] font-semibold">L'analyse IA reste gratuite pour tous.</b>
                <span className="text-[13px]" style={{ color: G.muted }}>Aucun abonnement n'est nécessaire pour commencer.</span>
              </span>
            </div>

            <button type="button" onClick={() => setPaying(true)} className={btn} style={{ background: G.dark }}>
              S'abonner · {formatF(price)} / {per} <ArrowRight size={17} />
            </button>
            <span className="text-center text-[12.5px] leading-relaxed" style={{ color: G.muted }}>
              Paiement Mobile Money, sans renouvellement automatique : vous restez libre chaque {per}. Consultations et produits non inclus.
            </span>
            <button type="button" onClick={() => setLocation("/analyze")} className="self-center border-0 bg-transparent p-1 text-[14px] font-semibold" style={{ color: G.dark }}>Continuer avec l'analyse gratuite</button>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <h1 className="m-0 text-[28px] leading-[1.12]">Paiement<br />Mobile Money</h1>
              <span className="text-[14px]" style={{ color: G.muted }}>GlowScan Plus · {formatF(price)} / {per}</span>
            </div>
            <label className="flex flex-col gap-1.5 text-[14px] font-semibold">Votre numéro Mobile Money
              <span className="relative">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="677 12 45 90"
                  className="h-12 w-full rounded-[12px] border bg-white px-3.5 pr-28 text-[15px] font-normal focus-visible:outline-none" style={{ borderColor: G.line }} />
                {op && <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-pill px-2.5 py-[3px] text-[11px] font-bold" style={{ background: OPERATORS[op].bg, color: OPERATORS[op].fg }}>{OPERATORS[op].name}</span>}
              </span>
            </label>
            {op ? (
              <div className="flex flex-col gap-1.5 rounded-[16px] p-4" style={{ background: G.sage, color: G.dark }}>
                <span className="text-[14px]">Envoyez <b>{formatF(price)}</b> ({PREMIUM_PLANS[plan].label.toLowerCase()}) par {pm.label} au :</span>
                <span className="font-heading text-[24px] font-bold">{pm.num}</span>
                <span className="text-[13px]" style={{ color: G.muted }}>Code {pm.ussd}</span>
              </div>
            ) : (
              <span className="text-[13px]" style={{ color: G.muted }}>Saisissez votre numéro MTN ou Orange : le numéro de paiement s'affiche ici.</span>
            )}
            <button type="button" onClick={submit} disabled={busy || !op} className={btn} style={{ background: G.dark }}>
              {busy ? "Envoi…" : "J'ai payé"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
