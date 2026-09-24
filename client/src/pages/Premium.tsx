import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { GS, GsMono, GsMarks, useGsFonts } from "@/lib/gs-ui";
import {
  X, ArrowLeft, ArrowRight, Copy, Check, Phone, ScanFace, ScanBarcode,
  ListChecks, RefreshCw, Send, Clock,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════
// PREMIUM PATIENT — refonte fidèle au design (P1→P4, Commande Produits.dc.html)
//   P1 Bon de commande · P2 Paiement Orange/MTN · P3 Capture + WhatsApp ·
//   P4 Activation (en vérification → actif)
// Logique conservée : POST /api/premium/request, /api/premium/status, tracking.
// Numéros Mobile Money = les miens. Langage gs-ui. Zéro bouton mort.
// ════════════════════════════════════════════════════════════════════════

const PRICE = 2000;
const OPS = {
  orange_money: { label: "Orange Money", tag: "OM", tagBg: "#FF7900", tagColor: "#fff", num: "690 501 392", ussd: "#150#" },
  mtn_momo: { label: "MTN Mobile Money", tag: "MoMo", tagBg: "#FFCC00", tagColor: "#0B1719", num: "674 377 959", ussd: "*126#" },
} as const;
type Method = keyof typeof OPS;
type Step = "bon" | "pay" | "capture" | "done";

const fmtDate = (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";

export default function Premium() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { isPremium, data: subData } = useSubscription();
  const { toast } = useToast();
  useGsFonts();

  const [step, setStep] = useState<Step>("bon");
  const [method, setMethod] = useState<Method>("mtn_momo");
  const [phone, setPhone] = useState<string>(((user as any)?.phone || "").replace(/^\+?237/, "").trim());
  const [loading, setLoading] = useState(false);
  const [requestData, setRequestData] = useState<{ reference: string; ownerWaUrl?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [capture, setCapture] = useState<{ url: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const { data: statusData } = useQuery<{ request: { reference: string; status: string } | null }>({
    queryKey: ["/api/premium/status"], enabled: !!user && !isPremium, refetchInterval: step === "done" ? 8000 : false,
  });

  const op = OPS[method];
  const userName = (user as any)?.firstName || "Titulaire";
  const userEmail = (user as any)?.email || "";

  const copyNum = () => { try { navigator.clipboard?.writeText(op.num.replace(/\s/g, "")); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };

  const submitRequest = async () => {
    if (!phone.trim() || phone.trim().replace(/\D/g, "").length < 8) {
      toast({ title: "Numéro requis", description: "Entrez le numéro Mobile Money qui a payé (9 chiffres).", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/premium/request", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ method, phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setRequestData({ reference: data.request.reference, ownerWaUrl: data.ownerWaUrl });
      if (typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "InitiateCheckout", { value: PRICE, currency: "XAF", content_name: "GlowScan Premium", content_ids: ["premium_lifetime"] });
      }
      setStep("capture");
    } catch (err: any) {
      toast({ title: "Échec", description: err?.message || "Une erreur est survenue.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const pickCapture = (f: File | undefined | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast({ title: "Image requise", description: "Joignez une capture (image).", variant: "destructive" }); return; }
    setCapture({ url: URL.createObjectURL(f), name: f.name });
  };

  const sendWhatsapp = () => {
    if (requestData?.ownerWaUrl) window.open(requestData.ownerWaUrl, "_blank", "noopener,noreferrer");
    if (typeof (window as any).fbq === "function" && !sessionStorage.getItem("gs_pixel_purchase_fired")) {
      (window as any).fbq("track", "Purchase", { value: PRICE, currency: "XAF", contents: [{ id: "premium_lifetime", quantity: 1 }], content_ids: "XAF" });
      try { sessionStorage.setItem("gs_pixel_purchase_fired", "1"); } catch {}
    }
    setStep("done");
  };

  // Cadre plein écran (langage design).
  const shell = (children: React.ReactNode) => (
    <div style={{ minHeight: "100dvh", background: GS.mintBg, fontFamily: GS.sans, color: GS.ink }}>
      <div style={{ width: "100%", maxWidth: 430, margin: "0 auto", padding: "16px 24px 32px", boxSizing: "border-box", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>{children}</div>
    </div>
  );
  const stepHeader = (n: number, onBack: (() => void) | null) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      {onBack ? <button onClick={onBack} aria-label="Retour" style={{ background: "none", border: "none", cursor: "pointer", color: GS.ink, display: "flex", padding: 0 }}>{n === 1 ? <X size={20} /> : <ArrowLeft size={20} />}</button> : <div style={{ width: 20 }} />}
      <GsMono style={{ letterSpacing: ".14em" }}>ÉTAPE {n} / 3</GsMono>
      <div style={{ width: 20 }} />
    </div>
  );
  const marks = () => <GsMarks />;

  // ════════ ÉTAT ACTIF (P4 actif) ════════
  if (isPremium && step === "bon") {
    return shell(<>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
        <img src="/glowscan-mark.png" alt="GlowScan" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo-glowscan-square.jpeg"; }} style={{ width: 28, height: 28, objectFit: "contain" }} />
        <button onClick={() => setLocation("/profile")} aria-label="Fermer" style={{ background: "none", border: "none", cursor: "pointer", color: GS.muted, display: "flex" }}><X size={20} /></button>
      </div>
      <div style={{ position: "relative", border: `1px solid ${GS.ink}`, padding: 20 }}>
        {marks()}
        <span style={{ background: GS.grad, padding: "5px 10px", fontFamily: GS.mono, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", color: GS.deep }}>PREMIUM ACTIF</span>
        <div style={{ fontSize: 23, fontWeight: 600, letterSpacing: "-.7px", lineHeight: 1.18, marginTop: 14 }}>Tout est débloqué{userName ? `, ${userName}` : ""}</div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${GS.line}` }}>
          <span style={{ fontSize: 12, color: GS.muted }}>Valable jusqu'au</span>
          <span style={{ fontFamily: GS.mono, fontSize: 14, fontWeight: 600, color: GS.ink }}>{fmtDate(subData?.subscription?.expiresAt) || "—"}</span>
        </div>
      </div>
      <GsMono style={{ display: "block", margin: "18px 0 8px" }}>Commencer par</GsMono>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button onClick={() => setLocation("/product-scan-camera")} style={{ border: `1px solid ${GS.ink}`, background: "#fff", padding: 13, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
          <ScanBarcode size={19} style={{ color: GS.teal }} /><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Scanner vos produits actuels</div><div style={{ fontSize: 11, color: GS.muted, marginTop: 2 }}>Savoir s'ils conviennent à votre peau</div></div><ArrowRight size={16} style={{ color: GS.ink }} />
        </button>
        <button onClick={() => setLocation("/analyze")} style={{ border: `1px solid ${GS.line}`, background: "#fff", padding: 13, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
          <ScanFace size={19} style={{ color: GS.teal }} /><div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Nouvelle analyse</div><div style={{ fontSize: 11, color: GS.muted, marginTop: 2 }}>Plus de limite mensuelle</div></div><ArrowRight size={16} style={{ color: GS.ink }} />
        </button>
      </div>
    </>);
  }

  // ════════ P1 · BON DE COMMANDE ════════
  if (step === "bon") {
    // Demande déjà en attente → écran d'activation (P4 en vérification).
    if (statusData?.request?.status === "pending" && !requestData) {
      return shell(<>
        {stepHeader(3, () => setLocation("/profile"))}
        <PendingCard reference={statusData.request.reference} />
      </>);
    }
    return shell(<>
      {stepHeader(1, () => setLocation(-1 as any))}
      <div style={{ position: "relative", border: `1px solid ${GS.ink}`, padding: 18 }}>
        {marks()}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src="/glowscan-mark.png" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo-glowscan-square.jpeg"; }} style={{ width: 30, height: 30, objectFit: "contain" }} />
          <span style={{ background: GS.grad, padding: "5px 10px", fontFamily: GS.mono, fontSize: 9, fontWeight: 700, letterSpacing: ".12em", color: GS.deep }}>PREMIUM</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 14 }}>
          <span style={{ fontFamily: GS.mono, fontSize: 32, fontWeight: 600, letterSpacing: "-1px" }}>2 000 F</span>
          <span style={{ fontSize: 13, color: GS.muted }}>/ mois</span>
        </div>
        <div style={{ marginTop: 14 }}>
          {[{ icon: ScanFace, t: "Analyses de peau" }, { icon: ScanBarcode, t: "Scan produit" }, { icon: ListChecks, t: "Produits dans la routine" }].map((f, i) => {
            const I = f.icon;
            return <div key={i} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderTop: `1px solid ${GS.hair}` }}><I size={17} style={{ color: GS.teal }} /><span style={{ flex: 1, fontSize: 13, color: GS.ink }}>{f.t}</span><GsMono color={GS.teal} style={{ letterSpacing: 0 }}>ILLIMITÉ</GsMono></div>;
          })}
        </div>
      </div>

      <GsMono style={{ display: "block", marginTop: 18, marginBottom: 8 }}>Titulaire du compte</GsMono>
      <div style={{ border: `1px solid ${GS.line}` }}>
        <div style={{ padding: "11px 12px", borderBottom: `1px solid ${GS.hair}`, display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 12, color: GS.muted }}>Nom</span><span style={{ fontSize: 13, color: GS.ink }}>{userName}</span></div>
        <div style={{ padding: "11px 12px", borderBottom: `1px solid ${GS.hair}`, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: GS.muted, flex: "none" }}>Téléphone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="6XX XXX XXX" style={{ flex: 1, minWidth: 0, textAlign: "right", border: "none", outline: "none", background: "transparent", fontFamily: GS.mono, fontSize: 12, color: GS.ink }} />
        </div>
        <div style={{ padding: "11px 12px", display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 12, color: GS.muted }}>Email</span><span style={{ fontSize: 13, color: GS.ink, wordBreak: "break-all" }}>{userEmail || "—"}</span></div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 12, borderBottom: `1px solid ${GS.line}`, marginBottom: 13 }}>
          <span style={{ fontSize: 12, color: GS.muted }}>Premium · 1 mois</span>
          <span style={{ fontFamily: GS.mono, fontSize: 20, fontWeight: 600, color: GS.ink }}>2 000 F</span>
        </div>
        <button onClick={() => setStep("pay")} style={{ width: "100%", background: GS.ink, color: "#fff", border: "none", padding: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Passer au paiement <ArrowRight size={16} style={{ color: GS.accent }} /></button>
      </div>
    </>);
  }

  // ════════ P2 · PAIEMENT ════════
  if (step === "pay") {
    return shell(<>
      {stepHeader(2, () => setStep("bon"))}
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px" }}>Payer 2 000 F</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
        {(Object.keys(OPS) as Method[]).map((m) => {
          const o = OPS[m]; const on = method === m;
          return (
            <button key={m} onClick={() => setMethod(m)} style={{ border: on ? `2px solid ${GS.ink}` : `1px solid ${GS.line}`, background: "#fff", padding: on ? 12 : 13, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left" }}>
              <span style={{ width: 34, height: 34, flex: "none", background: o.tagBg, color: o.tagColor, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: GS.mono, fontSize: 10, fontWeight: 700 }}>{o.tag}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: on ? GS.ink : GS.muted, lineHeight: 1.25 }}>{o.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ position: "relative", marginTop: 16, border: `1px solid ${GS.ink}`, padding: 16 }}>
        {marks()}
        <GsMono style={{ letterSpacing: ".14em" }}>Bénéficiaire</GsMono>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: GS.ink }}>GlowScan</div><div style={{ fontFamily: GS.mono, fontSize: 14, color: GS.ink, marginTop: 3 }}>{op.num}</div></div>
          <button onClick={copyNum} style={{ border: `1px solid ${GS.line}`, background: "#fff", padding: "8px 10px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>{copied ? <Check size={14} style={{ color: GS.teal }} /> : <Copy size={14} style={{ color: GS.ink }} />}<GsMono style={{ letterSpacing: 0 }}>{copied ? "COPIÉ" : "COPIER"}</GsMono></button>
        </div>
        <div style={{ height: 1, background: GS.line, margin: "14px 0" }} />
        <GsMono style={{ letterSpacing: ".14em" }}>Code à composer</GsMono>
        <div style={{ fontFamily: GS.mono, fontSize: 15, fontWeight: 600, color: GS.ink, marginTop: 6 }}>{op.ussd}</div>
        <div style={{ fontSize: 11, color: GS.muted, marginTop: 5, lineHeight: 1.5 }}>Puis : Transfert d'argent → numéro {op.num} → montant 2 000</div>
        <a href={`tel:${encodeURIComponent(op.ussd)}`} style={{ background: GS.ink, color: "#fff", padding: 13, marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontSize: 13, fontWeight: 600, textDecoration: "none" }}><Phone size={15} style={{ color: GS.accent }} />Composer le code</a>
      </div>

      <div style={{ marginTop: 16 }}>
        {["Suivez le menu, validez avec votre PIN", "Faites une capture du SMS de confirmation", "Revenez ici pour la joindre"].map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: i < 2 ? `1px solid ${GS.hair}` : "none" }}><GsMono color={GS.teal} style={{ letterSpacing: 0 }}>0{i + 1}</GsMono><span style={{ fontSize: 12, color: GS.ink }}>{t}</span></div>
        ))}
      </div>

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <button onClick={submitRequest} disabled={loading} style={{ width: "100%", background: "#fff", border: `1px solid ${GS.ink}`, color: GS.ink, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "…" : "J'ai payé, joindre la capture"} <ArrowRight size={16} style={{ color: GS.teal }} /></button>
      </div>
    </>);
  }

  // ════════ P3 · CAPTURE + WHATSAPP ════════
  if (step === "capture") {
    return shell(<>
      {stepHeader(3, () => setStep("pay"))}
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px" }}>Joindre et envoyer</div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { pickCapture(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      <div style={{ position: "relative", marginTop: 14, border: `1px solid ${GS.ink}`, padding: 8 }}>
        {marks()}
        <button onClick={() => fileRef.current?.click()} style={{ width: "100%", height: 170, background: GS.panel, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, overflow: "hidden" }}>
          {capture ? <img src={capture.url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} /> : <GsMono style={{ letterSpacing: 0 }}>Capture du SMS {op.tag}</GsMono>}
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 4px 2px" }}>
          <GsMono style={{ letterSpacing: 0 }}>{capture ? capture.name : "aucune capture"}</GsMono>
          <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontFamily: GS.mono, fontSize: 10, fontWeight: 600, color: GS.ink }}><RefreshCw size={12} />{capture ? "REMPLACER" : "AJOUTER"}</button>
        </div>
      </div>

      <GsMono style={{ display: "block", marginTop: 14, marginBottom: 8 }}>Message envoyé</GsMono>
      <div style={{ border: `1px solid ${GS.line}`, background: "#F7FAFA", padding: 10 }}>
        <div style={{ marginLeft: "auto", maxWidth: "94%", background: GS.mintTint, border: `1px solid ${GS.accentMint}`, padding: "10px 11px", fontFamily: GS.mono, fontSize: 10.5, lineHeight: 1.6, color: GS.ink }}>
          <div style={{ fontWeight: 600 }}>DEMANDE PREMIUM {requestData?.reference || ""}</div>
          <div>Formule : Premium 1 mois</div>
          <div style={{ fontWeight: 600 }}>MONTANT PAYÉ : 2 000 F · {op.tag}</div>
          <div style={{ marginTop: 4 }}>{userName} · {phone}</div>
          {userEmail && <div>{userEmail}</div>}
          <div style={{ marginTop: 4, color: GS.teal }}>{capture ? "+ capture jointe" : "capture à joindre dans WhatsApp"}</div>
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <button onClick={sendWhatsapp} style={{ width: "100%", background: "#25D366", color: GS.deep, border: "none", padding: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}><Send size={16} />Envoyer sur WhatsApp</button>
        <div style={{ fontSize: 11, color: GS.muted, textAlign: "center", marginTop: 9, lineHeight: 1.5 }}>Joignez la capture dans la conversation WhatsApp qui s'ouvre.</div>
      </div>
    </>);
  }

  // ════════ P4 · ACTIVATION (en vérification) ════════
  return shell(<>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
      <img src="/glowscan-mark.png" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo-glowscan-square.jpeg"; }} style={{ width: 28, height: 28, objectFit: "contain" }} />
      <GsMono style={{ letterSpacing: 0 }}>{requestData?.reference || ""}</GsMono>
    </div>
    <PendingCard reference={requestData?.reference || statusData?.request?.reference || ""} />
    <div style={{ marginTop: "auto", paddingTop: 20 }}>
      <button onClick={() => setLocation("/")} style={{ width: "100%", background: "#fff", border: `1px solid ${GS.ink}`, color: GS.ink, padding: 15, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Retour à l'accueil</button>
    </div>
  </>);
}

function PendingCard({ reference }: { reference: string }) {
  return (
    <>
      <div style={{ border: `1px solid ${GS.line}`, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ width: 18, height: 18, border: `1px solid ${GS.accent}`, background: GS.mintTint, flex: "none", marginTop: 1 }} />
        <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Paiement en vérification</div><GsMono color={GS.teal} style={{ letterSpacing: 0, marginTop: 3, display: "block" }}>ENVOYÉ SUR WHATSAPP</GsMono></div>
        <Clock size={16} style={{ color: GS.muted }} />
      </div>
      <div style={{ width: 1, height: 18, background: GS.line, marginLeft: 23 }} />
      <div style={{ position: "relative", border: `1px solid ${GS.ink}`, padding: 20 }}>
        <GsMarks />
        <GsMono style={{ letterSpacing: ".14em" }}>Activation sous 24 h</GsMono>
        <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-.6px", lineHeight: 1.2, marginTop: 12 }}>Dès confirmation, tout se débloque</div>
        <div style={{ fontSize: 12, color: GS.muted, marginTop: 8, lineHeight: 1.55 }}>Notre équipe valide votre paiement Mobile Money. Vous serez notifié(e) et Premium s'activera automatiquement.</div>
        {reference && <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${GS.line}` }}><span style={{ fontSize: 12, color: GS.muted }}>Référence</span><span style={{ fontFamily: GS.mono, fontSize: 13, fontWeight: 600, color: GS.ink }}>{reference}</span></div>}
      </div>
    </>
  );
}
