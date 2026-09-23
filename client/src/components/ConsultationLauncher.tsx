import { useEffect, useState } from "react";
import { PRIVACY_POLICY_VERSION } from "@/components/ConsentBanner";
import { GS, GsMono, useGsFonts } from "@/lib/gs-ui";
import { Check, Copy, ArrowRight, ShieldCheck } from "lucide-react";

// ════════════════════════════════════════════════════════════════════════
// Lancement d'une consultation IN-APP (circuit fermé) — remplace le WhatsApp.
// Flux : choisir un dermatologue → payer (Mobile Money + référence) → attente
// de confirmation → la conversation s'ouvre dans « Mes consultations ».
// ════════════════════════════════════════════════════════════════════════

// Numéros où le patient envoie le paiement (modifiables).
// MTN Mobile Money = ancien numéro (aussi le numéro WhatsApp pour la preuve).
// Orange Money = numéro dédié Orange.
const MTN_NUMBER = "674 377 959";
const ORANGE_NUMBER = "690 501 392";
// Numéro WhatsApp (preuve de paiement) = le numéro MTN/historique.
const PAYMENT_NUMBER = MTN_NUMBER;

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

interface Derm { id: number; fullName: string; cabinet?: string; city?: string; price: number; recommendedFor?: boolean; }

