import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { catalog } from "@shared/catalog";
import { cmNational } from "@shared/phone";
import {
  CITIES, PAY_METHODS, buildOrderWhatsApp, computeOrder, deliveryLabel, formatF, trackingSteps,
  type OrderStatus, type PayMethod,
} from "@shared/delivery";
import { productImages } from "@/lib/productImages";
import { cart, useCart } from "@/lib/cart";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Commande (refonte Organic) — maquette « GlowScan App » › Commande.
// 4 étapes (panier, livraison, paiement, preuve) puis suivi. Le n° de commande
// est réservé avant le paiement (référence) ; le TOTAL est figé par le serveur
// à l'envoi. Capture obligatoire sauf paiement à la livraison.
// ════════════════════════════════════════════════════════════════════════

type Placed = { number: string; total: number; city: string; payMethod: PayMethod; status: OrderStatus };
const TITLES = ["Mon panier", "Livraison", "Paiement", "Preuve de paiement"];

async function toJpeg(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, 1400 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally { URL.revokeObjectURL(url); }
}

export default function Commande() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const lines = useCart();
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ name: "", tel: "", city: "Douala", quartier: "", notes: "" });
  const [pay, setPay] = useState<PayMethod>("orange");
  const [number, setNumber] = useState<string | null>(null);
  const [proof, setProof] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!authLoading && !user) setLocation("/auth"); }, [authLoading, user, setLocation]);
  useEffect(() => {
    if (user) setF((x) => ({ ...x, name: x.name || [user.firstName, user.lastName].filter(Boolean).join(" ") }));
  }, [user]);

  // Réserve le n° de commande avant le paiement : c'est la référence à indiquer.
  useEffect(() => {
    if (step !== 3 || number) return;
    fetch("/api/orders/reserve", { method: "POST", credentials: "include" })
      .then((r) => r.json()).then((d) => d?.number && setNumber(d.number)).catch(() => {});
  }, [step, number]);

  // Suivi : statut réel de la commande envoyée.
  const { data: live } = useQuery<{ status: OrderStatus }>({ queryKey: [`/api/orders/${placed?.number}`], enabled: !!placed, refetchInterval: 60_000 });

  const o = computeOrder(lines, f.city);
  const cash = pay === "cash";
  const m = PAY_METHODS[pay];
  const telOk = !!cmNational(f.tel);
  const canNext = step === 1 ? o.items.length > 0
    : step === 2 ? !!(f.name.trim() && telOk && f.quartier.trim())
    : step === 3 ? !!number
    : cash || !!proof;
  const nItems = o.items.reduce((a, i) => a + i.qty, 0);

  const preview = o.total !== null && o.fee !== null
    ? buildOrderWhatsApp({ number: number || "GS-……", items: o.items, fee: o.fee, total: o.total, city: f.city, quartier: f.quartier, notes: f.notes, name: f.name, phone: f.tel, payMethod: pay })
    : "";

  const send = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, items: lines, city: f.city, payMethod: pay, name: f.name, phone: f.tel, quartier: f.quartier, notes: f.notes, proof: cash ? undefined : proof }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.message || "Envoi impossible");
      // Total FIGÉ : celui renvoyé par le serveur, plus jamais recalculé ici.
      setPlaced({ number: d.order.number, total: d.order.total, city: d.order.city, payMethod: d.order.payMethod, status: d.order.status });
      cart.clear();
      window.open(d.whatsappUrl, "_blank", "noopener");
      setStep(5);
    } catch (e: any) {
      toast({ title: "Commande non envoyée", description: e?.message || "Réessayez dans un instant.", variant: "destructive" });
    } finally { setSending(false); }
  };

  const back = () => (step > 1 && step < 5 ? setStep(step - 1) : setLocation("/shop"));
  const next = () => (step < 4 ? setStep(step + 1) : send());
  const chip = (on: boolean) => cn(
    "whitespace-nowrap rounded-pill border px-3.5 py-2 text-[14px] font-semibold",
    on ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text",
  );
  const input = "h-11 w-full rounded-pill border border-organic-divider bg-organic-surface px-3.5 text-[15px] text-organic-text placeholder:text-organic-text/55 focus-visible:border-organic-accent focus-visible:outline-none";

  const recap = o.total !== null && o.fee !== null && (
    <div className="flex flex-col gap-1.5 rounded-lg bg-organic-surface p-4 text-[14px]">
      <div className="flex justify-between"><span>{nItems} produit{nItems > 1 ? "s" : ""}</span><span>{formatF(o.subtotal)}</span></div>
      <div className="flex justify-between"><span>{deliveryLabel(f.city)}</span><span>{formatF(o.fee)}</span></div>
      <div className="flex justify-between border-t border-organic-divider pt-1.5 font-bold"><span>Total</span><span>{formatF(o.total)}</span></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={back} aria-label="Retour" className="border-0 bg-transparent p-0 pr-1 text-organic-accent-700"><ArrowLeft size={21} strokeWidth={1.75} /></button>
          <span className="flex-1 font-heading text-[22px]">{step < 5 ? TITLES[step - 1] : "Suivi"}</span>
          {step < 5 && <span className="text-[12px] font-bold text-organic-neutral-700">{step} / 4</span>}
        </div>
        {step < 5 && (
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((i) => <span key={i} className="h-1 flex-1 rounded-pill" style={{ background: i <= step ? "var(--color-accent)" : "var(--color-neutral-200)" }} />)}
          </div>
        )}

        {/* 1. Panier */}
        {step === 1 && (o.items.length === 0 ? (
          <div className="flex flex-col gap-3 rounded-lg bg-organic-surface p-5">
            <span className="text-[14px]">Votre panier est vide.</span>
            <button type="button" onClick={() => setLocation("/shop")} className="rounded-pill border-0 bg-organic-accent p-3 text-[15px] font-bold text-organic-neutral-100">Voir la boutique</button>
          </div>
        ) : o.items.map((i) => {
          const p = catalog.find((c) => c.id === i.id);
          const img = productImages[i.id] || p?.image;
          return (
            <div key={i.id} className="flex items-center gap-3 rounded-lg bg-organic-surface px-3 py-2.5">
              {img ? <img src={img} alt="" className="h-12 w-12 flex-none rounded-[14px] object-cover" /> : <span className="h-12 w-12 flex-none rounded-[14px] bg-organic-accent-200" />}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-bold">{i.name}</span>
                <span className="text-[12px] text-organic-neutral-700">{formatF(i.unit)} l'unité</span>
              </span>
              <span className="flex items-center gap-1.5">
                <button type="button" aria-label={`Retirer un ${i.name}`} onClick={() => cart.setQty(i.id, i.qty - 1)} className="flex h-8 w-8 items-center justify-center rounded-pill border border-organic-divider bg-transparent"><Minus size={14} strokeWidth={1.75} /></button>
                <span className="w-5 text-center text-[14px] font-bold">{i.qty}</span>
                <button type="button" aria-label={`Ajouter un ${i.name}`} onClick={() => cart.setQty(i.id, i.qty + 1)} className="flex h-8 w-8 items-center justify-center rounded-pill border border-organic-divider bg-transparent"><Plus size={14} strokeWidth={1.75} /></button>
              </span>
            </div>
          );
        }))}

        {/* 2. Livraison */}
        {step === 2 && (
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">Nom complet
              <input className={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">Téléphone WhatsApp / MoMo
              <input className={input} value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} inputMode="tel" placeholder="677 12 45 90" />
              {f.tel && !telOk && <span className="text-[12px] font-normal text-organic-accent-700">Numéro camerounais à 9 chiffres</span>}
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold">Ville</span>
              <div className="flex flex-wrap gap-1.5">
                {CITIES.map((c) => <button key={c} type="button" className={chip(f.city === c)} onClick={() => setF({ ...f, city: c })}>{c}</button>)}
              </div>
              <span className="text-[12px] text-organic-neutral-700">{deliveryLabel(f.city)} : {o.fee !== null ? formatF(o.fee) : ""}</span>
            </div>
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">Quartier ou point de repère
              <input className={input} value={f.quartier} onChange={(e) => setF({ ...f, quartier: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1.5 text-[13px] font-bold">Précisions pour le livreur <span className="font-normal text-organic-neutral-700">(facultatif)</span>
              <input className={input} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            </label>
          </div>
        )}

        {/* 3. Paiement */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            {recap}
            {(Object.keys(PAY_METHODS) as PayMethod[]).map((k) => {
              const pm = PAY_METHODS[k];
              return (
                <button key={k} type="button" onClick={() => setPay(k)}
                  className="flex items-center gap-3 rounded-lg border-2 bg-organic-surface px-3.5 py-3 text-left text-organic-text"
                  style={{ borderColor: pay === k ? "var(--color-accent)" : "transparent" }}>
                  <span className="flex-none rounded-pill px-2.5 py-1 text-[11px] font-bold" style={{ background: pm.tagBg, color: pm.tagFg }}>{pm.tag}</span>
                  <span className="flex flex-1 flex-col">
                    <span className="text-[14px] font-bold">{pm.label}</span>
                    <span className="text-[12px] text-organic-neutral-700">{k === "cash" ? "Espèces ou MoMo au livreur" : `Payer maintenant · ${pm.ussd}`}</span>
                  </span>
                </button>
              );
            })}
            {!cash && (
              <div className="flex flex-col gap-2 rounded-lg bg-organic-accent-100 p-4 text-organic-accent-900">
                <span className="text-[13px]">Envoyez <b>{o.total !== null ? formatF(o.total) : ""}</b> au numéro {m.label} :</span>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-heading text-[22px]">{m.num}</span>
                  <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(m.num.replace(/\s/g, "")); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}
                    className="rounded-pill border-0 bg-organic-accent px-3.5 py-1.5 text-[13px] font-bold text-organic-bg">{copied ? "Copié ✓" : "Copier"}</button>
                </div>
                <span className="text-[13px]">Code {m.ussd} · Référence : <b>{number ?? "…"}</b></span>
              </div>
            )}
          </div>
        )}

        {/* 4. Preuve */}
        {step === 4 && (
          <div className="flex flex-col gap-3">
            {!cash && (
              <>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-1 rounded-lg border-2 border-dashed p-5 text-organic-text"
                  style={{ borderColor: proof ? "var(--color-accent-2-600)" : "var(--color-neutral-400)", background: proof ? "var(--color-accent-2-100)" : "var(--color-surface)" }}>
                  {proof && <img src={proof} alt="Capture du paiement" className="mb-1 h-24 rounded-[12px] object-contain" />}
                  <span className="text-[14px] font-bold">{proof ? "Capture ajoutée ✓" : "Ajouter la capture"}</span>
                  <span className="text-[12px] text-organic-neutral-700">{proof ? "Touchez pour changer" : "Depuis votre galerie"}</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={async (e) => { const file = e.target.files?.[0]; e.currentTarget.value = ""; if (file) { try { setProof(await toJpeg(file)); } catch { toast({ title: "Image illisible", variant: "destructive" }); } } }} />
              </>
            )}
            <div className="flex flex-col gap-1.5">
              <span className="text-[13px] font-bold">Message envoyé sur WhatsApp</span>
              <pre className="m-0 whitespace-pre-wrap rounded-lg bg-organic-surface p-4 font-body text-[12px] leading-normal">{preview}</pre>
            </div>
          </div>
        )}

        {/* 5. Suivi */}
        {step === 5 && placed && (() => {
          const status = live?.status ?? placed.status;
          const idx = Math.max(0, ["received", "paid_verified", "shipping", "delivered"].indexOf(status));
          return (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 rounded-lg bg-organic-accent-2-100 p-4 text-organic-accent-2-900">
                <span className="text-[16px] font-bold">Commande {placed.number} envoyée</span>
                <span className="text-[13px]">Total : {formatF(placed.total)}</span>
              </div>
              {trackingSteps(placed.payMethod, placed.city).map((t, i) => (
                <div key={t.key} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-pill text-[12px] font-bold"
                    style={{ background: i <= idx ? "var(--color-accent-2-600)" : "var(--color-neutral-300)", color: i <= idx ? "var(--color-bg)" : "var(--color-neutral-700)" }}>
                    {i <= idx ? "✓" : i + 1}
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[14px] font-bold" style={{ color: i <= idx ? "var(--color-text)" : "var(--color-neutral-700)" }}>{t.label}</span>
                    {t.sub && <span className="text-[12px] text-organic-neutral-700">{t.sub}</span>}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        {step < 5 ? (
          o.items.length > 0 && (
            <button type="button" onClick={next} disabled={!canNext || sending}
              className="rounded-pill border-0 bg-organic-accent p-4 text-[16px] font-bold text-organic-neutral-100 hover:bg-organic-accent-600 disabled:opacity-45">
              {step === 1 ? "Continuer" : step === 2 ? "Continuer vers le paiement" : step === 3 ? (cash ? "Continuer" : "J'ai payé") : sending ? "Envoi…" : "Envoyer ma commande sur WhatsApp"}
            </button>
          )
        ) : (
          <button type="button" onClick={() => setLocation("/shop")} className="rounded-pill border border-organic-divider bg-transparent p-3.5 text-[15px] font-bold">Retour à la boutique</button>
        )}
      </main>
    </div>
  );
}
