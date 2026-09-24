import { useState, useRef } from "react";
import { GS, GsMono, GsMarks, useGsFonts } from "@/lib/gs-ui";
import {
  X, ArrowLeft, ArrowRight, Copy, Check, Phone, RefreshCw, Send,
  UserCheck, FileText, MessageCircle, Clock,
} from "lucide-react";

// ════════════════════════════════════════════════════════════════════════
// ABONNEMENT DERMATOLOGUE — refonte fidèle au design (D1→D4).
//   D1 Formule & bon · D2 Paiement Orange/MTN · D3 Capture + WhatsApp ·
//   D4 Compte actif (en vérification)
// Câblé à POST /api/pro/subscribe { method, phone, plan }. Overlay plein écran
// gs-ui, monté depuis ProCabinet. Numéros Mobile Money = les miens.
// ════════════════════════════════════════════════════════════════════════

const OPS = {
  orange_money: { label: "Orange Money", tag: "OM", tagBg: "#FF7900", tagColor: "#fff", num: "690 501 392", ussd: "#150#" },
  mtn_momo: { label: "MTN Mobile Money", tag: "MoMo", tagBg: "#FFCC00", tagColor: "#0B1719", num: "674 377 959", ussd: "*126#" },
} as const;
type Method = keyof typeof OPS;
type Plan = "monthly" | "annual";
const PLANS = {
  monthly: { label: "Mensuel", sub: "Sans engagement", price: 10000, priceLabel: "10 000 F", per: "/ MOIS" },
  annual: { label: "Annuel", sub: "Soit 8 334 F / mois", price: 100000, priceLabel: "100 000 F", per: "", strike: "120 000 F", badge: "2 MOIS OFFERTS" },
} as const;
type Step = "bon" | "pay" | "capture" | "done";

