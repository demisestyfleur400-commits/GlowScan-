import { useEffect, useState } from "react";

// ════════════════════════════════════════════════════════════════════════
// Lancement d'une consultation IN-APP (circuit fermé) — remplace le WhatsApp.
// Flux : choisir un dermatologue → payer (Mobile Money + référence) → attente
// de confirmation → la conversation s'ouvre dans « Mes consultations ».
// ════════════════════════════════════════════════════════════════════════

// Numéro Mobile Money où le patient envoie le paiement (modifiable).
const PAYMENT_NUMBER = "674 377 959";

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

  const saveContext = async () => {
    if (!consultationId) return;
    try {
      await fetch(`/api/consultations/${consultationId}/context`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ age: ctxAge.trim(), city: ctxCity.trim(), duration: ctxDuration.trim(), products: ctxProducts.trim(), allergies: ctxAllergies.trim() }),
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

  const VIOLET = "#7c3aed";

  // ── Titre section ──
  const Header = (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 15 }}>💬</span>
      <p style={{ fontSize: 12, fontWeight: 700, color: VIOLET, margin: 0 }}>Consulter un dermatologue</p>
    </div>
  );

  if (loading) return null;

  // Aucun dermato disponible → message doux (pas de WhatsApp)
  if (derms.length === 0 && step === "list") {
    return (
      <div style={{ marginTop: 4 }}>
        {Header}
        <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, padding: 16 }}>
          <p style={{ fontSize: 12.5, color: "#6b7280", margin: 0, lineHeight: 1.6 }}>
            La consultation en ligne avec un dermatologue arrive très bientôt sur GlowScan. Reviens d'ici peu 👩🏾‍⚕️
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 4 }}>
      {Header}
      <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 20, padding: 16 }}>
        {err && <p style={{ fontSize: 11.5, color: "#b91c1c", marginBottom: 10 }}>{err}</p>}

        {/* ── Non connecté → redirection claire vers la page de connexion ── */}
        {needLogin && (
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>🔒</div>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: "#1a1a2e", margin: "0 0 4px" }}>Crée ton compte pour consulter</p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 14px", lineHeight: 1.6 }}>
              Un compte protège ta consultation et tes échanges avec le dermatologue. C'est rapide.
            </p>
            <a
              href="/auth"
              onClick={() => { try { sessionStorage.setItem("postLoginIntent", "consultation"); } catch {} }}
              style={{ display: "inline-block", background: VIOLET, color: "#fff", borderRadius: 9999, padding: "12px 24px", fontSize: 13.5, fontWeight: 800, textDecoration: "none" }}>
              Me connecter →
            </a>
            <button onClick={() => setNeedLogin(false)}
              style={{ display: "block", margin: "10px auto 0", background: "none", border: "none", color: "#9ca3af", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}>
              Retour
            </button>
          </div>
        )}

        {/* ── ÉTAPE : choisir un dermatologue ── */}
        {!needLogin && step === "list" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recommendedLabel && derms.some((d) => d.recommendedFor) && (
              <p style={{ fontSize: 11.5, color: "#6b7280", margin: "0 0 2px" }}>
                Pour ton cas, on te conseille un spécialiste en <strong style={{ color: VIOLET }}>{recommendedLabel}</strong> :
              </p>
            )}
            {derms.map((d) => (
              <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: d.recommendedFor ? "1.5px solid rgba(124,58,237,0.5)" : "1px solid rgba(0,0,0,0.06)", borderRadius: 14, padding: "10px 12px" }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,rgba(167,139,250,0.25),rgba(124,58,237,0.15))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>👩🏾‍⚕️</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", margin: 0 }}>Dr {d.fullName}</p>
                  {d.recommendedFor && (
                    <span style={{ display: "inline-block", fontSize: 9.5, fontWeight: 800, color: VIOLET, background: "rgba(124,58,237,0.1)", borderRadius: 9999, padding: "1px 7px", margin: "2px 0" }}>✓ Recommandé pour ton cas</span>
                  )}
                  <p style={{ fontSize: 11, color: "#6b7280", margin: "1px 0 0" }}>{d.cabinet || "Dermatologue"}{d.city ? ` · ${d.city}` : ""}</p>
                  <p style={{ fontSize: 11, fontWeight: 800, color: VIOLET, margin: "2px 0 0" }}>{d.price.toLocaleString("fr-FR")} FCFA</p>
                </div>
                <button onClick={() => openConsultation(d)} disabled={busy}
                  style={{ flexShrink: 0, background: VIOLET, color: "#fff", border: "none", borderRadius: 9999, padding: "8px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                  Consulter
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── ÉTAPE : paiement Mobile Money ── */}
        {step === "pay" && selected && (
          <div>
            <p style={{ fontSize: 13, fontWeight: 800, color: "#1a1a2e", margin: "0 0 4px" }}>Paiement de la consultation</p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.6 }}>
              Consultation avec <strong>Dr {selected.fullName}</strong> — <strong>{selected.price.toLocaleString("fr-FR")} FCFA</strong>.
            </p>
            {/* Numéro WhatsApp — pour recevoir le rapport après la consultation */}
            <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", display: "block", marginBottom: 4 }}>📱 Ton numéro WhatsApp (pour recevoir le rapport)</label>
            <input value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} onBlur={savePhone} placeholder="Ex : 6XX XXX XXX" inputMode="tel"
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 13, marginBottom: 12 }} />

            {/* Contexte pour le dermatologue — le patient fait le travail en amont */}
            <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#374151", margin: "0 0 8px" }}>Aide le dermatologue à mieux te soigner</p>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input value={ctxAge} onChange={(e) => setCtxAge(e.target.value)} onBlur={saveContext} placeholder="Âge" inputMode="numeric"
                  style={{ width: "40%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 12.5 }} />
                <input value={ctxCity} onChange={(e) => setCtxCity(e.target.value)} onBlur={saveContext} placeholder="Ville"
                  style={{ flex: 1, boxSizing: "border-box", padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 12.5 }} />
              </div>
              <input value={ctxDuration} onChange={(e) => setCtxDuration(e.target.value)} onBlur={saveContext} placeholder="Depuis combien de temps ? (ex : 3 semaines)"
                style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 12.5, marginBottom: 8 }} />
              <input value={ctxProducts} onChange={(e) => setCtxProducts(e.target.value)} onBlur={saveContext} placeholder="Produits utilisés (ex : savon noir, Nivea)"
                style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 12.5, marginBottom: 8 }} />
              <input value={ctxAllergies} onChange={(e) => setCtxAllergies(e.target.value)} onBlur={saveContext} placeholder="Allergies connues (sinon laisse vide)"
                style={{ width: "100%", boxSizing: "border-box", padding: "9px 10px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 12.5 }} />
            </div>
            {payProvider !== "simulated" ? (
              <>
                <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.7 }}>
                    Paie en toute sécurité par <strong>MTN Mobile Money</strong> ou <strong>Orange Money</strong>. Une page de paiement s'ouvre — confirme sur ton téléphone, puis reviens ici.
                  </p>
                </div>
                <button onClick={startCinetPay} disabled={busy}
                  style={{ width: "100%", background: VIOLET, color: "#fff", border: "none", borderRadius: 9999, padding: "12px", fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
                  {busy ? "Paiement en cours… garde cette page ouverte" : `Payer ${selected.price.toLocaleString("fr-FR")} FCFA →`}
                </button>
              </>
            ) : (
              <>
                <div style={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <p style={{ fontSize: 12, color: "#374151", margin: 0, lineHeight: 1.7 }}>
                    1. Envoie <strong>{selected.price.toLocaleString("fr-FR")} FCFA</strong> par <strong>MTN ou Orange Money</strong> au <strong>{PAYMENT_NUMBER}</strong>.<br />
                    2. <strong>Envoie ta preuve sur WhatsApp</strong> (capture du paiement) — ta consultation est déverrouillée dès réception.
                  </p>
                </div>
                {/* Preuve par WhatsApp — le patient prévient, l'admin confirme et déverrouille */}
                <a
                  href={`https://wa.me/237${PAYMENT_NUMBER.replace(/\D/g, "")}?text=${encodeURIComponent(`Bonjour GlowScan 👋\nJ'ai payé ${selected.price.toLocaleString("fr-FR")} FCFA pour ma consultation${selected.fullName ? ` avec Dr ${selected.fullName}` : ""}.\nRéf. consultation : ${consultationId || "—"}\nVoici ma preuve de paiement :`)}`}
                  target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", boxSizing: "border-box", background: "#25D366", color: "#fff", borderRadius: 9999, padding: "13px", fontSize: 13.5, fontWeight: 800, textDecoration: "none", marginBottom: 12 }}>
                  📲 Envoyer ma preuve sur WhatsApp
                </a>
                <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: "0 0 12px" }}>ou entre la référence reçue par SMS :</p>
                <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Référence du paiement (SMS)"
                  style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.15)", fontSize: 13, marginBottom: 10 }} />
                <button onClick={submitRef} disabled={busy || !ref.trim()}
                  style={{ width: "100%", background: VIOLET, color: "#fff", border: "none", borderRadius: 9999, padding: "12px", fontSize: 13, fontWeight: 800, cursor: "pointer", opacity: busy || !ref.trim() ? 0.5 : 1 }}>
                  {busy ? "Envoi…" : "J'ai payé — valider"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── ÉTAPE : confirmation ── */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 34, marginBottom: 6 }}>✅</div>
            <p style={{ fontSize: 13.5, fontWeight: 800, color: "#1a1a2e", margin: "0 0 4px" }}>
              {paidConfirmed ? "Paiement reçu ✅" : "Paiement enregistré"}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "0 0 12px", lineHeight: 1.6 }}>
              {paidConfirmed ? (
                <>Dr {selected?.fullName} a été notifié. La conversation est ouverte dans <strong>« Mes consultations »</strong>.</>
              ) : (
                <>Dès que ton paiement est confirmé, la conversation s'ouvre dans <strong>« Mes consultations »</strong>. Tu seras notifié(e).</>
              )}
            </p>
            {/* Prompt push — le moment clé : être notifié quand le dermato répond */}
            {pushState !== "on" ? (
              <div style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: 12, marginBottom: 12, textAlign: "left" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1a1a2e", margin: "0 0 8px" }}>🔔 Sois prévenu(e) dès que le dermatologue répond</p>
                <button onClick={enablePush}
                  style={{ width: "100%", background: VIOLET, color: "#fff", border: "none", borderRadius: 9999, padding: "10px", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>
                  Activer les notifications
                </button>
                {pushState === "denied" && <p style={{ fontSize: 10.5, color: "#dc2626", margin: "6px 0 0" }}>Notifications bloquées — active-les dans les réglages de ton navigateur pour ne rien manquer.</p>}
              </div>
            ) : (
              <p style={{ fontSize: 11.5, color: "#059669", fontWeight: 700, marginBottom: 12 }}>✅ Notifications activées</p>
            )}
            <a href="/consultations" style={{ display: "inline-block", background: VIOLET, color: "#fff", borderRadius: 9999, padding: "10px 20px", fontSize: 12.5, fontWeight: 800, textDecoration: "none" }}>
              Voir mes consultations
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
