import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { PREMIUM_PERKS, PREMIUM_PLANS, type PremiumPlan } from "@shared/premium";
import { OPERATORS, cmNational, opOf } from "@shared/phone";
import { PAY_METHODS, formatF } from "@shared/delivery";

// ════════════════════════════════════════════════════════════════════════
// Premium (refonte Organic) — maquette « GlowScan App » › Premium.
// 500 F / semaine ou 2 000 F / mois : le navigateur n'envoie QUE la formule,
// le serveur fixe le montant et la durée. Les consultations restent payées à
// part (chaque médecin fixe son prix). Activation par l'admin après
// vérification de l'ID de transaction de l'opérateur.
// ════════════════════════════════════════════════════════════════════════

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

  useEffect(() => { if (!authLoading && !user) setLocation("/auth"); }, [authLoading, user, setLocation]);

  const op = opOf(phone);
  const pm = op === "mtn" ? PAY_METHODS.mtn : PAY_METHODS.orange;
  const pending = statusData?.request?.status === "pending" ? statusData.request : null;
  const price = PREMIUM_PLANS[plan].amountFcfa;

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

  const back = () => (paying && !ownerWaUrl ? setPaying(false) : setLocation("/profile"));
  const perks = (
    <div className="flex flex-col gap-2">
      {PREMIUM_PERKS.map((t) => (
        <span key={t} className="flex gap-2.5 text-[14px]"><span className="font-bold text-organic-accent-2-700">✓</span>{t}</span>
      ))}
    </div>
  );


  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <button type="button" onClick={back} className="flex items-center gap-1 self-start border-0 bg-transparent p-0 font-bold text-organic-accent-700">
          <ArrowLeft size={18} strokeWidth={1.75} /> Retour
        </button>
        <h1 className="m-0 text-[28px]">Premium</h1>

        {isPremium ? (
          <>
            <div className="flex flex-col gap-1 rounded-lg bg-organic-accent-2-100 p-4 text-organic-accent-2-900">
              <span className="text-[16px] font-bold">Premium actif</span>
              {sub?.subscription?.expiresAt && <span className="text-[13px]">Jusqu'au {new Date(sub.subscription.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span>}
            </div>
            {perks}
          </>
        ) : pending || ownerWaUrl ? (
          <div className="flex flex-col gap-3 rounded-lg bg-organic-surface p-4">
            <span className="text-[16px] font-bold">Demande en cours de vérification</span>
            <span className="text-[13px]">Nous vérifions votre paiement auprès de l'opérateur. Premium s'active dès la confirmation{pending?.reference ? ` (réf. ${pending.reference})` : ""}.</span>
            {ownerWaUrl && (
              <button type="button" onClick={() => window.open(ownerWaUrl, "_blank", "noopener,noreferrer")} className="self-start rounded-pill border-0 bg-organic-accent px-4 py-2.5 text-[14px] font-bold text-organic-neutral-100">
                Envoyer la capture sur WhatsApp
              </button>
            )}
          </div>
        ) : !paying ? (
          <>
            <div className="grid grid-cols-2 gap-2.5">
              {(Object.keys(PREMIUM_PLANS) as PremiumPlan[]).map((k) => {
                const p = PREMIUM_PLANS[k];
                return (
                  <button key={k} type="button" onClick={() => setPlan(k)}
                    className="flex flex-col gap-1 rounded-lg border-2 bg-organic-surface p-4 text-left text-organic-text"
                    style={{ borderColor: plan === k ? "var(--color-accent)" : "transparent" }}>
                    <span className="text-[13px] text-organic-neutral-700">{p.label}</span>
                    <span className="font-heading text-[24px]">{formatF(p.amountFcfa)}</span>
                    <span className="text-[12px] text-organic-neutral-700">{p.note}</span>
                  </button>
                );
              })}
            </div>
            {perks}
            <span className="text-[12px] text-organic-neutral-700">Les consultations avec un dermatologue restent payées à part : c'est le médecin qui fixe son prix.</span>
            <button type="button" onClick={() => setPaying(true)} className="rounded-pill border-0 bg-organic-accent p-4 text-[16px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600">
              S'abonner · {formatF(price)} par Mobile Money
            </button>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">Votre numéro Mobile Money
              <span className="relative">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="677 12 45 90"
                  className="h-11 w-full rounded-pill border border-organic-divider bg-organic-surface px-3.5 pr-28 text-[15px] font-normal focus-visible:border-organic-accent focus-visible:outline-none" />
                {op && <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-pill px-2.5 py-[3px] text-[11px] font-bold" style={{ background: OPERATORS[op].bg, color: OPERATORS[op].fg }}>{OPERATORS[op].name}</span>}
              </span>
            </label>
            {op && (
              <div className="flex flex-col gap-2 rounded-lg bg-organic-accent-100 p-4 text-organic-accent-900">
                <span className="text-[13px]">Envoyez <b>{formatF(price)}</b> ({PREMIUM_PLANS[plan].label.toLowerCase()}) par {pm.label} au :</span>
                <span className="font-heading text-[22px]">{pm.num}</span>
                <span className="text-[13px]">Code {pm.ussd}</span>
              </div>
            )}
            <button type="button" onClick={submit} disabled={busy || !op} className="rounded-pill border-0 bg-organic-accent p-4 text-[16px] font-bold text-organic-neutral-100 disabled:opacity-45">
              {busy ? "Envoi…" : "J'ai payé"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
