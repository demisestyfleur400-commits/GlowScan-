import { useEffect, useRef, useState } from "react";
import { useConsultationSocket } from "@/hooks/use-consultation-socket";

// ════════════════════════════════════════════════════════════════════════
// Fil de discussion d'une consultation (temps réel). Utilisé côté patient (clair)
// et côté dermatologue (sombre) via le prop `dark`.
// ════════════════════════════════════════════════════════════════════════

interface Msg { id: number; senderType: "patient" | "doctor"; body?: string | null; imageUrl?: string | null; createdAt?: string; readAt?: string | null; }

// Compresse une image en base64 JPEG (max ~1000px) pour l'envoi dans le chat.
async function compressToBase64(file: File, maxDim = 1000, quality = 0.72): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = dataUrl;
  });
  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const s = maxDim / Math.max(width, height); width = Math.round(width * s); height = Math.round(height * s);
  }
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function ConsultationChat({ consultationId, myUserId, dark, onBack }: {
  consultationId: number; myUserId: string | null; dark?: boolean; onBack?: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [side, setSide] = useState<"patient" | "doctor" | null>(null);
  const [ctx, setCtx] = useState<any>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<{ fullName?: string; city?: string; photoUrl?: string | null; certified?: boolean } | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingClearRef = useRef<any>(null);
  const lastTypingSentRef = useRef(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<any>(null);
  const [correcting, setCorrecting] = useState(false);
  const [correctText, setCorrectText] = useState("");
  const [diagBusy, setDiagBusy] = useState(false);
  const [prescription, setPrescription] = useState("");
  const [prescriptionTouched, setPrescriptionTouched] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closedInfo, setClosedInfo] = useState<{ payoutFcfa?: number } | null>(null);
  const recognitionRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const load = async () => {
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, { credentials: "include" });
      if (res.ok) {
        const d = await res.json();
        setMessages(d.messages || []);
        setSide(d.side);
        setCtx(d.consultation);
        setOtherUserId(d.otherUserId || null);
        setOtherOnline(!!d.otherOnline);
        setDoctor(d.doctor || null);
        // Côté dermatologue : charger le dossier B2C complet (photo, IA, Glow Score).
        if (d.side === "doctor") {
          fetch(`/api/pro/consultations/${consultationId}/dossier`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null)).then((dd) => {
              if (!dd) return;
              setDossier(dd);
              // Pré-remplit la prescription : celle déjà saisie, sinon la suggestion IA.
              setPrescription((prev) => (prescriptionTouched ? prev : (dd.prescription || dd.suggestedTreatment || "")));
            }).catch(() => {});
        }
      }
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [consultationId]);

  useConsultationSocket(myUserId, (evt, data) => {
    if (evt === "consultation:message") {
      if (data.consultationId === consultationId && data.message) {
        setMessages((prev) => prev.some((m) => m.id === data.message.id) ? prev : [...prev, data.message]);
      }
    } else if (evt === "presence:changed") {
      if (otherUserId && data.userId === otherUserId) setOtherOnline(!!data.online);
    } else if (evt === "consultation:read") {
      // L'autre partie a lu mes messages → on marque les miens comme « Vu ».
      if (data.consultationId === consultationId && data.readerSide !== side) {
        setMessages((prev) => prev.map((m) => m.senderType === side ? { ...m, readAt: m.readAt || new Date().toISOString() } : m));
      }
    } else if (evt === "consultation:typing") {
      // L'autre partie est en train d'écrire → affiche l'indicateur ~3,5s.
      if (data.consultationId === consultationId && data.side !== side) {
        setOtherTyping(true);
        clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(() => setOtherTyping(false), 3500);
      }
    }
  });

  // Émet "en train d'écrire" à l'autre partie, au max une fois toutes les 2,5s.
  const notifyTyping = () => {
    const now = Date.now();
    if (now - lastTypingSentRef.current < 2500) return;
    lastTypingSentRef.current = now;
    fetch(`/api/consultations/${consultationId}/typing`, { method: "POST", credentials: "include" }).catch(() => {});
  };

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const res = await fetch(`/api/consultations/${consultationId}/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const d = await res.json();
        setMessages((prev) => prev.some((m) => m.id === d.message.id) ? prev : [...prev, d.message]);
      } else { setText(body); }
    } catch { setText(body); } finally { setSending(false); }
  };

  const sendImage = async (file: File | undefined | null) => {
    if (!file || sending) return;
    if (!file.type.startsWith("image/")) return;
    setSending(true);
    try {
      const imageUrl = await compressToBase64(file);
      const res = await fetch(`/api/consultations/${consultationId}/messages`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      if (res.ok) {
        const d = await res.json();
        setMessages((prev) => prev.some((m) => m.id === d.message.id) ? prev : [...prev, d.message]);
      }
    } catch {} finally { setSending(false); }
  };

  // Rapport PDF de la consultation (print-to-PDF, comme la result card).
  const downloadConsultationPdf = () => {
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    const rows = messages.map((m) => {
      const who = m.senderType === "doctor" ? "Dermatologue" : "Patient";
      const t = m.createdAt ? new Date(m.createdAt).toLocaleString("fr-FR") : "";
      const body = m.body ? esc(m.body) : (m.imageUrl ? "<em>[photo partagée]</em>" : "");
      const align = m.senderType === "doctor" ? "left" : "right";
      const bg = m.senderType === "doctor" ? "#f3f0ff" : "#eafaf1";
      return `<div style="text-align:${align};margin:8px 0"><div style="display:inline-block;max-width:80%;background:${bg};border-radius:12px;padding:8px 12px;text-align:left"><div style="font-size:10px;color:#7c3aed;font-weight:700">${who} · ${t}</div><div style="font-size:12px;color:#1a1a2e;margin-top:2px;white-space:pre-wrap">${body}</div></div></div>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Rapport consultation GlowScan</title></head>
      <body style="font-family:-apple-system,system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1a1a2e">
        <div style="display:flex;align-items:center;gap:10px;border-bottom:2px solid #7c3aed;padding-bottom:12px;margin-bottom:16px">
          <div style="font-size:22px">✨</div>
          <div><div style="font-size:18px;font-weight:900">GlowScan</div><div style="font-size:11px;color:#6b7280">Rapport de consultation dermatologique</div></div>
          <div style="margin-left:auto;font-size:11px;color:#6b7280">${dateStr}</div>
        </div>
        ${ctx?.condition ? `<p style="font-size:13px"><strong>Motif / diagnostic IA :</strong> ${esc(String(ctx.condition))}</p>` : ""}
        ${ctx?.imageUrl ? `<img src="${ctx.imageUrl}" style="width:120px;height:120px;object-fit:cover;border-radius:12px;margin:8px 0"/>` : ""}
        <h3 style="font-size:14px;margin:18px 0 6px;color:#7c3aed">Échange de la consultation</h3>
        ${rows || "<p style='font-size:12px;color:#6b7280'>Aucun message.</p>"}
        <p style="font-size:10px;color:#9ca3af;margin-top:24px;border-top:1px solid #eee;padding-top:10px">
          Ce rapport résume une consultation en ligne réalisée via GlowScan. Il ne remplace pas un examen clinique en présentiel.
        </p>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html); w.document.close();
    setTimeout(() => { try { w.print(); } catch {} }, 500);
  };

  // Ouvre le rapport d'analyse B2C du patient dans l'app (print-to-PDF, pas de
  // navigation externe). Construit à partir du dossier (score, diagnostic, photo).
  const openDossierPdf = () => {
    const s = dossier?.scan; const p = dossier?.patient; const c = dossier?.consultation;
    if (!s && !c) return;
    const esc = (v: any) => String(v ?? "").replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] as string));
    const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    const score = s?.score ?? null;
    const diag = esc(s?.condition || c?.condition || "—");
    const img = s?.imageUrl || c?.imageUrl || "";
    const analysis = esc(s?.analysis || "");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Analyse GlowScan — ${esc(p?.firstName || "Patient")}</title></head>
      <body style="font-family:-apple-system,system-ui,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#1f2937">
        <div style="display:flex;align-items:center;gap:10px;border-bottom:3px solid #7c3aed;padding-bottom:12px;margin-bottom:16px">
          <div style="font-size:22px">✨</div>
          <div><div style="font-size:18px;font-weight:900">GlowScan</div><div style="font-size:11px;color:#6b7280">Analyse cutanée indicative · ne remplace pas l'avis d'un dermatologue</div></div>
          <div style="margin-left:auto;font-size:11px;color:#6b7280">${dateStr}</div>
        </div>
        <p style="font-size:14px;margin:0 0 10px"><strong>Patient :</strong> ${esc(p?.firstName || "—")}</p>
        <div style="display:flex;gap:16px;align-items:center;margin:12px 0">
          ${img ? `<img src="${img}" style="width:120px;height:120px;object-fit:cover;border-radius:12px"/>` : ""}
          <div>
            <div style="font-size:12px;color:#6b7280">Diagnostic IA (indicatif)</div>
            <div style="font-size:16px;font-weight:800;margin:2px 0 8px">${diag}</div>
            ${score != null ? `<div style="font-size:12px;color:#6b7280">Glow Score</div><div style="font-size:22px;font-weight:900;color:#7c3aed">${score}<span style="font-size:13px;color:#9ca3af">/100</span></div>` : ""}
          </div>
        </div>
        ${analysis ? `<h3 style="font-size:13px;margin:18px 0 6px;color:#7c3aed">Analyse détaillée</h3><p style="font-size:12.5px;line-height:1.7;white-space:pre-wrap">${analysis}</p>` : ""}
        <p style="font-size:10px;color:#9ca3af;margin-top:24px;border-top:1px solid #eee;padding-top:10px">
          Document informatif généré par GlowScan. Indicatif — l'appréciation clinique revient au dermatologue.
        </p>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html); w.document.close();
  };

  // Valide ou corrige le diagnostic IA de la consultation (côté dermatologue).
  const submitDiagnosis = async (correctedCondition: string | null) => {
    if (diagBusy) return;
    setDiagBusy(true);
    try {
      const res = await fetch(`/api/pro/consultations/${consultationId}/validate-diagnosis`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correctedCondition: correctedCondition || undefined }),
      });
      const d = await res.json();
      if (res.ok && d.ok) {
        setDossier((prev: any) => prev ? {
          ...prev,
          scan: {
            ...prev.scan,
            isVerified: true,
            condition: d.finalCondition || prev.scan?.condition,
            expertCorrectedCondition: d.isCorrection ? d.finalCondition : null,
          },
        } : prev);
        setCorrecting(false);
      }
    } catch {} finally { setDiagBusy(false); }
  };

  // Dictée vocale (Web Speech API, fr-FR) — sur mobile 3G, dicter > taper.
  const toggleDictation = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("La dictée vocale n'est pas disponible sur ce navigateur. Utilisez Chrome sur Android."); return; }
    if (dictating) { try { recognitionRef.current?.stop(); } catch {} setDictating(false); return; }
    try {
      const rec = new SR();
      rec.lang = "fr-FR"; rec.continuous = true; rec.interimResults = false;
      rec.onresult = (e: any) => {
        let add = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) add += e.results[i][0].transcript;
        }
        if (add) { setPrescriptionTouched(true); setPrescription((prev) => (prev ? prev.trimEnd() + " " : "") + add.trim()); }
      };
      rec.onend = () => setDictating(false);
      rec.onerror = () => setDictating(false);
      recognitionRef.current = rec;
      rec.start();
      setDictating(true);
    } catch { setDictating(false); }
  };

  // Clôture : envoie la prescription + le diagnostic final, déclenche la livraison
  // du rapport au patient (WhatsApp/push/email) et confirme le paiement au médecin.
  const closeConsultation = async () => {
    if (closing) return;
    if (!confirm("Terminer cette consultation ? Le rapport (avec votre ordonnance) sera envoyé au patient.")) return;
    setClosing(true);
    try { recognitionRef.current?.stop(); } catch {}
    try {
      const res = await fetch(`/api/pro/consultations/${consultationId}/close`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescription: prescription.trim() || undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) { setClosedInfo({ payoutFcfa: d.payoutFcfa }); load(); }
    } catch {} finally { setClosing(false); }
  };

  const BG = dark ? "#0d0a0e" : "#f6f7fb";
  const CARD = dark ? "rgba(255,255,255,0.04)" : "#fff";
  const INK = dark ? "#f3f0ff" : "#1a1a2e";
  const MUTED = dark ? "rgba(255,255,255,0.45)" : "#9ca3af";
  const BORDER = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const MINE = "#7c3aed";
  const THEIRS = dark ? "rgba(255,255,255,0.08)" : "#eef0f6";

  const mineMsgs = messages.filter((m) => m.senderType === side);
  const lastMineId = mineMsgs.length ? mineMsgs[mineMsgs.length - 1].id : -1;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: BG }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, background: CARD }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: INK, fontSize: 18, cursor: "pointer", flexShrink: 0 }}>←</button>
        )}
        {/* Avatar dermatologue (côté patient) — visage + confiance */}
        {side === "patient" && (
          doctor?.photoUrl ? (
            <img src={doctor.photoUrl} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#a78bfa,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👩🏾‍⚕️</div>
          )
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: INK, margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
            {side === "patient" ? (doctor?.fullName ? `Dr ${doctor.fullName.replace(/^dr\.?\s*/i, "")}` : "Consultation") : "Patient"}
            {side === "patient" && doctor?.certified && (
              <span title="Dermatologue Certifié GlowScan" style={{ color: "#7c3aed", fontSize: 12 }}>✦</span>
            )}
          </p>
          <p style={{ fontSize: 11, margin: 0, display: "flex", alignItems: "center", gap: 5, color: otherOnline ? "#10b981" : MUTED }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: otherOnline ? "#10b981" : "#9ca3af", display: "inline-block", flexShrink: 0 }} />
            {otherOnline ? "En ligne" : "Hors ligne"}
          </p>
        </div>
        {/* Rapport PDF — consultation terminée (patient + dermatologue) */}
        {ctx?.status === "closed" && (
          <button
            onClick={downloadConsultationPdf}
            style={{ flexShrink: 0, background: dark ? "rgba(255,255,255,0.08)" : "rgba(124,58,237,0.08)", color: dark ? "#c4b5fd" : "#7c3aed", border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(124,58,237,0.2)"}`, borderRadius: 9999, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
          >
            📄 Rapport
          </button>
        )}
        {/* Dermatologue : convertir en dossier patient DERM */}
        {side === "doctor" && (
          <button
            onClick={async () => {
              try {
                const res = await fetch(`/api/pro/consultations/${consultationId}/to-patient`, { method: "POST", credentials: "include" });
                const d = await res.json();
                if (res.ok && d.patientId) window.location.href = `/derm/patient/${d.patientId}`;
              } catch {}
            }}
            style={{ flexShrink: 0, background: "rgba(124,58,237,0.2)", color: "#c4b5fd", border: "1px solid rgba(124,58,237,0.4)", borderRadius: 9999, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
          >
            + Dossier patient
          </button>
        )}
        {side === "doctor" && ctx?.status !== "closed" && (
          <button
            onClick={closeConsultation}
            disabled={closing}
            style={{ flexShrink: 0, background: "rgba(16,185,129,0.2)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 9999, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", opacity: closing ? 0.6 : 1 }}
          >
            {closing ? "…" : "✓ Terminer"}
          </button>
        )}
      </div>

      {/* ── DOSSIER B2C (côté dermatologue) — « il arrive en expert, tout est là » ── */}
      {side === "doctor" && dossier && (
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, background: CARD }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {(dossier.scan?.imageUrl || dossier.consultation?.imageUrl) && (
              <img src={dossier.scan?.imageUrl || dossier.consultation?.imageUrl} alt="" style={{ width: 60, height: 60, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: INK, margin: 0 }}>{dossier.patient?.firstName || "Patient"}</p>
              <p style={{ fontSize: 11, color: "#10b981", fontWeight: 700, margin: "2px 0 0" }}>
                ✅ Payé{dossier.consultation?.priceFcfa ? ` · ${Number(dossier.consultation.priceFcfa).toLocaleString("fr-FR")} FCFA` : ""}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: INK, background: dark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)", borderRadius: 8, padding: "3px 8px" }}>
                  🤖 {dossier.scan?.condition || dossier.consultation?.condition || "Diagnostic IA"}
                </span>
                {dossier.scan?.score != null && (
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed", background: dark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)", borderRadius: 8, padding: "3px 8px" }}>
                    Glow Score {dossier.scan.score}/100
                  </span>
                )}
              </div>
              <p style={{ fontSize: 10.5, color: MUTED, margin: "8px 0 0" }}>Diagnostic IA indicatif — votre appréciation clinique prime.</p>

              {/* ── Valider / Corriger le diagnostic (2 clics max) ── */}
              {dossier.scan?.isVerified ? (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, background: dark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "7px 10px" }}>
                  <span style={{ fontSize: 13 }}>✅</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: dark ? "#6ee7b7" : "#047857" }}>
                    {dossier.scan?.expertCorrectedCondition
                      ? `Corrigé par le médecin : ${dossier.scan.expertCorrectedCondition}`
                      : "Diagnostic validé par le médecin"}
                  </span>
                </div>
              ) : correcting ? (
                <div style={{ marginTop: 10 }}>
                  <textarea
                    value={correctText}
                    onChange={(e) => setCorrectText(e.target.value)}
                    autoFocus
                    rows={2}
                    placeholder="Diagnostic corrigé…"
                    style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 10, border: `1px solid ${BORDER}`, background: dark ? "rgba(255,255,255,0.05)" : "#fff", color: INK, fontSize: 13, outline: "none", resize: "vertical" }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <button onClick={() => submitDiagnosis(correctText.trim() || null)} disabled={diagBusy || !correctText.trim()}
                      style={{ flex: 1, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 9999, padding: "8px", fontSize: 12, fontWeight: 800, cursor: "pointer", opacity: diagBusy || !correctText.trim() ? 0.5 : 1 }}>
                      {diagBusy ? "…" : "Enregistrer la correction"}
                    </button>
                    <button onClick={() => setCorrecting(false)} disabled={diagBusy}
                      style={{ background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 9999, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button onClick={() => submitDiagnosis(null)} disabled={diagBusy}
                    style={{ flex: 1, background: "rgba(16,185,129,0.18)", color: dark ? "#6ee7b7" : "#047857", border: "1px solid rgba(16,185,129,0.35)", borderRadius: 9999, padding: "8px", fontSize: 12, fontWeight: 800, cursor: "pointer", opacity: diagBusy ? 0.6 : 1 }}>
                    ✅ Valider
                  </button>
                  <button onClick={() => { setCorrectText(dossier.scan?.condition || dossier.consultation?.condition || ""); setCorrecting(true); }} disabled={diagBusy}
                    style={{ flex: 1, background: dark ? "rgba(255,255,255,0.06)" : "rgba(124,58,237,0.08)", color: "#7c3aed", border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "rgba(124,58,237,0.2)"}`, borderRadius: 9999, padding: "8px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                    ✏️ Corriger
                  </button>
                </div>
              )}
            </div>
          </div>
          {/* Carte PDF cliquable — ouvre le rapport dans l'app, zéro navigation externe */}
          {(dossier.scan || dossier.consultation) && (
            <button
              onClick={openDossierPdf}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", marginTop: 12, background: dark ? "rgba(255,255,255,0.04)" : "#faf9ff", border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(124,58,237,0.18)"}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", textAlign: "left" }}
            >
              <span style={{ fontSize: 22, flexShrink: 0 }}>📄</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: INK }}>Analyse GlowScan complète</span>
                <span style={{ display: "block", fontSize: 11, color: MUTED }}>Toucher pour ouvrir le rapport</span>
              </span>
              <span style={{ color: "#7c3aed", fontSize: 16, flexShrink: 0 }}>→</span>
            </button>
          )}

          {/* ── Ordonnance / prescription (pré-remplie IA · dictée vocale) ── */}
          {ctx?.status !== "closed" && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: INK }}>💊 Ordonnance / conseils</span>
                <button onClick={toggleDictation}
                  style={{ display: "flex", alignItems: "center", gap: 5, background: dictating ? "#ef4444" : (dark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)"), color: dictating ? "#fff" : "#7c3aed", border: `1px solid ${dictating ? "#ef4444" : "rgba(124,58,237,0.25)"}`, borderRadius: 9999, padding: "5px 11px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                  {dictating ? "● Écoute…" : "🎙️ Dicter"}
                </button>
              </div>
              <textarea
                value={prescription}
                onChange={(e) => { setPrescription(e.target.value); setPrescriptionTouched(true); }}
                rows={4}
                placeholder="Traitement, posologie, conseils… (pré-rempli avec la suggestion IA — modifiez ou dictez par-dessus)"
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: dark ? "rgba(255,255,255,0.05)" : "#fff", color: INK, fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical" }}
              />
              <p style={{ fontSize: 10, color: MUTED, margin: "4px 2px 0" }}>Sera incluse dans le rapport envoyé au patient à la clôture.</p>
            </div>
          )}
        </div>
      )}

      {/* Confirmation de clôture (côté dermatologue) — rapport envoyé + paiement */}
      {side === "doctor" && closedInfo && (
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, background: dark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)" }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: dark ? "#6ee7b7" : "#047857", margin: 0 }}>✅ Consultation terminée</p>
          <p style={{ fontSize: 11.5, color: MUTED, margin: "4px 0 0", lineHeight: 1.6 }}>
            Le rapport (avec votre ordonnance) est envoyé au patient sur WhatsApp.
            {closedInfo.payoutFcfa ? ` Paiement de ${closedInfo.payoutFcfa.toLocaleString("fr-FR")} FCFA en cours.` : ""}
          </p>
        </div>
      )}

      {/* Contexte patient (côté patient uniquement) : photo + diagnostic */}
      {side === "patient" && ctx?.imageUrl && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: CARD }}>
          <img src={ctx.imageUrl} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover" }} />
          <p style={{ fontSize: 11.5, color: MUTED, margin: 0 }}>Photo & diagnostic partagés avec le dermatologue.</p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && <p style={{ fontSize: 12, color: MUTED, textAlign: "center" }}>Chargement…</p>}
        {!loading && messages.length === 0 && (
          <p style={{ fontSize: 12.5, color: MUTED, textAlign: "center", marginTop: 20 }}>
            Écris ton premier message au dermatologue 👋
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderType === side;
          const showSeen = mine && m.id === lastMineId && !!m.readAt;
          return (
            <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "78%" }}>
              <div style={{
                background: mine ? MINE : THEIRS, color: mine ? "#fff" : INK,
                padding: "9px 12px", borderRadius: 14,
                borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4,
                fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {m.imageUrl && <img src={m.imageUrl} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: m.body ? 6 : 0 }} />}
                {m.body}
              </div>
              <p style={{ fontSize: 10, color: MUTED, textAlign: mine ? "right" : "left", margin: "2px 4px 0" }}>
                {m.createdAt ? new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                {showSeen ? " · Vu ✓✓" : ""}
              </p>
            </div>
          );
        })}
        {/* Indicateur "en train d'écrire" */}
        {otherTyping && (
          <div style={{ alignSelf: "flex-start", maxWidth: "78%" }}>
            <div style={{ background: THEIRS, color: MUTED, padding: "9px 14px", borderRadius: 14, borderBottomLeftRadius: 4, fontSize: 12, fontStyle: "italic" }}>
              {side === "patient" ? `${doctor?.fullName ? "Dr " + doctor.fullName.replace(/^dr\.?\s*/i, "") : "Le dermatologue"} écrit…` : "Le patient écrit…"}
            </div>
          </div>
        )}
      </div>

      {/* Saisie */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderTop: `1px solid ${BORDER}`, background: CARD }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { sendImage(e.target.files?.[0]); e.currentTarget.value = ""; }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          title="Envoyer une photo"
          style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, flexShrink: 0, opacity: sending ? 0.5 : 1, color: MUTED }}
        >
          📎
        </button>
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); if (e.target.value.trim()) notifyTyping(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Écris un message…"
          style={{ flex: 1, padding: "10px 14px", borderRadius: 9999, border: `1px solid ${BORDER}`, background: dark ? "rgba(255,255,255,0.05)" : "#fff", color: INK, fontSize: 13, outline: "none" }}
        />
        <button onClick={send} disabled={sending || !text.trim()}
          style={{ background: MINE, color: "#fff", border: "none", borderRadius: "50%", width: 42, height: 42, cursor: "pointer", fontSize: 18, opacity: sending || !text.trim() ? 0.5 : 1, flexShrink: 0 }}>
          ➤
        </button>
      </div>
    </div>
  );
}