export function ConsultationLauncher({ scanId, condition, imageUrl }: { scanId?: number | null; condition?: string; imageUrl?: string | null }) {
  const [derms, setDerms] = useState<Derm[]>([]);
  const [recommendedLabel, setRecommendedLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"list" | "pay" | "done">("list");
  const [selected, setSelected] = useState<Derm | null>(null);
  const [consultationId, setConsultationId] = useState<number | null>(null);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const [payProvider, setPayProvider] = useState<"monetbil" | "cinetpay" | "simulated">("simulated");
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const [pushState, setPushState] = useState<"idle" | "on" | "denied">("idle");
  const [patientPhone, setPatientPhone] = useState("");
  // Contexte patient (âge, ville, durée, produits, allergies) → dossier médecin.
  const [ctxAge, setCtxAge] = useState("");
  const [ctxCity, setCtxCity] = useState("");
  const [ctxDuration, setCtxDuration] = useState("");
  const [ctxProducts, setCtxProducts] = useState("");
  const [ctxAllergies, setCtxAllergies] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  useGsFonts();

  const copyNum = (n: string) => { try { navigator.clipboard?.writeText(n.replace(/\s/g, "")); setCopied(n); setTimeout(() => setCopied(null), 1600); } catch {} };

  const saveContext = async () => {
    if (!consultationId) return;
    try {
      await fetch(`/api/consultations/${consultationId}/context`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age: ctxAge.trim(), city: ctxCity.trim(), duration: ctxDuration.trim(), products: ctxProducts.trim(), allergies: ctxAllergies.trim(), consent: consentChecked, consentVersion: PRIVACY_POLICY_VERSION }),
      });
    } catch {}
  };

  // Enregistre le numéro WhatsApp du patient (pour recevoir le rapport).
  const savePhone = async () => {
    if (!consultationId || !patientPhone.trim()) return;
    try {
      await fetch(`/api/consultations/${consultationId}/patient-phone`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: patientPhone.trim() }),
      });
    } catch {}
  };

  // Abonne le patient aux notifs push (pour être prévenu quand le dermato répond).
  const enablePush = async () => {
    try {
      if (!("Notification" in window) || !navigator.serviceWorker) { setPushState("denied"); return; }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushState("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const { publicKey } = await (await fetch("/api/push/vapid-key")).json();
      if (!publicKey) return;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      await fetch("/api/push/subscribe", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      setPushState("on");
    } catch { setPushState("denied"); }
  };

  useEffect(() => {
    // On passe la condition détectée → le serveur classe les dermatos par
    // sous-spécialité adaptée et marque les « recommandés pour votre cas ».
    fetch(`/api/b2c/dermatologists${condition ? `?condition=${encodeURIComponent(condition)}` : ""}`)
      .then((r) => r.json())
      .then((d) => { setDerms(d.dermatologists || []); setRecommendedLabel(d.recommendedLabel || null); })
      .catch(() => setDerms([]))
      .finally(() => setLoading(false));
    fetch("/api/payments/config")
      .then((r) => r.json())
      .then((d) => setPayProvider(d.provider === "monetbil" ? "monetbil" : d.provider === "cinetpay" ? "cinetpay" : "simulated"))
      .catch(() => setPayProvider("simulated"));
  }, []);

  // Paiement réel CinetPay : init → ouverture page paiement → polling statut (3s, max 60s).
  const startCinetPay = async () => {
    if (!consultationId) return;
    savePhone(); saveContext();
    setBusy(true); setErr("");
    try {
      const res = await fetch(`/api/consultations/${consultationId}/pay/init`, { method: "POST", credentials: "include" });
      const data = await res.json();
      if (data.alreadyPaid) { setPaidConfirmed(true); setBusy(false); setStep("done"); return; }
      if (!res.ok || !data.paymentUrl) { setErr(data.message || "Impossible de démarrer le paiement."); setBusy(false); return; }
      window.open(data.paymentUrl, "_blank", "noopener,noreferrer");
      // Polling du statut
      let elapsed = 0;
      const poll = setInterval(async () => {
        elapsed += 3;
        try {
          const s = await fetch(`/api/consultations/${consultationId}/pay/status`, { credentials: "include" });
          const sd = await s.json();
          if (sd.status === "paid") { clearInterval(poll); setPaidConfirmed(true); setBusy(false); setStep("done"); }
          else if (sd.status === "failed") { clearInterval(poll); setBusy(false); setErr("Paiement échoué. Vérifie ton solde et réessaie."); }
        } catch {}
        if (elapsed >= 120) { clearInterval(poll); setBusy(false); setErr("Paiement non confirmé. S'il a été débité, il sera validé automatiquement — vérifie « Mes consultations »."); }
      }, 3000);
    } catch { setErr("Erreur réseau. Réessaie."); setBusy(false); }
  };

  const openConsultation = async (d: Derm) => {
    setBusy(true); setErr("");
    try {
      const res = await fetch("/api/consultations", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proAccountId: d.id, scanId: scanId || undefined, condition, imageUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) { setNeedLogin(true); return; }
        setErr(data.message || "Impossible d'ouvrir la consultation."); return;
      }
      setSelected(d);
      setConsultationId(data.consultation.id);
      setStep("pay");
    } catch { setErr("Erreur réseau. Réessaie."); }
    finally { setBusy(false); }
  };

  const submitRef = async () => {
    if (!consultationId || !ref.trim()) return;
    savePhone(); saveContext();
    setBusy(true);
    try {
      await fetch(`/api/consultations/${consultationId}/payment-ref`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: ref.trim() }),
      });
      setStep("done");
    } catch { setErr("Erreur réseau. Réessaie."); }
    finally { setBusy(false); }
  };


  // ── Titre section (design turquoise) ──
  const Header = (
    <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
      <ShieldCheck size={16} style={{ color: GS.teal }} />
      <GsMono color={GS.teal} style={{ letterSpacing: ".12em" }}>Consulter un dermatologue</GsMono>
    </div>
  );

  if (loading) return null;

  const shellCard: React.CSSProperties = { fontFamily: GS.sans, color: GS.ink, marginTop: 6 };

  // Aucun dermato disponible → message doux
  if (derms.length === 0 && step === "list") {
    return (
      <div style={shellCard}>
        {Header}
        <div style={{ border: `1px solid ${GS.line}`, background: GS.panel, padding: 16, fontSize: 12.5, color: GS.muted, lineHeight: 1.6 }}>
          La consultation en ligne avec un dermatologue arrive très bientôt sur GlowScan. Revenez d'ici peu.
        </div>
      </div>
    );
  }

  return (
    <div style={shellCard}>
      {Header}
      <div style={{ border: `1px solid ${GS.line}`, background: "#fff", padding: 16 }}>
        {err && <p style={{ fontFamily: GS.mono, fontSize: 11, color: GS.red, margin: "0 0 10px" }}>{err}</p>}

        {/* ── Non connecté ── */}
        {needLogin && (
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <div style={{ width: 48, height: 48, margin: "0 auto 12px", border: `1px solid ${GS.ink}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={22} style={{ color: GS.ink }} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.4px", marginBottom: 6 }}>Créez votre compte pour consulter</div>
            <p style={{ fontSize: 12.5, color: GS.muted, margin: "0 0 16px", lineHeight: 1.6 }}>Un compte protège votre consultation et vos échanges avec le dermatologue.</p>
            <a href="/auth" onClick={() => { try { sessionStorage.setItem("postLoginIntent", "consultation"); } catch {} }}
              style={{ display: "inline-block", background: GS.ink, color: "#fff", padding: "13px 26px", fontSize: 13.5, fontWeight: 600, textDecoration: "none" }}>Me connecter</a>
            <button onClick={() => setNeedLogin(false)} style={{ display: "block", margin: "12px auto 0", background: "none", border: "none", color: GS.faint, fontFamily: GS.mono, fontSize: 10, fontWeight: 600, letterSpacing: ".08em", cursor: "pointer" }}>RETOUR</button>
          </div>
        )}

        {/* ── 07 · CHOISIR UN DERMATOLOGUE ── */}
        {!needLogin && step === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recommendedLabel && derms.some((d) => d.recommendedFor) && (
              <p style={{ fontSize: 12, color: GS.muted, margin: "0 0 2px", lineHeight: 1.55 }}>
                Pour votre cas, nous conseillons un spécialiste en <strong style={{ color: GS.teal }}>{recommendedLabel}</strong>.
              </p>
            )}
            {derms.map((d) => (
              <div key={d.id} style={{ border: `1px solid ${d.recommendedFor ? GS.ink : GS.line}`, background: d.recommendedFor ? GS.mintBg : "#fff", padding: 14 }}>
                <div style={{ display: "flex", gap: 13, alignItems: "flex-start" }}>
                  <div style={{ width: 46, height: 46, flex: "none", background: GS.panel, border: `1px solid ${GS.hair}` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: GS.ink }}>Dr {d.fullName}</div>
                    <div style={{ fontSize: 11.5, color: GS.muted, marginTop: 2 }}>{d.cabinet || "Dermatologue"}{d.city ? ` · ${d.city}` : ""}</div>
                    {d.recommendedFor && (
                      <div style={{ marginTop: 6 }}><span style={{ fontFamily: GS.mono, fontSize: 9.5, fontWeight: 600, letterSpacing: ".06em", color: GS.teal, border: `1px solid ${GS.accent}`, padding: "3px 7px" }}>RECOMMANDÉ POUR VOTRE CAS</span></div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <GsMono style={{ letterSpacing: 0 }}>Tarif</GsMono>
                    <div style={{ fontFamily: GS.mono, fontSize: 15, fontWeight: 600, color: GS.ink, fontVariantNumeric: "tabular-nums" }}>{d.price.toLocaleString("fr-FR")}<span style={{ fontSize: 9, color: GS.muted }}> F</span></div>
                  </div>
                </div>
                <button onClick={() => openConsultation(d)} disabled={busy}
                  style={{ width: "100%", marginTop: 12, background: GS.ink, color: "#fff", border: "none", padding: 13, fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  Me faire consulter par Dr {d.fullName.split(" ")[0]} <ArrowRight size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── 08 · PAIEMENT ── */}
        {step === "pay" && selected && (
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.4px", marginBottom: 4 }}>Régler la consultation</div>
            <p style={{ fontSize: 12.5, color: GS.muted, margin: "0 0 14px", lineHeight: 1.55 }}>
              Consultation avec <strong style={{ color: GS.ink }}>Dr {selected.fullName}</strong> — <strong style={{ color: GS.ink }}>{selected.price.toLocaleString("fr-FR")} FCFA</strong>.
            </p>

            {/* Numéro WhatsApp patient */}
            <GsMono style={{ display: "block", marginBottom: 6 }}>Votre numéro WhatsApp (pour recevoir le rapport)</GsMono>
            <input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} onBlur={savePhone} placeholder="Ex : 6XX XXX XXX" inputMode="tel"
              style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", border: `1px solid ${GS.line}`, fontFamily: GS.mono, fontSize: 13, marginBottom: 16 }} />

            {/* Contexte médecin */}
            <GsMono style={{ display: "block", marginBottom: 8 }}>Aidez le dermatologue à mieux vous soigner</GsMono>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input value={ctxAge} onChange={(e) => setCtxAge(e.target.value)} onBlur={saveContext} placeholder="Âge" inputMode="numeric"
                style={{ width: "38%", boxSizing: "border-box", padding: "10px", border: `1px solid ${GS.line}`, fontSize: 12.5 }} />
              <input value={ctxCity} onChange={(e) => setCtxCity(e.target.value)} onBlur={saveContext} placeholder="Ville"
                style={{ flex: 1, boxSizing: "border-box", padding: "10px", border: `1px solid ${GS.line}`, fontSize: 12.5 }} />
            </div>
            <input value={ctxDuration} onChange={(e) => setCtxDuration(e.target.value)} onBlur={saveContext} placeholder="Depuis combien de temps ? (ex : 3 semaines)"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px", border: `1px solid ${GS.line}`, fontSize: 12.5, marginBottom: 8 }} />
            <input value={ctxProducts} onChange={(e) => setCtxProducts(e.target.value)} onBlur={saveContext} placeholder="Produits utilisés (ex : savon noir, Nivea)"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px", border: `1px solid ${GS.line}`, fontSize: 12.5, marginBottom: 8 }} />
            <input value={ctxAllergies} onChange={(e) => setCtxAllergies(e.target.value)} onBlur={saveContext} placeholder="Allergies connues (sinon laissez vide)"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px", border: `1px solid ${GS.line}`, fontSize: 12.5, marginBottom: 16 }} />

            {/* Consentement */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, border: `1px solid ${consentChecked ? GS.ink : GS.line}`, background: consentChecked ? GS.mintBg : "#fff", padding: 13, marginBottom: 16, cursor: "pointer" }}>
              <span style={{ width: 18, height: 18, flex: "none", marginTop: 1, ...(consentChecked ? { background: GS.ink, display: "flex", alignItems: "center", justifyContent: "center" } : { border: `1px solid ${GS.disabled}` }) }}>{consentChecked && <Check size={12} style={{ color: GS.accent }} strokeWidth={3} />}</span>
              <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} style={{ display: "none" }} />
              <span style={{ fontSize: 11.5, color: GS.muted, lineHeight: 1.6 }}>
                Vos photos et informations sont partagées uniquement avec le dermatologue chargé de votre consultation. Elles sont traitées conformément aux règles de confidentialité applicables.{" "}
                <a href="/confidentialite" target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: GS.teal, fontWeight: 600 }}>Voir la confidentialité</a>
              </span>
            </label>

            {payProvider !== "simulated" ? (
              <>
                <div style={{ border: `1px solid ${GS.line}`, background: GS.panel, padding: 13, marginBottom: 14, fontSize: 12, color: GS.muted, lineHeight: 1.65 }}>
                  Payez en sécurité par <strong style={{ color: GS.ink }}>MTN Mobile Money</strong> ou <strong style={{ color: GS.ink }}>Orange Money</strong>. Une page de paiement s'ouvre — confirmez sur votre téléphone, puis revenez ici.
                </div>
                <button onClick={startCinetPay} disabled={busy || !consentChecked}
                  style={{ width: "100%", background: GS.ink, color: "#fff", border: "none", padding: 15, fontSize: 13.5, fontWeight: 600, cursor: (busy || !consentChecked) ? "not-allowed" : "pointer", opacity: (busy || !consentChecked) ? 0.5 : 1 }}>
                  {busy ? "Paiement en cours… gardez cette page ouverte" : `Payer ${selected.price.toLocaleString("fr-FR")} FCFA`}
                </button>
                {!consentChecked && <p style={{ fontSize: 10.5, color: GS.faint, textAlign: "center", margin: "8px 0 0" }}>Cochez le consentement pour continuer.</p>}
                <p style={{ fontFamily: GS.mono, fontSize: 9.5, color: GS.faint, textAlign: "center", margin: "10px 0 0", letterSpacing: ".04em" }}>Remboursé si aucun médecin ne répond sous 24 h.</p>
              </>
            ) : (
              <>
                {/* Bénéficiaires Mobile Money */}
                <GsMono style={{ display: "block", marginBottom: 8 }}>Envoyez {selected.price.toLocaleString("fr-FR")} FCFA à</GsMono>
                {[{ label: "Orange Money", num: ORANGE_NUMBER }, { label: "MTN Mobile Money", num: MTN_NUMBER }].map((p) => (
                  <div key={p.label} style={{ display: "flex", alignItems: "center", gap: 12, border: `1px solid ${GS.line}`, padding: "11px 13px", marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      <GsMono style={{ letterSpacing: 0 }}>{p.label}</GsMono>
                      <div style={{ fontFamily: GS.mono, fontSize: 15, fontWeight: 600, color: GS.ink, marginTop: 2 }}>{p.num}</div>
                    </div>
                    <button onClick={() => copyNum(p.num)} style={{ display: "flex", alignItems: "center", gap: 6, border: `1px solid ${GS.ink}`, background: "#fff", color: GS.ink, fontFamily: GS.mono, fontSize: 10, fontWeight: 600, padding: "7px 10px", cursor: "pointer" }}>
                      {copied === p.num ? <><Check size={13} style={{ color: GS.teal }} /> COPIÉ</> : <><Copy size={13} /> COPIER</>}
                    </button>
                  </div>
                ))}
                <p style={{ fontSize: 11.5, color: GS.muted, margin: "10px 0 14px", lineHeight: 1.6 }}>Puis envoyez votre <strong style={{ color: GS.ink }}>preuve de paiement</strong> sur WhatsApp — votre consultation est déverrouillée dès réception.</p>

                {!consentChecked && <p style={{ fontSize: 10.5, color: GS.faint, textAlign: "center", margin: "0 0 10px" }}>Cochez le consentement pour continuer.</p>}
                <a
                  href={consentChecked ? `https://wa.me/237${PAYMENT_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour GlowScan 👋\nJ'ai payé ${selected.price.toLocaleString("fr-FR")} FCFA pour ma consultation${selected.fullName ? ` avec Dr ${selected.fullName}` : ""}.\nRéf. consultation : ${consultationId || "—"}\nVoici ma preuve de paiement :`)}` : undefined}
                  onClick={(e) => { if (!consentChecked) e.preventDefault(); else saveContext(); }}
                  target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", boxSizing: "border-box", background: "#25D366", color: "#fff", padding: 15, fontSize: 13.5, fontWeight: 700, textDecoration: "none", marginBottom: 12, opacity: consentChecked ? 1 : 0.5, pointerEvents: consentChecked ? "auto" : "none" }}>
                  Envoyer ma preuve sur WhatsApp
                </a>
                <p style={{ fontFamily: GS.mono, fontSize: 9.5, color: GS.faint, textAlign: "center", margin: "0 0 12px", letterSpacing: ".04em" }}>ou entrez la référence reçue par SMS</p>
                <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Référence du paiement (SMS)"
                  style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", border: `1px solid ${GS.line}`, fontFamily: GS.mono, fontSize: 13, marginBottom: 10 }} />
                <button onClick={submitRef} disabled={busy || !ref.trim() || !consentChecked}
                  style={{ width: "100%", background: GS.ink, color: "#fff", border: "none", padding: 15, fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: (busy || !ref.trim() || !consentChecked) ? 0.5 : 1 }}>
                  {busy ? "Envoi…" : "J'ai payé — valider"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── 08B · CONFIRMATION ── */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <div style={{ width: 48, height: 48, margin: "0 auto 12px", border: `1px solid ${GS.teal}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Check size={24} style={{ color: GS.teal }} strokeWidth={2.5} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-.4px", marginBottom: 6 }}>{paidConfirmed ? "Paiement reçu" : "Paiement enregistré"}</div>
            <p style={{ fontSize: 12.5, color: GS.muted, margin: "0 0 16px", lineHeight: 1.6 }}>
              {paidConfirmed
                ? <>Dr {selected?.fullName} a été notifié. La conversation est ouverte dans <strong style={{ color: GS.ink }}>« Mes consultations »</strong>.</>
                : <>Dès que votre paiement est confirmé, la conversation s'ouvre dans <strong style={{ color: GS.ink }}>« Mes consultations »</strong>. Vous serez notifié(e).</>}
            </p>
            {pushState !== "on" ? (
              <div style={{ border: `1px solid ${GS.line}`, background: GS.panel, padding: 14, marginBottom: 14, textAlign: "left" }}>
                <GsMono style={{ display: "block", marginBottom: 8 }}>Soyez prévenu(e) dès que le dermatologue répond</GsMono>
                <button onClick={enablePush} style={{ width: "100%", background: GS.ink, color: "#fff", border: "none", padding: 12, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>Activer les notifications</button>
                {pushState === "denied" && <p style={{ fontSize: 10.5, color: GS.red, margin: "8px 0 0" }}>Notifications bloquées — activez-les dans les réglages de votre navigateur.</p>}
              </div>
            ) : (
              <p style={{ fontFamily: GS.mono, fontSize: 10, color: GS.teal, fontWeight: 600, letterSpacing: ".06em", marginBottom: 14 }}>NOTIFICATIONS ACTIVÉES</p>
            )}
            <a href="/consultations" style={{ display: "inline-block", background: GS.ink, color: "#fff", padding: "13px 24px", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>Voir mes consultations</a>
          </div>
        )}
      </div>
    </div>
  );
}
