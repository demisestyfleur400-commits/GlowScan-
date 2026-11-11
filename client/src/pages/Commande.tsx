import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check, Clock, Minus, Plus, ShieldAlert, Smartphone, Banknote, ImagePlus } from "lucide-react";
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
import { ensureDermFonts } from "@/components/derm/tokens";

// ════════════════════════════════════════════════════════════════════════
// Commande (nouvelle maquette B2C) : panier « Juste l'essentiel. », livraison
// « À votre porte. », paiement « À votre façon. », validation « À vous de
// valider. », confirmation. Logique inchangée : le n° de commande est réservé
// avant le paiement (référence) ; le TOTAL est figé par le serveur à l'envoi ;
// capture obligatoire sauf paiement à la livraison ; message WhatsApp.
// ════════════════════════════════════════════════════════════════════════

type Placed = { number: string; total: number; city: string; payMethod: PayMethod; status: OrderStatus };
type Snap = { items: { id: string; name: string; qty: number; unit: number }[]; fee: number; name: string; quartier: string; city: string };
const G = { dark: "#164034", text: "#17392c", muted: "#5f6f69", line: "#e3e8e2", sage: "#e7eedc", soft: "#f1f5ec", peach: "#f7e8dc", peachFg: "#7a3f1d", lime: "#cfe08a" };
const SERIF = "'Lora', Georgia, serif";
const TITLES = ["Mon panier", "Livraison", "Paiement", "Validation du paiement", "Ma commande"];
const ADDR_KEY = "gs_delivery_addr";

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

const Serif = ({ children }: { children: React.ReactNode }) => (
  <span style={{ fontFamily: SERIF, fontStyle: "italic", fontWeight: 500 }}>{children}</span>
);