export function DermSubscribeFlow({ fullName, licenseNumber, email, refNo, defaultPhone, onClose }: {
  fullName: string; licenseNumber?: string | null; email?: string | null; refNo: string; defaultPhone?: string | null; onClose: () => void;
}) {
  useGsFonts();
  const [step, setStep] = useState<Step>("bon");
  const [plan, setPlan] = useState<Plan>("annual");
  const [method, setMethod] = useState<Method>("orange_money");
  const [phone, setPhone] = useState<string>((defaultPhone || "").replace(/^\+?237/, "").trim());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [requestData, setRequestData] = useState<{ reference: string; ownerWaUrl?: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [capture, setCapture] = useState<{ url: string; name: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const op = OPS[method];
  const pl = PLANS[plan];
  const copyNum = () => { try { navigator.clipboard?.writeText(op.num.replace(/\s/g, "")); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} };

  const submitRequest = async () => {
    if (!phone.trim() || phone.trim().replace(/\D/g, "").length < 8) { setErr("Entrez le numéro Mobile Money qui a payé."); return; }
    setLoading(true); setErr("");
    try {
      const res = await fetch("/api/pro/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ method, phone: phone.trim(), plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setRequestData({ reference: data.request.reference, ownerWaUrl: data.ownerWaUrl });
      setStep("capture");
    } catch (e: any) { setErr(e?.message || "Erreur réseau."); } finally { setLoading(false); }
  };
  const pickCapture = (f: File | undefined | null) => { if (!f || !f.type.startsWith("image/")) return; setCapture({ url: URL.createObjectURL(f), name: f.name }); };
  const sendWhatsapp = () => { if (requestData?.ownerWaUrl) window.open(requestData.ownerWaUrl, "_blank", "noopener,noreferrer"); setStep("done"); };

  const wrap = (children: React.ReactNode) => (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: GS.mintBg, overflowY: "auto", fontFamily: GS.sans, color: GS.ink }}>
      <div style={{ width: "100%", maxWidth: 430, margin: "0 auto", padding: "16px 24px 32px", boxSizing: "border-box", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>{children}</div>
    </div>
  );
  const head = (n: number, back: () => void, closeIcon = false) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <button onClick={back} aria-label="Retour" style={{ background: "none", border: "none", cursor: "pointer", color: GS.ink, display: "flex", padding: 0 }}>{closeIcon ? <X size={20} /> : <ArrowLeft size={20} />}</button>
      <GsMono style={{ letterSpacing: ".14em" }}>ÉTAPE {n} / 3</GsMono>
      <div style={{ width: 20 }} />
    </div>
  );

  // ── D1 · FORMULE & BON ──
  if (step === "bon") {
    return wrap(<>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}><img src="/glowscan-mark.png" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo-glowscan-square.jpeg"; }} style={{ width: 26, height: 26, objectFit: "contain" }} /><GsMono style={{ letterSpacing: ".14em", color: GS.ink }}>DERM</GsMono></div>
        <button onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", cursor: "pointer", color: GS.muted, display: "flex" }}><X size={20} /></button>
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px", lineHeight: 1.2 }}>Choisir votre formule</div>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
        {(Object.keys(PLANS) as Plan[]).map((p) => {
          const P = PLANS[p] as any; const on = plan === p;
          return (
            <button key={p} onClick={() => setPlan(p)} style={{ position: "relative", border: on ? `2px solid ${GS.ink}` : `1px solid ${GS.line}`, background: "#fff", padding: on ? 13 : 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left" }}>
              {P.badge && <span style={{ position: "absolute", top: -10, right: 12, background: GS.grad, padding: "3px 8px", fontFamily: GS.mono, fontSize: 9, fontWeight: 700, letterSpacing: ".1em", color: GS.deep }}>{P.badge}</span>}
              <span style={{ width: 18, height: 18, flex: "none", border: on ? "none" : `1px solid ${GS.disabled}`, background: on ? GS.ink : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>{on && <Check size={12} style={{ color: GS.accent }} strokeWidth={3} />}</span>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: GS.ink }}>{P.label}</div><div style={{ fontSize: 11, color: GS.muted, marginTop: 2 }}>{P.sub}</div></div>
              <div style={{ textAlign: "right" }}>{P.strike && <div style={{ fontFamily: GS.mono, fontSize: 11, color: GS.muted, textDecoration: "line-through" }}>{P.strike}</div>}<div style={{ fontFamily: GS.mono, fontSize: 16, fontWeight: 600, color: GS.ink }}>{P.priceLabel}</div>{P.per && <div style={{ fontFamily: GS.mono, fontSize: 9, color: GS.muted }}>{P.per}</div>}</div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 14, border: `1px solid ${GS.line}` }}>
        <div style={{ padding: "9px 12px", borderBottom: `1px solid ${GS.hair}` }}><GsMono style={{ letterSpacing: ".12em" }}>Inclus</GsMono></div>
        {[{ icon: UserCheck, t: "Profil public visible des patients" }, { icon: FileText, t: "Rapport IA avant chaque consultation" }, { icon: MessageCircle, t: "Chat, ordonnance, dashboard patients" }].map((f, i) => {
          const I = f.icon;
          return <div key={i} style={{ padding: "9px 12px", borderBottom: i < 2 ? `1px solid ${GS.hair}` : "none", display: "flex", alignItems: "center", gap: 10 }}><I size={15} style={{ color: GS.teal }} /><span style={{ fontSize: 12, color: GS.ink }}>{f.t}</span></div>;
        })}
      </div>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: 14 }}>
        <GsMono style={{ letterSpacing: ".12em" }}>Praticien · pré-rempli</GsMono>
        <GsMono style={{ letterSpacing: 0 }}>N° {refNo}</GsMono>
      </div>
      <div style={{ marginTop: 7, border: `1px solid ${GS.line}` }}>
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${GS.hair}`, display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 12, color: GS.muted }}>Nom</span><span style={{ fontSize: 13, color: GS.ink }}>{fullName}</span></div>
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${GS.hair}`, display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 12, color: GS.muted }}>N° Ordre</span><span style={{ fontFamily: GS.mono, fontSize: 12, color: GS.ink }}>{licenseNumber || "—"}</span></div>
        <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 12, color: GS.muted }}>Email pro</span><span style={{ fontSize: 12, color: GS.ink, wordBreak: "break-all" }}>{email || "—"}</span></div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 12, borderBottom: `1px solid ${GS.line}`, marginBottom: 13 }}>
          <span style={{ fontSize: 12, color: GS.muted }}>{pl.label}{plan === "annual" ? " · 12 mois" : " · 1 mois"}</span>
          <span style={{ fontFamily: GS.mono, fontSize: 20, fontWeight: 600, color: GS.ink }}>{pl.priceLabel}</span>
        </div>
        <button onClick={() => setStep("pay")} style={{ width: "100%", background: GS.ink, color: "#fff", border: "none", padding: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Passer au paiement <ArrowRight size={16} style={{ color: GS.accent }} /></button>
      </div>
    </>);
  }

  // ── D2 · PAIEMENT ──
  if (step === "pay") {
    return wrap(<>
      {head(2, () => setStep("bon"))}
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px" }}>Payer {pl.priceLabel}</div>
      {err && <div style={{ marginTop: 8, fontFamily: GS.mono, fontSize: 11, color: GS.red }}>{err}</div>}

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
        <GsMarks />
        <GsMono style={{ letterSpacing: ".14em" }}>Bénéficiaire</GsMono>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
          <div><div style={{ fontSize: 14, fontWeight: 600, color: GS.ink }}>GlowScan</div><div style={{ fontFamily: GS.mono, fontSize: 14, color: GS.ink, marginTop: 3 }}>{op.num}</div></div>
          <button onClick={copyNum} style={{ border: `1px solid ${GS.line}`, background: "#fff", padding: "8px 10px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>{copied ? <Check size={14} style={{ color: GS.teal }} /> : <Copy size={14} style={{ color: GS.ink }} />}<GsMono style={{ letterSpacing: 0 }}>{copied ? "COPIÉ" : "COPIER"}</GsMono></button>
        </div>
        <div style={{ height: 1, background: GS.line, margin: "14px 0" }} />
        <GsMono style={{ letterSpacing: ".14em" }}>Code à composer</GsMono>
        <div style={{ fontFamily: GS.mono, fontSize: 15, fontWeight: 600, color: GS.ink, marginTop: 6 }}>{op.ussd}</div>
        <div style={{ fontSize: 11, color: GS.muted, marginTop: 5, lineHeight: 1.5 }}>Puis : Transfert d'argent → numéro {op.num} → montant {pl.price.toLocaleString("fr-FR")}</div>
        <a href={`tel:${encodeURIComponent(op.ussd)}`} style={{ background: GS.ink, color: "#fff", padding: 13, marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontSize: 13, fontWeight: 600, textDecoration: "none" }}><Phone size={15} style={{ color: GS.accent }} />Composer le code</a>
      </div>

      <div style={{ marginTop: 16 }}>
        {["Suivez le menu, validez avec votre PIN", "Faites une capture du SMS de confirmation", "Revenez ici pour la joindre"].map((t, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: i < 2 ? `1px solid ${GS.hair}` : "none" }}><GsMono color={GS.teal} style={{ letterSpacing: 0 }}>0{i + 1}</GsMono><span style={{ fontSize: 12, color: GS.ink }}>{t}</span></div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <GsMono style={{ display: "block", marginBottom: 6 }}>Votre numéro de paiement</GsMono>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="6XX XXX XXX" style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", border: `1px solid ${GS.line}`, fontFamily: GS.mono, fontSize: 13, color: GS.ink, outline: "none" }} />
      </div>

      <div style={{ marginTop: "auto", paddingTop: 18 }}>
        <button onClick={submitRequest} disabled={loading} style={{ width: "100%", background: "#fff", border: `1px solid ${GS.ink}`, color: GS.ink, padding: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 600, cursor: loading ? "wait" : "pointer", opacity: loading ? 0.6 : 1 }}>{loading ? "…" : "J'ai payé, joindre la capture"} <ArrowRight size={16} style={{ color: GS.teal }} /></button>
      </div>
    </>);
  }

  // ── D3 · CAPTURE + WHATSAPP ──
  if (step === "capture") {
    return wrap(<>
      {head(3, () => setStep("pay"))}
      <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-.6px" }}>Joindre et envoyer</div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { pickCapture(e.target.files?.[0]); e.currentTarget.value = ""; }} />
      <div style={{ position: "relative", marginTop: 14, border: `1px solid ${GS.ink}`, padding: 8 }}>
        <GsMarks />
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
          <div style={{ fontWeight: 600 }}>ABONNEMENT DERM {requestData?.reference || ""}</div>
          <div>Formule : {pl.label}{plan === "annual" ? " · 12 mois" : " · 1 mois"}</div>
          <div style={{ fontWeight: 600 }}>MONTANT PAYÉ : {pl.price.toLocaleString("fr-FR")} F · {op.tag}</div>
          <div style={{ marginTop: 4 }}>{fullName}{licenseNumber ? ` · Ordre ${licenseNumber}` : ""}</div>
          {email && <div>{email}</div>}
          <div style={{ marginTop: 4, color: GS.teal }}>{capture ? "+ capture jointe" : "capture à joindre dans WhatsApp"}</div>
        </div>
      </div>

      <div style={{ marginTop: "auto", paddingTop: 20 }}>
        <button onClick={sendWhatsapp} style={{ width: "100%", background: "#25D366", color: GS.deep, border: "none", padding: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 700, cursor: "pointer" }}><Send size={16} />Envoyer sur WhatsApp</button>
        <div style={{ fontSize: 11, color: GS.muted, textAlign: "center", marginTop: 9, lineHeight: 1.5 }}>Joignez la capture dans la conversation WhatsApp qui s'ouvre.</div>
      </div>
    </>);
  }

  // ── D4 · COMPTE ACTIF (en vérification) ──
  return wrap(<>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}><img src="/glowscan-mark.png" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo-glowscan-square.jpeg"; }} style={{ width: 26, height: 26, objectFit: "contain" }} /><GsMono style={{ letterSpacing: ".14em", color: GS.ink }}>DERM</GsMono></div>
      <GsMono style={{ letterSpacing: 0 }}>{requestData?.reference || refNo}</GsMono>
    </div>

    <div style={{ border: `1px solid ${GS.line}`, padding: 14, display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{ width: 18, height: 18, border: `1px solid ${GS.accent}`, background: GS.mintTint, flex: "none", marginTop: 1 }} />
      <div style={{ flex: 1 }}><div style={{ fontSize: 13, fontWeight: 600, color: GS.ink }}>Paiement en vérification</div><GsMono color={GS.teal} style={{ letterSpacing: 0, marginTop: 3, display: "block" }}>ENVOYÉ SUR WHATSAPP</GsMono></div>
      <Clock size={16} style={{ color: GS.muted }} />
    </div>
    <div style={{ width: 1, height: 18, background: GS.line, marginLeft: 23 }} />

    <div style={{ position: "relative", border: `1px solid ${GS.ink}`, padding: 20 }}>
      <GsMarks />
      <GsMono style={{ letterSpacing: ".14em" }}>Abonnement · activation sous 24 h</GsMono>
      <div style={{ fontSize: 23, fontWeight: 600, letterSpacing: "-.7px", lineHeight: 1.18, marginTop: 14 }}>Bienvenue, {fullName.replace(/^Dr\.?\s*/i, "Dr ")}</div>
      <div style={{ fontSize: 12, color: GS.muted, marginTop: 7, lineHeight: 1.55 }}>Dès validation du paiement, votre profil sera visible des patients GlowScan.</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: GS.line, border: `1px solid ${GS.line}`, marginTop: 14 }}>
        <div style={{ background: "#fff", padding: 11 }}><GsMono style={{ letterSpacing: ".1em" }}>Formule</GsMono><div style={{ fontFamily: GS.mono, fontSize: 13, fontWeight: 600, color: GS.ink, marginTop: 3 }}>{pl.label}</div></div>
        <div style={{ background: "#fff", padding: 11 }}><GsMono style={{ letterSpacing: ".1em" }}>Montant</GsMono><div style={{ fontFamily: GS.mono, fontSize: 13, fontWeight: 600, color: GS.ink, marginTop: 3 }}>{pl.priceLabel}</div></div>
      </div>
    </div>

    <GsMono style={{ display: "block", marginTop: 18, marginBottom: 8 }}>Pour recevoir vos premiers patients</GsMono>
    <div style={{ border: `1px solid ${GS.line}` }}>
      <a href="/derm/profil-public" style={{ padding: 12, borderBottom: `1px solid ${GS.hair}`, display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}><span style={{ width: 14, height: 14, border: `1px solid ${GS.ink}`, flex: "none" }} /><span style={{ flex: 1, fontSize: 12, color: GS.ink }}>Photo de profil et spécialités</span><ArrowRight size={14} style={{ color: GS.ink }} /></a>
      <a href="/derm/cabinet" style={{ padding: 12, display: "flex", alignItems: "center", gap: 11, textDecoration: "none" }}><span style={{ width: 14, height: 14, border: `1px solid ${GS.ink}`, flex: "none" }} /><span style={{ flex: 1, fontSize: 12, color: GS.ink }}>Tarif de consultation</span><ArrowRight size={14} style={{ color: GS.ink }} /></a>
    </div>

    <div style={{ marginTop: "auto", paddingTop: 20 }}>
      <button onClick={() => { window.location.href = "/derm/dashboard"; }} style={{ width: "100%", background: GS.ink, color: "#fff", border: "none", padding: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Ouvrir mon dashboard <ArrowRight size={16} style={{ color: GS.accent }} /></button>
      {email && <div style={{ fontSize: 11, color: GS.muted, textAlign: "center", marginTop: 11 }}>Reçu envoyé à {email}</div>}
    </div>
  </>);
}
