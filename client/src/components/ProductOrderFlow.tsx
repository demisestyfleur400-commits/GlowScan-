import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, Copy, Phone, Send, Truck, Store, Info, ImageIcon, MessageCircle, ListChecks, Sparkles } from "lucide-react";
import { GS, GsMono, GsMarks } from "@/lib/gs-ui";

// ════════════════════════════════════════════════════════════════════════
// Commande de produits — flux INTERNE 6 écrans (design « Commande Produits »).
// O1 choix · O2 bon de commande · O3 paiement mobile · O4 capture · O5 envoi
// WhatsApp (preuve) · O6 suivi. Paiement Mobile Money (Orange / MTN) avec les
// numéros GlowScan réels. Reproduit fidèlement la maquette, adapté au contexte.
// ════════════════════════════════════════════════════════════════════════

// Numéros réels GlowScan (identiques au flux consultation).
const ORANGE_NUM = "690 501 392";
const MTN_NUM = "674 377 959";
const WA_NUM = "237674377959"; // WhatsApp preuve (MTN)
const DELIVERY_FEE = 1000;

type Item = { name: string; price: number };

export function ProductOrderFlow({ items, bundle, total, kitLabel = "Kit protocole", userFirstName, phone, score, condition }: {
  items: Item[]; bundle: number; total: number; kitLabel?: string;
  userFirstName?: string | null; phone?: string | null; score?: number; condition?: string;
}) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  // O1 — sélection (par défaut : tout le kit)
  const [sel, setSel] = useState<boolean[]>(items.map(() => true));
  // O2 — bon de commande
  const [nom, setNom] = useState(userFirstName || "");
  const [tel, setTel] = useState(phone || "");
  const [ville, setVille] = useState("Douala");
  const [quartier, setQuartier] = useState("");
  const [repere, setRepere] = useState("");
  const [livraison, setLivraison] = useState(true);
  // O3/O4
  const [method, setMethod] = useState<"om" | "mtn">("om");
  const [copied, setCopied] = useState(false);
  const [txId, setTxId] = useState("");
  const [captureName, setCaptureName] = useState<string | null>(null);

  const chosen = items.filter((_, i) => sel[i]);
  const allSelected = chosen.length === items.length && items.length >= 2;
  const productTotal = allSelected ? bundle : chosen.reduce((s, it) => s + (it.price || 0), 0);
  const eco = allSelected ? Math.max(0, total - bundle) : 0;
  const fee = livraison ? DELIVERY_FEE : 0;
  const grandTotal = productTotal + fee;
  const orderRef = `GS-${String(Math.floor(1000 + Math.random() * 8999))}`;
  const beneNum = method === "om" ? ORANGE_NUM : MTN_NUM;
  const ussd = method === "om"
    ? `#150*1*1*${beneNum.replace(/\D/g, "")}*${grandTotal}#`
    : `*126#`;

  const orderMsg = encodeURIComponent(
    `BON DE COMMANDE ${orderRef}\n` +
    `${allSelected ? `${kitLabel} — ${productTotal.toLocaleString("fr-FR")} F` : `${chosen.length} produit(s)`}\n` +
    chosen.map((it) => `· ${it.name}${it.price ? ` — ${it.price.toLocaleString("fr-FR")} F` : ""}`).join("\n") +
    `\n${livraison ? `Livraison ${ville} — ${DELIVERY_FEE.toLocaleString("fr-FR")} F` : "Retrait Akwa — gratuit"}\n` +
    `TOTAL À PAYER : ${grandTotal.toLocaleString("fr-FR")} F · ${method === "om" ? "Orange Money" : "MTN MoMo"}\n` +
    (txId ? `ID transaction : ${txId}\n` : "") +
    `\n${nom || "Client"}${tel ? ` · ${tel}` : ""}\n${[quartier, repere].filter(Boolean).join(", ")}\n` +
    (score != null ? `\nGlow Score ${score}/100 · ${condition || "—"}` : "") +
    `\n\n(Je joins la capture du paiement 🙏)`
  );

  const copyNum = async () => { try { await navigator.clipboard.writeText(beneNum.replace(/\s/g, "")); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };

  // Persiste la commande en base (suivi in-app) — table orders existante.
  const [submitting, setSubmitting] = useState(false);
  const submitOrder = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/orders", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderNumber: orderRef,
          clientName: nom || "Client",
          clientPhone: (tel || "").replace(/\s/g, "") || "—",
          clientAddress: [quartier, repere, ville].filter(Boolean).join(", ") || ville,
          clientNotes: livraison ? `Livraison ${ville}` : "Retrait Akwa",
          items: chosen.map((it) => ({ name: it.name, price: it.price })),
          totalPrice: grandTotal,
          brand: "GlowScan",
          whatsappNumber: WA_NUM,
        }),
      });
    } catch {} finally { setSubmitting(false); }
  };

  // ── Déclencheur (bouton dans le rapport 04C) ──
  if (!open) {
    return (
      <button onClick={() => { setOpen(true); setStep(1); }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", boxSizing: "border-box", background: GS.ink, color: "#fff", border: "none", padding: 17, fontSize: 14, fontWeight: 600, fontFamily: GS.sans, cursor: "pointer" }}>
        Commander le protocole · {bundle.toLocaleString("fr-FR")} FCFA
      </button>
    );
  }

  // ── Chrome commun overlay ──
  const HeadBar = ({ n }: { n: number }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <button onClick={() => (step > 1 ? setStep(step - 1) : setOpen(false))} aria-label="Retour" style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: GS.ink, display: "flex" }}><ArrowLeft size={20} strokeWidth={1.8} /></button>
      <GsMono>Étape {n} / 5</GsMono>
      <div style={{ width: 20 }} />
    </div>
  );
  const primary = (label: string, onClick: () => void, icon = true) => (
    <button onClick={onClick} style={{ width: "100%", boxSizing: "border-box", background: GS.ink, color: "#fff", border: "none", padding: 17, fontSize: 14, fontWeight: 600, fontFamily: GS.sans, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>{label}{icon && <ArrowRight size={16} style={{ color: GS.accent }} strokeWidth={2} />}</button>
  );
  const secondary = (label: string, onClick: () => void) => (
    <button onClick={onClick} style={{ width: "100%", boxSizing: "border-box", background: "#fff", color: GS.ink, border: `1px solid ${GS.ink}`, padding: 16, fontSize: 14, fontWeight: 600, fontFamily: GS.sans, cursor: "pointer" }}>{label}</button>
  );

  const content = () => {
    // O1 — CHOIX DES PRODUITS
    if (step === 1) return (
      <>
        <HeadBar n={1} />
        <GsMono color={GS.teal}>Protocole GlowScan{score != null ? ` · Glow Score ${score}` : ""}</GsMono>
        <div style={{ fontSize: 23, fontWeight: 600, color: GS.ink, letterSpacing: "-.7px", lineHeight: 1.18, marginTop: 6 }}>Votre routine, 30 jours</div>
        <div style={{ fontSize: 12, color: GS.muted, marginTop: 6, lineHeight: 1.5 }}>Décochez un produit pour commander à l'unité.</div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it, i) => (
            <button key={i} onClick={() => setSel((s) => s.map((v, j) => j === i ? !v : v))}
              style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: `1px solid ${sel[i] ? GS.ink : GS.line}`, padding: 11, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ width: 20, height: 20, flex: "none", ...(sel[i] ? { background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center" } : { border: `1px solid ${GS.disabled}` }) }}>{sel[i] && <Check size={13} style={{ color: GS.accent }} strokeWidth={3} />}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: GS.ink, lineHeight: 1.3 }}>{it.name}</div>
              </div>
              <span style={{ fontFamily: GS.mono, fontSize: 12, fontWeight: 600, color: GS.ink, flex: "none" }}>{(it.price || 0).toLocaleString("fr-FR")} F</span>
            </button>
          ))}
        </div>
        {allSelected && eco > 0 && (
          <div style={{ position: "relative", marginTop: 14, border: `1px solid ${GS.accent}`, background: "#F0FCFA", padding: 14 }}>
            <GsMarks />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <GsMono color={GS.teal} style={{ letterSpacing: ".1em" }}>Les {items.length} = kit 30j</GsMono>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: GS.mono, fontSize: 11, color: GS.muted, textDecoration: "line-through" }}>{total.toLocaleString("fr-FR")} F</div>
                <div style={{ fontFamily: GS.mono, fontSize: 17, fontWeight: 600, color: GS.ink }}>{bundle.toLocaleString("fr-FR")} F</div>
              </div>
            </div>
            <div style={{ height: 1, background: GS.accentMint, margin: "11px 0" }} />
            <GsMono color={GS.teal} style={{ letterSpacing: ".04em" }}>Vous économisez {eco.toLocaleString("fr-FR")} F</GsMono>
          </div>
        )}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingBottom: 12, borderBottom: `1px solid ${GS.line}`, marginBottom: 13 }}>
            <span style={{ fontSize: 12, color: GS.muted }}>{chosen.length} produit(s){allSelected ? " · kit" : ""}</span>
            <span style={{ fontFamily: GS.mono, fontSize: 20, fontWeight: 600, color: GS.ink }}>{productTotal.toLocaleString("fr-FR")} F</span>
          </div>
          {primary("Remplir le bon de commande", () => setStep(2))}
        </div>
      </>
    );

    // O2 — BON DE COMMANDE
    if (step === 2) {
      const field = (label: string, val: string, set: (v: string) => void, ph = "", editable = true) => (
        <div>
          <div style={{ marginBottom: 5 }}><GsMono style={{ letterSpacing: ".12em" }}>{label}</GsMono></div>
          {editable
            ? <input value={val} onChange={(e) => set(e.target.value)} placeholder={ph} style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${GS.ink}`, padding: "11px 12px", fontFamily: GS.sans, fontSize: 13, color: GS.ink, outline: "none", borderRadius: 0 }} />
            : <div style={{ border: `1px solid ${GS.line}`, padding: "11px 12px", fontSize: 13, color: GS.ink }}>{val || "—"}</div>}
        </div>
      );
      return (
        <>
          <HeadBar n={2} />
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: GS.ink, letterSpacing: "-.6px" }}>Bon de commande</div>
            <GsMono>N° {orderRef}</GsMono>
          </div>
          <div style={{ display: "inline-flex", alignSelf: "flex-start", alignItems: "center", gap: 7, border: `1px solid ${GS.accent}`, background: GS.mintBg, padding: "5px 9px", marginTop: 9 }}>
            <Sparkles size={12} style={{ color: GS.teal }} /><GsMono color={GS.teal} style={{ letterSpacing: ".08em" }}>Pré-rempli depuis votre profil</GsMono>
          </div>
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {field("Nom complet", nom, setNom, "Votre nom")}
            {field("Téléphone de livraison", tel, setTel, "6XX XXX XXX")}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {field("Ville", ville, setVille)}
              {field("Quartier", quartier, setQuartier, "ex. Bonapriso")}
            </div>
            {field("Point de repère", repere, setRepere, "ex. derrière la pharmacie du Wouri")}
          </div>
          <div style={{ marginTop: 14, marginBottom: 6 }}><GsMono style={{ letterSpacing: ".12em" }}>Réception</GsMono></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => setLivraison(true)} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: `1px solid ${livraison ? GS.ink : GS.line}`, padding: 11 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Truck size={16} style={{ color: GS.ink }} />{livraison ? <span style={{ width: 14, height: 14, background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={10} style={{ color: GS.accent }} strokeWidth={3} /></span> : <span style={{ width: 14, height: 14, border: `1px solid ${GS.disabled}` }} />}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: GS.ink, marginTop: 7 }}>Livraison</div><GsMono style={{ letterSpacing: 0 }}>24 h · {DELIVERY_FEE.toLocaleString("fr-FR")} F</GsMono>
            </button>
            <button onClick={() => setLivraison(false)} style={{ textAlign: "left", cursor: "pointer", background: "#fff", border: `1px solid ${!livraison ? GS.ink : GS.line}`, padding: 11 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><Store size={16} style={{ color: GS.ink }} />{!livraison ? <span style={{ width: 14, height: 14, background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center" }}><Check size={10} style={{ color: GS.accent }} strokeWidth={3} /></span> : <span style={{ width: 14, height: 14, border: `1px solid ${GS.disabled}` }} />}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: GS.ink, marginTop: 7 }}>Retrait</div><GsMono style={{ letterSpacing: 0 }}>Akwa · gratuit</GsMono>
            </button>
          </div>
          <div style={{ marginTop: 16, borderTop: `1px solid ${GS.line}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 5, marginBottom: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: GS.muted }}><span>{allSelected ? kitLabel : `${chosen.length} produit(s)`}</span><span style={{ fontFamily: GS.mono, color: GS.ink }}>{productTotal.toLocaleString("fr-FR")} F</span></div>
            {fee > 0 && <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: GS.muted }}><span>Livraison {ville}</span><span style={{ fontFamily: GS.mono, color: GS.ink }}>{fee.toLocaleString("fr-FR")} F</span></div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}><GsMono style={{ letterSpacing: ".12em" }}>Total</GsMono><span style={{ fontFamily: GS.mono, fontSize: 20, fontWeight: 600, color: GS.ink }}>{grandTotal.toLocaleString("fr-FR")} F</span></div>
          </div>
          {primary("Passer au paiement", () => { if (!nom.trim() || (tel || "").replace(/\D/g, "").length < 8) { alert("Renseignez votre nom et un numéro de livraison valide."); return; } setStep(3); })}
        </>
      );
    }

    // O3 — PAIEMENT
    if (step === 3) return (
      <>
        <HeadBar n={3} />
        <div style={{ fontSize: 22, fontWeight: 600, color: GS.ink, letterSpacing: "-.6px" }}>Payer {grandTotal.toLocaleString("fr-FR")} F</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
          <button onClick={() => setMethod("om")} style={{ cursor: "pointer", background: "#fff", border: `${method === "om" ? 2 : 1}px solid ${method === "om" ? GS.ink : GS.line}`, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 34, height: 34, background: "#FF7900", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: GS.mono, fontSize: 10, fontWeight: 700, color: "#fff", flex: "none" }}>OM</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: method === "om" ? GS.ink : GS.muted }}>Orange Money</span>
          </button>
          <button onClick={() => setMethod("mtn")} style={{ cursor: "pointer", background: "#fff", border: `${method === "mtn" ? 2 : 1}px solid ${method === "mtn" ? GS.ink : GS.line}`, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 34, height: 34, background: "#FFCC00", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: GS.mono, fontSize: 9, fontWeight: 700, color: GS.ink, flex: "none" }}>MoMo</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: method === "mtn" ? GS.ink : GS.muted }}>MTN Mobile Money</span>
          </button>
        </div>
        <div style={{ position: "relative", marginTop: 16, border: `1px solid ${GS.ink}`, padding: 16 }}>
          <GsMarks />
          <GsMono>Bénéficiaire</GsMono>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
            <div><div style={{ fontSize: 14, fontWeight: 600, color: GS.ink }}>GlowScan Dermo</div><div style={{ fontFamily: GS.mono, fontSize: 14, color: GS.ink, marginTop: 3 }}>{beneNum}</div></div>
            <button onClick={copyNum} style={{ border: `1px solid ${GS.line}`, background: "#fff", padding: "8px 10px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}><Copy size={14} style={{ color: GS.ink }} /><GsMono style={{ letterSpacing: 0 }}>{copied ? "COPIÉ" : "COPIER"}</GsMono></button>
          </div>
          <div style={{ height: 1, background: GS.line, margin: "14px 0" }} />
          <GsMono>Code à composer</GsMono>
          <div style={{ fontFamily: GS.mono, fontSize: 15, fontWeight: 600, color: GS.ink, marginTop: 6 }}>{ussd}</div>
          <a href={`tel:${encodeURIComponent(ussd)}`} style={{ background: GS.ink, color: "#fff", padding: 13, marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 9, fontSize: 13, fontWeight: 600, textDecoration: "none" }}><Phone size={15} style={{ color: GS.accent }} />Composer le code</a>
        </div>
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column" }}>
          {["Composez le code, validez avec votre PIN", "Faites une capture du SMS de confirmation", "Revenez ici pour la joindre"].map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "9px 0", borderBottom: i < 2 ? `1px solid ${GS.hair}` : "none" }}><GsMono color={GS.teal}>0{i + 1}</GsMono><span style={{ fontSize: 12, color: GS.ink }}>{t}</span></div>
          ))}
        </div>
        <div style={{ marginTop: 18 }}>{secondary("J'ai payé, joindre la capture", () => setStep(4))}</div>
      </>
    );

    // O4 — CAPTURE
    if (step === 4) return (
      <>
        <HeadBar n={4} />
        <div style={{ fontSize: 22, fontWeight: 600, color: GS.ink, letterSpacing: "-.6px" }}>Joindre la preuve</div>
        <div style={{ fontSize: 12, color: GS.muted, marginTop: 6, lineHeight: 1.5 }}>La capture du SMS {method === "om" ? "Orange Money" : "MTN MoMo"} suffit.</div>
        <label style={{ position: "relative", marginTop: 16, border: `1px solid ${GS.ink}`, padding: 8, display: "block", cursor: "pointer" }}>
          <GsMarks />
          <div style={{ height: 200, background: GS.panel, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: GS.faint }}>
            <ImageIcon size={18} /><GsMono style={{ letterSpacing: 0 }}>{captureName || "Choisir la capture"}</GsMono>
          </div>
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => setCaptureName(e.target.files?.[0]?.name || null)} />
        </label>
        <div style={{ marginTop: 14, marginBottom: 8 }}><GsMono style={{ letterSpacing: ".12em" }}>La capture doit montrer</GsMono></div>
        <div style={{ border: `1px solid ${GS.line}` }}>
          {[["Le montant", `${grandTotal.toLocaleString("fr-FR")} F`], ["Le bénéficiaire", beneNum], ["L'ID de transaction", ""]].map(([l, v], i) => (
            <div key={i} style={{ padding: "10px 12px", borderBottom: i < 2 ? `1px solid ${GS.hair}` : "none", display: "flex", alignItems: "center", gap: 10 }}><Check size={14} style={{ color: GS.teal }} strokeWidth={2.5} /><span style={{ flex: 1, fontSize: 12, color: GS.ink }}>{l}</span>{v && <span style={{ fontFamily: GS.mono, fontSize: 11, color: GS.ink }}>{v}</span>}</div>
          ))}
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ marginBottom: 5 }}><GsMono style={{ letterSpacing: ".12em" }}>ID transaction · facultatif</GsMono></div>
          <input value={txId} onChange={(e) => setTxId(e.target.value)} placeholder="ex. MP260923.1105.C48217" style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${GS.line}`, padding: "11px 12px", fontFamily: GS.mono, fontSize: 13, color: GS.ink, outline: "none", borderRadius: 0 }} />
        </div>
        <div style={{ marginTop: 18 }}>{primary("Vérifier le message WhatsApp", () => setStep(5))}</div>
      </>
    );

    // O5 — ENVOI WHATSAPP
    if (step === 5) return (
      <>
        <HeadBar n={5} />
        <div style={{ fontSize: 22, fontWeight: 600, color: GS.ink, letterSpacing: "-.6px" }}>Dernière vérification</div>
        <div style={{ fontSize: 12, color: GS.muted, marginTop: 6, lineHeight: 1.5 }}>Ce message part vers GlowScan Dermo. Joignez la capture puis appuyez sur Envoyer.</div>
        <div style={{ marginTop: 16, border: `1px solid ${GS.line}`, background: "#F7FAFA", padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10, borderBottom: `1px solid ${GS.line}`, marginBottom: 12 }}>
            <span style={{ width: 30, height: 30, background: "#25D366", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><MessageCircle size={16} style={{ color: "#fff" }} /></span>
            <div><div style={{ fontSize: 12, fontWeight: 600, color: GS.ink }}>GlowScan Dermo</div><GsMono style={{ letterSpacing: 0 }}>+237 {MTN_NUM}</GsMono></div>
          </div>
          <div style={{ marginLeft: "auto", maxWidth: "92%", background: "#DFF7F2", border: `1px solid ${GS.accentMint}`, padding: 6 }}>
            <div style={{ height: 70, background: GS.panel, border: `1px solid #C9D6D6`, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}><ImageIcon size={16} style={{ color: GS.muted }} /><GsMono style={{ letterSpacing: 0 }}>{captureName ? "capture jointe" : "capture paiement"}</GsMono></div>
            <div style={{ padding: "9px 5px 3px", fontFamily: GS.mono, fontSize: 10.5, lineHeight: 1.6, color: GS.ink }}>
              <div style={{ fontWeight: 600 }}>BON DE COMMANDE {orderRef}</div>
              {chosen.map((it, i) => <div key={i}>· {it.name}</div>)}
              <div>{livraison ? `Livraison ${ville} — ${DELIVERY_FEE.toLocaleString("fr-FR")} F` : "Retrait Akwa"}</div>
              <div style={{ fontWeight: 600 }}>TOTAL : {grandTotal.toLocaleString("fr-FR")} F · {method === "om" ? "OM" : "MTN"}</div>
              <div style={{ marginTop: 4 }}>{nom || "Client"}{tel ? ` · ${tel}` : ""}</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 12, border: `1px solid ${GS.accent}`, background: GS.mintBg, padding: 12, display: "flex", gap: 11, alignItems: "flex-start" }}>
          <Info size={16} style={{ color: GS.teal, marginTop: 1, flexShrink: 0 }} />
          <div style={{ fontSize: 11, lineHeight: 1.5, color: GS.ink }}>WhatsApp va s'ouvrir avec ce texte. <strong>Ajoutez la capture</strong> puis appuyez sur Envoyer, et revenez dans GlowScan.</div>
        </div>
        <div style={{ marginTop: 18 }}>
          <a href={`https://wa.me/${WA_NUM}?text=${orderMsg}`} target="_blank" rel="noreferrer" onClick={() => { submitOrder(); setTimeout(() => setStep(6), 400); }}
            style={{ background: "#25D366", color: "#05262B", padding: 17, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontSize: 14, fontWeight: 700, textDecoration: "none" }}><Send size={16} />Envoyer sur WhatsApp</a>
        </div>
      </>
    );

    // O6 — SUIVI
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <img src="/glowscan-mark.png" alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} style={{ width: 28, height: 28 }} />
          <GsMono>{orderRef}</GsMono>
        </div>
        <span style={{ width: 48, height: 48, background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}><Check size={24} style={{ color: GS.accent }} strokeWidth={2.5} /></span>
        <div style={{ fontSize: 23, fontWeight: 600, color: GS.ink, letterSpacing: "-.7px", lineHeight: 1.18 }}>Commande envoyée</div>
        <div style={{ fontSize: 12, color: GS.muted, marginTop: 7, lineHeight: 1.55 }}>Nous vérifions votre paiement. Vous serez notifié ici et sur WhatsApp.</div>
        <div style={{ marginTop: 20, borderLeft: `1px solid ${GS.line}`, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 15 }}>
          {[["Bon de commande envoyé", "WHATSAPP", "done"], ["Vérification du paiement", "EN COURS · SOUS 1 H", "current"], ["Préparation et livraison", livraison ? `DEMAIN · ${(quartier || ville).toUpperCase()}` : "RETRAIT AKWA", "todo"]].map(([t, s, st], i) => (
            <div key={i} style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: -21, top: 3, width: 9, height: 9, ...(st === "done" ? { background: GS.accent } : st === "current" ? { border: `1px solid ${GS.accent}`, background: GS.mintTint } : { border: `1px solid ${GS.disabled}`, background: "#fff" }) }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: st === "todo" ? GS.muted : GS.ink }}>{t}</div>
              <GsMono color={st === "current" ? GS.teal : GS.faint} style={{ letterSpacing: 0 }}>{s}</GsMono>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
          {primary("Voir ma routine", () => { setOpen(false); setLocation("/profile"); }, false)}
          {secondary("Retour à mon résultat", () => { setOpen(false); setStep(1); })}
        </div>
      </>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, background: "#fff", overflowY: "auto" }}>
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100dvh", padding: "16px 24px 28px", boxSizing: "border-box", fontFamily: GS.sans, color: GS.ink, display: "flex", flexDirection: "column" }}>
        {content()}
      </div>
    </div>
  );
}