export default function Commande() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const lines = useCart();
  const [step, setStep] = useState(1);
  const [f, setF] = useState(() => {
    try { const s = JSON.parse(localStorage.getItem(ADDR_KEY) || "null"); if (s) return { name: s.name || "", tel: s.tel || "", city: s.city || "Douala", quartier: s.quartier || "", notes: s.notes || "" }; } catch {}
    return { name: "", tel: "", city: "Douala", quartier: "", notes: "" };
  });
  const [remember, setRemember] = useState(() => { try { return !!localStorage.getItem(ADDR_KEY); } catch { return false; } });
  const [pay, setPay] = useState<PayMethod>("orange");
  const [number, setNumber] = useState<string | null>(null);
  const [proof, setProof] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [placed, setPlaced] = useState<Placed | null>(null);
  const [snap, setSnap] = useState<Snap | null>(null);
  const [showMsg, setShowMsg] = useState(false);
  const [reserveErr, setReserveErr] = useState(false);
  const [reserveTry, setReserveTry] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { ensureDermFonts(); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);
  useEffect(() => { if (!authLoading && !user) setLocation("/auth"); }, [authLoading, user, setLocation]);
  useEffect(() => {
    if (user) setF((x) => ({ ...x, name: x.name || [user.firstName, user.lastName].filter(Boolean).join(" ") }));
  }, [user]);

  // Réserve le n° de commande avant le paiement : c'est la référence à indiquer.
  useEffect(() => {
    if (step !== 3 || number) return;
    setReserveErr(false);
    fetch("/api/orders/reserve", { method: "POST", credentials: "include" })
      .then((r) => r.json()).then((d) => { if (d?.number) setNumber(d.number); else setReserveErr(true); })
      .catch(() => setReserveErr(true));
  }, [step, number, reserveTry]);

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
      // Bon de commande : on garde les lignes avant de vider le panier.
      setSnap({ items: o.items.map((i) => ({ id: i.id, name: i.name, qty: i.qty, unit: i.unit })), fee: o.fee ?? 0, name: f.name, quartier: f.quartier, city: f.city });
      try { if (remember) localStorage.setItem(ADDR_KEY, JSON.stringify(f)); else localStorage.removeItem(ADDR_KEY); } catch {}
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
  const input = "h-12 w-full rounded-[12px] border bg-white px-3.5 text-[15px] focus-visible:outline-none";
  const lab = "flex flex-col gap-1.5 text-[13.5px] font-semibold";
  const pillIdx = step === 2 ? 0 : step === 3 || step === 4 ? 1 : step === 5 ? 2 : -1;

  const recap = (title: string, totalLabel: string) => o.total !== null && o.fee !== null && (
    <div className="flex flex-col gap-2 text-[14px]">
      <b className="text-[16px] font-semibold">{title}</b>
      <div className="flex justify-between" style={{ color: G.muted }}><span>Articles · {nItems} unité{nItems > 1 ? "s" : ""}</span><span>{formatF(o.subtotal)}</span></div>
      <div className="flex justify-between" style={{ color: G.muted }}><span>{deliveryLabel(f.city)}</span><span>{formatF(o.fee)}</span></div>
      <div className="mt-1 flex items-baseline justify-between border-t pt-3" style={{ borderColor: G.line }}>
        <b className="text-[17px] font-semibold">{totalLabel}</b><b className="font-heading text-[22px] font-bold">{formatF(o.total)}</b>
      </div>
    </div>
  );

  const cta = (label: string, disabled = false, onClick = next) => (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-full rounded-[12px] border-0 p-4 text-[15px] font-semibold text-white disabled:opacity-45" style={{ background: G.dark }}>{label}</button>
  );

  return (
    <div className="b2c-theme min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <div className="flex items-center gap-2.5 border-b pb-3" style={{ borderColor: G.line }}>
          <button type="button" onClick={back} aria-label="Retour" className="-ml-1 border-0 bg-transparent p-1" style={{ color: G.dark }}><ArrowLeft size={20} strokeWidth={1.9} /></button>
          <span className="flex-1 text-[16px] font-semibold">{TITLES[step - 1]}</span>
        </div>

        {pillIdx >= 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {["1 · Livraison", "2 · Paiement", "3 · Confirmation"].map((t, i) => (
              <span key={t} className="rounded-pill py-1.5 text-center text-[12px] font-semibold"
                style={{ background: i === pillIdx ? G.dark : G.sage, color: i === pillIdx ? "#fff" : G.dark }}>{t}</span>
            ))}
          </div>
        )}

        {/* 1. Panier */}
        {step === 1 && (o.items.length === 0 ? (
          <>
            <h1 className="m-0 text-[34px] leading-[1.1]"><Serif>Juste l'essentiel.</Serif></h1>
            <div className="flex flex-col items-start gap-3 rounded-[16px] border bg-white p-5" style={{ borderColor: G.line }}>
              <span className="text-[14.5px]" style={{ color: G.muted }}>Pour l'instant, votre panier est vide. Choisissez un premier soin dans la boutique.</span>
              <button type="button" onClick={() => setLocation("/shop")} className="rounded-[12px] border-0 px-5 py-3 text-[15px] font-semibold text-white" style={{ background: G.dark }}>Voir la boutique</button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-[.1em]" style={{ color: G.muted }}>Votre sélection · {String(nItems).padStart(2, "0")} article{nItems > 1 ? "s" : ""}</span>
              <h1 className="m-0 text-[34px] leading-[1.1]"><Serif>Juste l'essentiel.</Serif></h1>
              <span className="text-[14px]" style={{ color: G.muted }}>{o.items.length === 1 ? "Un soin, une routine simple." : `${o.items.length} soins, une routine plus simple.`}</span>
            </div>
            <div className="flex flex-col">
              {o.items.map((i) => {
                const p = catalog.find((c) => c.id === i.id);
                const img = productImages[i.id] || p?.image;
                return (
                  <div key={i.id} className="flex gap-3 border-b py-3.5" style={{ borderColor: G.line }}>
                    {img ? <img src={img} alt="" className="h-[84px] w-[76px] flex-none rounded-[12px] object-cover" /> : <span className="h-[84px] w-[76px] flex-none rounded-[12px]" style={{ background: G.sage }} />}
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <b className="text-[14.5px] font-semibold leading-snug">{i.name}</b>
                      <b className="font-heading text-[17px] font-bold">{formatF(i.unit)}</b>
                      <span className="mt-auto flex items-center justify-between">
                        <span className="flex items-center rounded-[10px] border bg-white" style={{ borderColor: G.line }}>
                          <button type="button" aria-label={`Retirer un ${i.name}`} onClick={() => cart.setQty(i.id, i.qty - 1)} className="flex h-8 w-9 items-center justify-center border-0 bg-transparent"><Minus size={14} strokeWidth={2} /></button>
                          <span className="w-6 text-center text-[14px] font-semibold">{i.qty}</span>
                          <button type="button" aria-label={`Ajouter un ${i.name}`} onClick={() => cart.setQty(i.id, i.qty + 1)} className="flex h-8 w-9 items-center justify-center border-0 bg-transparent"><Plus size={14} strokeWidth={2} /></button>
                        </span>
                        <button type="button" onClick={() => cart.setQty(i.id, 0)} className="border-0 bg-transparent p-1 text-[13px]" style={{ color: G.muted }}>Retirer</button>
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            {recap("Votre récapitulatif", "Total estimé")}
            <span className="text-[12.5px] leading-relaxed" style={{ color: G.muted }}>Les frais de livraison dépendent de la ville choisie à l'étape suivante. Les produits ne sont pas inclus dans l'abonnement Plus.</span>
            {cta("Passer à la livraison", !canNext)}
          </>
        ))}

        {/* 2. Livraison */}
        {step === 2 && (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-[34px] leading-[1.1]"><Serif>À votre porte.</Serif></h1>
              <span className="text-[14px]" style={{ color: G.muted }}>Les bonnes coordonnées pour recevoir vos soins.</span>
            </div>
            <label className={lab}>Nom du destinataire
              <input className={input} style={{ borderColor: G.line }} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" />
            </label>
            <label className={lab}>Téléphone de livraison (WhatsApp / Mobile Money)
              <input className={input} style={{ borderColor: G.line }} value={f.tel} onChange={(e) => setF({ ...f, tel: e.target.value })} inputMode="tel" placeholder="677 12 45 90" />
              {f.tel && !telOk && <span className="text-[12.5px] font-normal" style={{ color: G.peachFg }}>Numéro camerounais à 9 chiffres</span>}
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-[13.5px] font-semibold">Ville</span>
              <div className="flex flex-wrap gap-1.5">
                {CITIES.map((c) => (
                  <button key={c} type="button" onClick={() => setF({ ...f, city: c })} className="rounded-pill border px-3.5 py-2 text-[14px] font-semibold"
                    style={{ borderColor: f.city === c ? G.dark : G.line, background: f.city === c ? G.dark : "#fff", color: f.city === c ? "#fff" : G.text }}>{c}</button>
                ))}
              </div>
            </div>
            <label className={lab}>Quartier, adresse et point de repère
              <input className={input} style={{ borderColor: G.line }} value={f.quartier} onChange={(e) => setF({ ...f, quartier: e.target.value })} placeholder="Ex. : Bonamoussadi, près de la pharmacie" />
            </label>
            <label className={lab}>Précisions pour le livreur <span className="font-normal" style={{ color: G.muted }}>(facultatif)</span>
              <input className={input} style={{ borderColor: G.line }} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
            </label>
            {o.fee !== null && (
              <div className="flex flex-col gap-1 rounded-[14px] border p-4" style={{ background: G.sage, borderColor: G.dark }}>
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-[15px] font-semibold"><span className="flex h-5 w-5 items-center justify-center rounded-pill text-white" style={{ background: G.dark }}><Check size={12} strokeWidth={3} /></span>{deliveryLabel(f.city)}</span>
                  <b className="font-heading text-[17px] font-bold">{formatF(o.fee)}</b>
                </span>
                <span className="pl-7 text-[13px]" style={{ color: G.muted }}>Date de livraison confirmée après la commande.</span>
              </div>
            )}
            <label className="flex items-start gap-2.5 text-[13.5px]">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="mt-0.5 h-4 w-4" style={{ accentColor: G.dark }} />
              <span>Enregistrer cette adresse sur ce téléphone pour la prochaine fois</span>
            </label>
            {cta("Choisir mon paiement", !canNext)}
            <span className="-mt-2 text-center text-[12.5px]" style={{ color: G.muted }}>{nItems} article{nItems > 1 ? "s" : ""} · Total {o.total !== null ? formatF(o.total) : ""}</span>
          </>
        )}

        {/* 3. Paiement */}
        {step === 3 && (
          <>
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-[34px] leading-[1.1]"><Serif>À votre façon.</Serif></h1>
              <span className="text-[14px]" style={{ color: G.muted }}>Choisissez votre moyen de paiement. Le montant reste visible avant validation.</span>
            </div>
            {(Object.keys(PAY_METHODS) as PayMethod[]).map((k) => {
              const pm = PAY_METHODS[k];
              const on = pay === k;
              const Icon = k === "cash" ? Banknote : Smartphone;
              return (
                <button key={k} type="button" onClick={() => setPay(k)} aria-pressed={on}
                  className="flex items-center gap-3 rounded-[14px] border px-3.5 py-3.5 text-left"
                  style={{ borderColor: on ? G.dark : G.line, background: on ? G.sage : "#fff", color: G.text }}>
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px]" style={{ background: pm.tagBg, color: pm.tagFg }}><Icon size={19} strokeWidth={1.8} /></span>
                  <span className="flex flex-1 flex-col">
                    <b className="text-[15px] font-semibold">{pm.label}</b>
                    <span className="text-[12.5px]" style={{ color: G.muted }}>{k === "cash" ? "Espèces ou Mobile Money au livreur" : `Transfert au numéro GlowScan · ${pm.ussd}`}</span>
                  </span>
                  <span className="flex h-5 w-5 flex-none items-center justify-center rounded-pill border-2" style={{ borderColor: on ? G.dark : "#c9d3cc", background: on ? G.dark : "transparent", color: "#fff" }}>{on && <Check size={11} strokeWidth={3} />}</span>
                </button>
              );
            })}
            {!cash && (
              <div className="flex flex-col gap-1.5 rounded-[14px] border bg-white p-4" style={{ borderColor: G.line }}>
                <span className="text-[14px]">Envoyez <b>{o.total !== null ? formatF(o.total) : ""}</b> au numéro {m.label} :</span>
                <div className="flex items-center justify-between gap-2">
                  <b className="font-heading text-[24px] font-bold">{m.num}</b>
                  <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(m.num.replace(/\s/g, "")); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}
                    className="rounded-[10px] border-0 px-3.5 py-1.5 text-[13px] font-semibold text-white" style={{ background: G.dark }}>{copied ? "Copié ✓" : "Copier"}</button>
                </div>
                <span className="text-[13px]" style={{ color: G.muted }}>Code {m.ussd} · Référence : <b style={{ color: G.text }}>{number ?? (reserveErr ? "non réservée" : "réservation…")}</b></span>
              </div>
            )}
            {recap("Votre commande", "Total à payer")}
            {cta(cash ? "Continuer" : "J'ai payé · ajouter la preuve", !canNext)}
            {reserveErr && !number ? (
              <div className="-mt-1 flex flex-col items-center gap-1.5 text-center text-[13px]" style={{ color: G.peachFg }}>
                Le numéro de commande n'a pas pu être réservé. Vérifiez votre connexion.
                <button type="button" onClick={() => setReserveTry((t) => t + 1)} className="rounded-[10px] border-0 px-4 py-2 text-[13.5px] font-semibold text-white" style={{ background: G.dark }}>Réessayer</button>
              </div>
            ) : (
              <span className="-mt-2 text-center text-[12.5px]" style={{ color: G.muted }}>{number ? "Votre commande est enregistrée à l'étape suivante." : "Réservation de votre numéro de commande…"}</span>
            )}
          </>
        )}

        {/* 4. Validation du paiement */}
        {step === 4 && (
          <>
            <span className="flex items-center gap-1.5 self-start rounded-pill px-3 py-1 text-[11.5px] font-bold uppercase tracking-[.06em]" style={{ background: G.peach, color: G.peachFg }}>
              <Clock size={13} strokeWidth={2} /> {cash ? "Paiement à la livraison" : "En attente"}
            </span>
            <div className="flex flex-col gap-1">
              <h1 className="m-0 text-[30px] leading-[1.12]">{cash ? "Presque fini." : "À vous de valider."}</h1>
              <span className="text-[14px]" style={{ color: G.muted }}>{cash ? "Vous paierez le livreur à la réception. Vérifiez votre commande, puis envoyez-la." : "Le paiement n'est pas encore confirmé. Ajoutez la capture de votre transfert pour envoyer la commande."}</span>
            </div>
            <div className="flex flex-col gap-1 rounded-[18px] p-5 text-white" style={{ background: G.dark }}>
              <span className="text-[11px] font-bold uppercase tracking-[.1em] opacity-80">{m.label}</span>
              <b className="font-heading text-[34px] font-bold leading-tight">{o.total !== null ? formatF(o.total) : ""}</b>
              {!cash && <span className="text-[13px] opacity-85">Numéro GlowScan : {m.num}</span>}
              <span className="text-[13px] opacity-85">Référence : {number}</span>
            </div>
            {!cash && (
              <>
                <div className="flex flex-col gap-3">
                  {[["Envoyez le montant", `Code ${m.ussd}, puis le numéro ${m.num}.`], ["Vérifiez le montant et le bénéficiaire", `${o.total !== null ? formatF(o.total) : ""} · GlowScan`], ["Ajoutez la capture du transfert", "Nous vérifions le paiement, puis préparons votre commande."]].map(([t, s], i) => (
                    <div key={t} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 flex-none items-center justify-center rounded-pill text-[13px] font-bold" style={{ background: G.sage, color: G.dark }}>{i + 1}</span>
                      <span className="flex flex-col"><b className="text-[14.5px] font-semibold">{t}</b><span className="text-[13px]" style={{ color: G.muted }}>{s}</span></span>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex flex-col items-center gap-1 rounded-[14px] border-2 border-dashed p-5"
                  style={{ borderColor: proof ? G.dark : "#c9d3cc", background: proof ? G.sage : "#fff", color: G.text }}>
                  {proof ? <img src={proof} alt="Capture du paiement" className="mb-1 h-24 rounded-[10px] object-contain" /> : <ImagePlus size={24} strokeWidth={1.6} style={{ color: G.dark }} />}
                  <b className="text-[14.5px] font-semibold">{proof ? "Capture ajoutée" : "Ajouter la capture du paiement"}</b>
                  <span className="text-[12.5px]" style={{ color: G.muted }}>{proof ? "Touchez pour changer" : "Depuis votre galerie"}</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={async (e) => { const file = e.target.files?.[0]; e.currentTarget.value = ""; if (file) { try { setProof(await toJpeg(file)); } catch { toast({ title: "Image illisible", variant: "destructive" }); } } }} />
                <div className="flex items-start gap-2.5 rounded-[14px] p-4" style={{ background: G.peach, color: G.peachFg }}>
                  <ShieldAlert size={18} strokeWidth={1.8} className="mt-0.5 flex-none" />
                  <span className="flex flex-col"><b className="text-[14px] font-semibold">Ne partagez jamais votre code secret.</b><span className="text-[13px]">Validez uniquement dans le menu officiel de votre opérateur, jamais dans GlowScan.</span></span>
                </div>
              </>
            )}
            <button type="button" onClick={() => setShowMsg(!showMsg)} className="self-start border-0 bg-transparent p-0 text-[13.5px] font-semibold" style={{ color: G.dark }}>
              {showMsg ? "Masquer le message WhatsApp" : "Voir le message envoyé sur WhatsApp"}
            </button>
            {showMsg && <pre className="m-0 whitespace-pre-wrap rounded-[12px] border bg-white p-4 font-body text-[12.5px] leading-normal" style={{ borderColor: G.line }}>{preview}</pre>}
            {cta(sending ? "Envoi…" : "Envoyer ma commande", !canNext || sending)}
            <span className="-mt-2 text-center text-[12.5px]" style={{ color: G.muted }}>La commande est confirmée après vérification du paiement.</span>
          </>
        )}

        {/* 5. Confirmation et suivi */}
        {step === 5 && placed && (() => {
          const status = live?.status ?? placed.status;
          const idx = Math.max(0, ["received", "paid_verified", "shipping", "delivered"].indexOf(status));
          const verified = idx >= 1;
          const first = (user?.firstName || snap?.name || "").split(/\s+/)[0];
          return (
            <>
              <h1 className="m-0 text-[30px] leading-[1.12]">Merci{first ? `, ${first}` : ""}.<br /><Serif>{verified ? "C'est confirmé." : "C'est envoyé."}</Serif></h1>
              <span className="flex items-center gap-1.5 self-start rounded-pill px-3 py-1 text-[12px] font-semibold" style={verified ? { background: G.sage, color: G.dark } : { background: G.peach, color: G.peachFg }}>
                {verified ? <Check size={13} strokeWidth={2.4} /> : <Clock size={13} strokeWidth={2} />}{verified ? "Paiement vérifié" : placed.payMethod === "cash" ? "Paiement à la livraison" : "Paiement en cours de vérification"}
              </span>
              <span className="-mt-1 text-[13px]" style={{ color: G.muted }}>Commande {placed.number}</span>

              <div className="flex flex-col gap-2.5 rounded-[16px] border bg-white p-4 text-[14px]" style={{ borderColor: G.line }} id="bon-de-commande">
                <span className="flex justify-between text-[11px] font-bold uppercase tracking-[.08em]" style={{ color: G.muted }}>
                  <span>Bon de commande</span><span>{new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                </span>
                <b className="font-heading text-[22px] font-bold">glowscan</b>
                <span className="-mt-2 text-[12.5px]" style={{ color: G.muted }}>{PAY_METHODS[placed.payMethod].label}</span>
                <div className="flex flex-col gap-1.5 border-t pt-2.5" style={{ borderColor: G.line }}>
                  {(snap?.items ?? []).map((i) => (
                    <span key={i.id} className="flex justify-between gap-2"><span>{i.qty} × {i.name}</span><span>{formatF(i.unit * i.qty)}</span></span>
                  ))}
                  {snap && <span className="flex justify-between gap-2"><span>{deliveryLabel(placed.city)}</span><span>{formatF(snap.fee)}</span></span>}
                </div>
                <span className="flex items-baseline justify-between border-t pt-2.5" style={{ borderColor: G.line }}>
                  <b className="text-[16px] font-semibold">{placed.payMethod === "cash" ? "Total à payer" : "Total"}</b><b className="font-heading text-[22px] font-bold">{formatF(placed.total)}</b>
                </span>
              </div>

              {snap && (
                <div className="flex flex-col gap-1 rounded-[14px] p-4" style={{ background: G.sage, color: G.dark }}>
                  <b className="text-[14.5px] font-semibold">Livraison à {snap.name}</b>
                  <span className="text-[13px]" style={{ color: G.muted }}>{[snap.quartier, placed.city].filter(Boolean).join(" · ")}</span>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {trackingSteps(placed.payMethod, placed.city).map((t, i) => (
                  <div key={t.key} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 flex-none items-center justify-center rounded-pill text-[12px] font-bold"
                      style={{ background: i <= idx ? G.dark : G.sage, color: i <= idx ? "#fff" : G.dark }}>
                      {i <= idx ? <Check size={13} strokeWidth={3} /> : i + 1}
                    </span>
                    <span className="flex flex-col">
                      <span className="text-[14px] font-semibold" style={{ color: i <= idx ? G.text : G.muted }}>{t.label}</span>
                      {t.sub && <span className="text-[12.5px]" style={{ color: G.muted }}>{t.sub}</span>}
                    </span>
                  </div>
                ))}
              </div>

              <button type="button" onClick={() => setLocation("/shop")} className="self-center border-0 bg-transparent p-1 text-[14px] font-semibold" style={{ color: G.dark }}>Retour à la boutique →</button>
              {cta("Imprimer ou enregistrer le bon de commande", false, () => window.print())}
              <span className="-mt-2 text-center text-[12.5px]" style={{ color: G.muted }}>Conservez ce document pour suivre votre commande.</span>
            </>
          );
        })()}
      </main>
    </div>
  );
}
