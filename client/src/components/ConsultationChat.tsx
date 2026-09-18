import { useEffect, useRef, useState } from "react";
import { useConsultationSocket } from "@/hooks/use-consultation-socket";
import { ClinicalReasoningPanel } from "@/components/pro/ClinicalReasoningPanel";

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
  const [redFlags, setRedFlags] = useState<string[]>([]); // signaux d'orientation (analyse)
  const [otherUserId, setOtherUserId] = useState<string | null>(null);
  const [doctor, setDoctor] = useState<{ fullName?: string; city?: string; photoUrl?: string | null; certified?: boolean } | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const typingClearRef = useRef<any>(null);
  const lastTypingSentRef = useRef(0);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const [fullImg, setFullImg] = useState<string | null>(null); // photo du chat en plein écran
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState<any>(null);
  const [correcting, setCorrecting] = useState(false);
  const [correctText, setCorrectText] = useState("");
  const [diagBusy, setDiagBusy] = useState(false);
  const [prescription, setPrescription] = useState("");
  const [prescriptionTouched, setPrescriptionTouched] = useState(false);
  const [doctorMessage, setDoctorMessage] = useState(""); // message perso au patient (Section 2 du CR)
  const [isPrescription, setIsPrescription] = useState(false); // le texte est une ordonnance
  const [draftSaving, setDraftSaving] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [msgDictating, setMsgDictating] = useState(false); // dictée dans le champ message
  const msgRecognitionRef = useRef<any>(null);
  const [quickOpen, setQuickOpen] = useState(false); // réponses rapides (dermatologue)
  const [summaryFor, setSummaryFor] = useState<number | null>(null); // id du message dont on choisit la catégorie
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [addedToSummary, setAddedToSummary] = useState<Set<number>>(new Set()); // messages ajoutés au résumé (session)
  const [closing, setClosing] = useState(false);
  const [closedInfo, setClosedInfo] = useState<{ payoutFcfa?: number; demo?: boolean; followUpDate?: string; reportUrl?: string; at?: string } | null>(null);
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState(false); // échec d'envoi du compte rendu
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false); // étape « Prêt à envoyer ? »
  const [followUpOpt, setFollowUpOpt] = useState("1_month");
  const [showFull, setShowFull] = useState(false);
  const [coachStep, setCoachStep] = useState(-1); // -1 = inactif
  const [dossierCollapsed, setDossierCollapsed] = useState(true);
  const [lightbox, setLightbox] = useState(-1); // index photo en plein écran, -1 = fermé
  const [aiOpen, setAiOpen] = useState(false); // mini-bloc « Aide GlowScan » replié par défaut
  // Résumé patient : panneau latéral sur desktop, bottom sheet sur mobile.
  const [isWide, setIsWide] = useState(() => typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 900px)");
    const h = () => setIsWide(mq.matches);
    mq.addEventListener?.("change", h);
    return () => mq.removeEventListener?.("change", h);
  }, []);
  // Préremplit « Diagnostic retenu » avec la piste GlowScan (le médecin édite librement).
  useEffect(() => {
    if (dossier && !dossier.scan?.isVerified) {
      setCorrectText((prev) => prev || dossier.scan?.condition || dossier.consultation?.condition || "");
    }
  }, [dossier]);
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
        setRedFlags(Array.isArray(d.redFlags) ? d.redFlags : []);
        // Côté dermatologue : charger le dossier B2C complet (photo, IA, Glow Score).
        if (d.side === "doctor") {
          fetch(`/api/pro/consultations/${consultationId}/dossier`, { credentials: "include" })
            .then((r) => (r.ok ? r.json() : null)).then((dd) => {
              if (!dd) return;
              setDossier(dd);
              // Pré-remplit la prescription : celle déjà saisie, sinon la suggestion IA.
              setPrescription((prev) => (prescriptionTouched ? prev : (dd.prescription || dd.suggestedTreatment || "")));
              setDoctorMessage((prev) => prev || dd.intake?.doctorMessage || "");
              setIsPrescription(dd.intake?.isPrescription === true);
            }).catch(() => {});
        }
      }
    } catch {} finally { setLoading(false); }
  };
  // À CHAQUE changement de consultation : on VIDE l'état pour ne jamais afficher
  // les fichiers/dossier/messages d'une AUTRE consultation (bug « anciens fichiers »).
  useEffect(() => {
    setMessages([]); setDossier(null); setDoctor(null); setCtx(null);
    setPrescription(""); setPrescriptionTouched(false); setClosedInfo(null); setReportSent(false); setReportSending(false);
    setDoctorMessage(""); setIsPrescription(false);
    setShowFull(false); setLightbox(-1); setCorrecting(false); setCoachStep(-1);
    setQuickOpen(false); setSummaryFor(null); setAddedToSummary(new Set());
    setConfirmSend(false); setReportError(false);
    try { msgRecognitionRef.current?.stop(); } catch {} setMsgDictating(false);
    setFullImg(null); setUploadPct(0);
    setLoading(true);
    load();
    /* eslint-disable-next-line */
  }, [consultationId]);

  // Onboarding — tooltips séquentiels à la PREMIÈRE vraie consultation du dermato.
  // Gate localStorage (par navigateur) : jamais réaffichés ensuite. Non bloquant.
  useEffect(() => {
    if (side !== "doctor" || !dossier) return;
    try {
      const key = `derm_onboarding_done_${myUserId || "anon"}`;
      if (localStorage.getItem(key) !== "1") setCoachStep(0);
    } catch {}
    // eslint-disable-next-line
  }, [side, dossier]);

  const COACH: { t: string; b: string }[] = [
    { t: "📸 Les photos", b: "Ces photos ont été prises par le patient lors de son analyse. Appuyez pour agrandir." },
    { t: "🤖 Le diagnostic IA", b: "Ceci est une suggestion indicative. Votre diagnostic prime toujours." },
    { t: "✅ Vos actions", b: "Validez si vous êtes d'accord. Corrigez si vous avez un autre avis." },
    { t: "💊 La prescription", b: "Dictez ou écrivez votre prescription. Elle apparaîtra dans le rapport final." },
    { t: "✓ Valider et envoyer le compte rendu", b: "Vous relisez votre avis, vous validez, puis le compte rendu part au patient (e-mail / WhatsApp). Vous êtes payé sur Mobile Money." },
  ];
  const advanceCoach = () => {
    setCoachStep((s) => {
      const next = s + 1;
      if (next >= COACH.length) {
        try { localStorage.setItem(`derm_onboarding_done_${myUserId || "anon"}`, "1"); } catch {}
        return -1;
      }
      return next;
    });
  };

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

  const readAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file);
  });

  // Envoi d'un FICHIER (image compressée OU PDF) — via /files, avec progression.
  const sendFile = async (file: File | undefined | null) => {
    if (!file || sending) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) { alert("Seuls les images et les PDF sont acceptés."); return; }
    if (file.size > 10 * 1024 * 1024) { alert("Fichier trop lourd (max 10 Mo)."); return; }
    setSending(true); setUploadPct(1);
    try {
      const dataUrl = isImage ? await compressToBase64(file, 1400, 0.72) : await readAsDataUrl(file);
      setUploadPct(40);
      const res = await fetch(`/api/consultations/${consultationId}/files`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl, fileName: file.name, fileType: isPdf ? "application/pdf" : (file.type || "image/jpeg"), fileSize: file.size }),
      });
      setUploadPct(90);
      if (res.ok) {
        const d = await res.json();
        setMessages((prev) => prev.some((m) => m.id === d.message.id) ? prev : [...prev, d.message]);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.message || "Échec de l'envoi.");
      }
    } catch { alert("Erreur réseau."); } finally { setSending(false); setUploadPct(0); }
  };

  // Démarre un appel vidéo (Jitsi) — envoie l'invitation dans le chat + ouvre la salle.
  const startCall = async () => {
    if (sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/consultations/${consultationId}/call`, { method: "POST", credentials: "include" });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.roomUrl) {
        if (d.message) setMessages((prev) => prev.some((m) => m.id === d.message.id) ? prev : [...prev, d.message]);
        window.open(d.roomUrl, "_blank", "noopener,noreferrer");
      } else alert(d.message || "Impossible de démarrer l'appel.");
    } catch { alert("Erreur réseau."); } finally { setSending(false); }
  };

  // Rapport PDF de la consultation (print-to-PDF, comme la result card).
  const downloadConsultationPdf = () => {
    const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
    const dateStr = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    const rows = messages.map((m) => {
      const who = m.senderType === "doctor" ? "Dermatologue" : "Patient";
      const t = m.createdAt ? new Date(m.createdAt).toLocaleString("fr-FR") : "";
      const raw = m.body || "";
      const body = raw.startsWith("§CALL§") ? "<em>[appel vidéo]</em>"
        : raw.startsWith("§FILE§") ? `<em>[fichier : ${esc(raw.split("§")[2] || "document")}]</em>`
        : raw ? esc(raw) : (m.imageUrl ? "<em>[photo partagée]</em>" : "");
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

  // Dictée vocale DANS le champ message — insère dans le brouillon, jamais d'envoi auto.
  // Gère micro indisponible et permission refusée ; la saisie clavier reste possible.
  const toggleMsgDictation = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("La dictée vocale n'est pas disponible sur ce navigateur. Utilisez Chrome sur Android."); return; }
    if (msgDictating) { try { msgRecognitionRef.current?.stop(); } catch {} setMsgDictating(false); return; }
    try {
      const rec = new SR();
      rec.lang = "fr-FR"; rec.continuous = true; rec.interimResults = false;
      rec.onresult = (e: any) => {
        let add = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) add += e.results[i][0].transcript;
        }
        if (add) setText((prev) => (prev ? prev.trimEnd() + " " : "") + add.trim());
      };
      rec.onend = () => setMsgDictating(false);
      rec.onerror = (e: any) => {
        setMsgDictating(false);
        if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
          alert("Micro refusé. Autorisez le microphone dans les réglages du navigateur, puis réessayez.");
        } else if (e?.error === "no-speech" || e?.error === "aborted") {
          // silencieux — l'utilisateur peut retenter ou taper au clavier
        } else if (e?.error) {
          alert("Micro indisponible. Vous pouvez écrire au clavier.");
        }
      };
      msgRecognitionRef.current = rec;
      rec.start();
      setMsgDictating(true);
    } catch { setMsgDictating(false); alert("Micro indisponible. Vous pouvez écrire au clavier."); }
  };

  // Réponses rapides (dermatologue) — insérées dans le brouillon, relues puis envoyées à la main.
  const patientFirstName = dossier?.patient?.firstName || "";
  const QUICK_REPLIES: string[] = [
    `Bonjour ${patientFirstName ? patientFirstName + ", " : ""}j'ai bien reçu votre demande. Je vais examiner vos informations et vos photos.`,
    "Depuis quand avez-vous remarqué cela ?",
    "Est-ce douloureux, irritant ou accompagné de démangeaisons ?",
    "Avez-vous déjà utilisé un produit ou un traitement ?",
    "Pouvez-vous envoyer une photo plus nette, prise à la lumière du jour ?",
    "Le problème s'étend-il à d'autres zones ?",
    "Merci, j'ai les informations nécessaires. Je prépare mes conseils.",
  ];
  const useQuickReply = (t: string) => {
    setText((prev) => (prev.trim() ? prev.trimEnd() + " " : "") + t);
    setQuickOpen(false);
  };

  // Dossier vivant — le dermatologue ajoute EXPLICITEMENT une info du chat au résumé.
  const addToSummary = async (messageId: number, category: string, value: string) => {
    if (summaryBusy) return;
    const v = (value || "").trim();
    if (!v) { setSummaryFor(null); return; }
    setSummaryBusy(true);
    try {
      const res = await fetch(`/api/pro/consultations/${consultationId}/summary-note`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, value: v.slice(0, 500) }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d.ok) {
        setDossier((prev: any) => prev ? { ...prev, intake: { ...(prev.intake || {}), summaryNotes: d.summaryNotes } } : prev);
        setAddedToSummary((prev) => new Set(prev).add(messageId));
        setSummaryFor(null);
      } else {
        alert(d.message || "Ajout impossible.");
      }
    } catch { alert("Erreur réseau."); } finally { setSummaryBusy(false); }
  };

  // Clôture en 2 temps : d'abord choisir un suivi, puis clôturer réellement.
  // Le médecin envoie lui-même le rapport au patient (après relecture).
  // Envoi du compte rendu au patient (WhatsApp + push + email via le flux existant).
  // Renvoie true/false pour piloter l'état de livraison et proposer une nouvelle tentative.
  const sendReport = async (): Promise<boolean> => {
    if (reportSending) return false;
    setReportSending(true); setReportError(false);
    try {
      const res = await fetch(`/api/pro/consultations/${consultationId}/send-report`, { method: "POST", credentials: "include" });
      if (res.ok) { setReportSent(true); return true; }
      setReportError(true); return false;
    } catch { setReportError(true); return false; } finally { setReportSending(false); }
  };

  // Clôture / validation de la consultation. Renvoie la réponse serveur (ou null si
  // la validation échoue) — l'envoi du compte rendu n'a lieu QUE si la validation réussit.
  const doClose = async (followUp: string): Promise<any | null> => {
    if (closing) return null;
    setClosing(true);
    try { recognitionRef.current?.stop(); } catch {}
    try { msgRecognitionRef.current?.stop(); } catch {}
    try {
      const res = await fetch(`/api/pro/consultations/${consultationId}/close`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescription: prescription.trim() || undefined, followUp: followUp === "none" ? undefined : followUp, doctorMessage: doctorMessage.trim() || undefined, isPrescription }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        setClosedInfo({ payoutFcfa: d.payoutFcfa, demo: d.demo, followUpDate: d.followUpDate, reportUrl: d.reportUrl, at: new Date().toISOString() });
        setReportSent(false); setReportError(false); load();
        return d;
      }
      alert(d.message || "La validation a échoué. Le compte rendu n'a pas été envoyé.");
      return null;
    } catch { alert("Erreur réseau. Le compte rendu n'a pas été envoyé."); return null; }
    finally { setClosing(false); }
  };

  // Enregistrer le brouillon du compte rendu (sans clôturer ni envoyer).
  const saveDraft = async () => {
    if (draftSaving) return;
    setDraftSaving(true);
    try {
      await fetch(`/api/pro/consultations/${consultationId}/draft`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prescription: prescription.trim(), doctorMessage: doctorMessage.trim(), isPrescription }),
      });
    } catch {} finally { setDraftSaving(false); }
  };

  // Action principale « Valider et envoyer le compte rendu » : on valide d'abord,
  // puis on n'envoie au patient QUE si la validation a réussi (démo = pas d'envoi réel).
  const validateAndSend = async () => {
    const d = await doClose(followUpOpt);
    if (!d) return; // validation échouée → on reste sur la revue, rien n'est envoyé
    setConfirmSend(false); setShowFollowUp(false);
    if (!d.demo) await sendReport();
  };

  const BG = dark ? "#0d0a0e" : "#f6f7fb";
  const CARD = dark ? "rgba(255,255,255,0.04)" : "#fff";
  const INK = dark ? "#f3f0ff" : "#1a1a2e";
  const MUTED = dark ? "rgba(255,255,255,0.45)" : "#9ca3af";
  const BORDER = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const MINE = "#7c3aed";
  const THEIRS = dark ? "rgba(255,255,255,0.08)" : "#eef0f6";

  const mineMsgs = messages.filter((m) => m.senderType === side);
  // Statut clair de la consultation (jamais "Hors ligne", ambigu) — mappé sur l'état réel.
  const lastMsg = messages.length ? messages[messages.length - 1] : null;
  const statusLabel = ctx?.status === "closed"
    ? "Consultation validée"
    : side === "doctor"
      ? (!messages.length ? "Nouvelle demande" : lastMsg?.senderType === "patient" ? "En attente de votre réponse" : "En attente du patient")
      : (!messages.length ? "Consultation ouverte" : lastMsg?.senderType === "doctor" ? "Le dermatologue a répondu" : "En attente de réponse");
  const statusColor = ctx?.status === "closed" ? "#10b981"
    : (side === "doctor" && lastMsg?.senderType === "patient") ? "#f59e0b"
    : (side === "patient" && lastMsg?.senderType === "doctor") ? "#10b981"
    : MUTED;
  const lastMineId = mineMsgs.length ? mineMsgs[mineMsgs.length - 1].id : -1;

  return (
    <div data-clarity-mask="true" style={{ display: "flex", flexDirection: "column", height: "100%", background: BG, position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", rowGap: 8, gap: 10, padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, background: CARD }}>
        {onBack && (
          <button onClick={onBack} style={{ background: "transparent", border: "none", color: INK, fontSize: 18, cursor: "pointer", flexShrink: 0 }}>←</button>
        )}
        {/* Avatar — dermatologue (côté patient) / patient (côté dermatologue) */}
        {side === "patient" ? (
          doctor?.photoUrl ? (
            <img src={doctor.photoUrl} alt="" style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          ) : (
            <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#a78bfa,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>👩🏾‍⚕️</div>
          )
        ) : (
          <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#a78bfa,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
            {(dossier?.patient?.firstName || "P").charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: INK, margin: 0, display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {side === "patient" ? (doctor?.fullName ? `Dr ${doctor.fullName.replace(/^dr\.?\s*/i, "")}` : "Consultation") : (dossier?.patient?.firstName || "Patient")}
            {side === "patient" && doctor?.certified && (
              <span title="Dermatologue Certifié GlowScan" style={{ color: "#7c3aed", fontSize: 12 }}>✦</span>
            )}
          </p>
          <p style={{ fontSize: 11, margin: 0, display: "flex", alignItems: "center", gap: 5, color: statusColor }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: statusColor === MUTED ? "#9ca3af" : statusColor, display: "inline-block", flexShrink: 0 }} />
            {statusLabel}
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
        {/* Dermatologue : ouvrir/masquer le résumé (dossier) */}
        {side === "doctor" && dossier && (
          <button
            onClick={() => setDossierCollapsed((v) => !v)}
            style={{ flexShrink: 0, background: dark ? "rgba(255,255,255,0.08)" : "rgba(124,58,237,0.08)", color: dark ? "#c4b5fd" : "#7c3aed", border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(124,58,237,0.2)"}`, borderRadius: 9999, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
          >
            {dossierCollapsed ? "Voir le résumé" : "Masquer le résumé"}
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
            onClick={() => setShowFollowUp(true)}
            disabled={closing}
            style={{ flexShrink: 0, background: "rgba(16,185,129,0.2)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 9999, padding: "6px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer", opacity: closing ? 0.6 : 1 }}
          >
            {closing ? "…" : "✓ Valider et envoyer le compte rendu"}
          </button>
        )}
      </div>

      {/* ── RÉSUMÉ PATIENT (dermatologue) — panneau latéral desktop / bottom sheet mobile ── */}
      {side === "doctor" && dossier && !dossierCollapsed && (
        <>
          <div onClick={() => setDossierCollapsed(true)}
            style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 70 }} />
          <div role="dialog" aria-label="Résumé du patient"
            style={{
              position: "absolute", zIndex: 71, background: dark ? "#171226" : "#fff",
              display: "flex", flexDirection: "column", boxShadow: "0 -8px 40px rgba(0,0,0,0.4)",
              ...(isWide
                ? { top: 0, right: 0, bottom: 0, width: 400, maxWidth: "92%", borderLeft: `1px solid ${BORDER}` }
                : { left: 0, right: 0, bottom: 0, maxHeight: "88%", borderTopLeftRadius: 20, borderTopRightRadius: 20 }),
            }}
          >
            {/* En-tête du panneau */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 900, color: INK, flex: 1 }}>Résumé du patient</span>
              <button onClick={() => setDossierCollapsed(true)} aria-label="Fermer"
                style={{ background: "transparent", border: "none", color: MUTED, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ overflowY: "auto", padding: "14px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
              {dossier.consultation?.isDemo && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", borderRadius: 9999, padding: "4px 10px", alignSelf: "flex-start" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: dark ? "#fbbf24" : "#b45309" }}>🎯 Démonstration — patient fictif</span>
                </div>
              )}

              {/* Identité patient */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#a78bfa,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
                  {(dossier.patient?.firstName || "P").charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: INK, margin: 0 }}>{dossier.patient?.firstName || "Patient"}</p>
                  {(dossier.intake?.age || dossier.intake?.city) && (
                    <p style={{ fontSize: 12, color: MUTED, margin: "2px 0 0" }}>
                      {[dossier.intake?.age ? `${dossier.intake.age} ans` : null, dossier.intake?.city].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                {/* Badge paiement discret — donnée réelle uniquement (jamais mélangé au clinique) */}
                {(() => {
                  const pay = (dossier.consultation?.paymentStatus || "").toLowerCase();
                  if (pay === "paid") return <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: dark ? "#6ee7b7" : "#047857", background: dark ? "rgba(16,185,129,0.15)" : "rgba(5,150,105,0.1)", borderRadius: 9999, padding: "3px 9px" }}>Paiement confirmé</span>;
                  if (pay === "refunded") return <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: MUTED, background: dark ? "rgba(255,255,255,0.08)" : "rgba(100,116,139,0.12)", borderRadius: 9999, padding: "3px 9px" }}>Remboursé</span>;
                  if (pay) return <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: dark ? "#fbbf24" : "#b45309", background: "rgba(217,119,6,0.12)", borderRadius: 9999, padding: "3px 9px" }}>Paiement en attente</span>;
                  return null;
                })()}
              </div>

              {/* Consentement patient — affiché UNIQUEMENT s'il est réellement enregistré */}
              {dossier.intake?.consent?.accepted && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11.5, color: MUTED }}>
                  <span style={{ color: dark ? "#6ee7b7" : "#047857", fontWeight: 700 }}>
                    ✓ Consentement patient enregistré{dossier.intake.consent.at ? ` le ${new Date(dossier.intake.consent.at).toLocaleDateString("fr-FR")}` : ""}
                  </span>
                  <a href="/confidentialite" target="_blank" rel="noreferrer" style={{ color: "#7c3aed", fontWeight: 700 }}>Voir les informations de confidentialité</a>
                </div>
              )}

              {/* Orientation rapide (dermatologue) — basée UNIQUEMENT sur des signaux
                  déjà présents (redFlags de l'analyse). Ne pose aucun diagnostic
                  d'urgence : signale au médecin des éléments à vérifier vite. */}
              {Array.isArray(dossier.rich?.redFlags) && dossier.rich.redFlags.length > 0 && (
                <div style={{ background: dark ? "rgba(239,68,68,0.12)" : "#fef2f2", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "10px 12px" }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: dark ? "#fca5a5" : "#b91c1c", margin: "0 0 4px" }}>⚠️ Signaux à vérifier rapidement</p>
                  <p style={{ fontSize: 12.5, color: dark ? "#fecaca" : "#991b1b", margin: 0, lineHeight: 1.5 }}>
                    {dossier.rich.redFlags.filter(Boolean).join(" · ")}
                  </p>
                  <p style={{ fontSize: 10.5, color: MUTED, margin: "6px 0 0", lineHeight: 1.5 }}>
                    Éléments issus de l'analyse, à confirmer par votre examen. GlowScan n'évalue pas une urgence à distance.
                  </p>
                </div>
              )}

              {/* Ce que le patient décrit — uniquement les infos réellement saisies */}
              {(() => {
                const zone = dossier.scan?.area || (Array.isArray(dossier.rich?.zones) && dossier.rich.zones.length ? dossier.rich.zones.join(" · ") : null);
                const rows: { label: string; value: string | null; essential?: boolean }[] = [
                  { label: "Zone concernée", value: zone },
                  { label: "Depuis quand ?", value: dossier.intake?.duration || null, essential: true },
                  { label: "Produits déjà essayés", value: dossier.intake?.products || null },
                  { label: "Allergies connues", value: dossier.intake?.allergies || null, essential: true },
                ].filter((r) => r.value || r.essential);
                if (!rows.length) return null;
                return (
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 800, color: MUTED, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>Ce que le patient décrit</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {rows.map((r) => (
                        <div key={r.label}>
                          <span style={{ fontSize: 11.5, color: MUTED, display: "block" }}>{r.label}</span>
                          <span style={{ fontSize: 13, color: r.value ? INK : "#9ca3af", fontWeight: r.value ? 700 : 600, fontStyle: r.value ? "normal" : "italic" }}>{r.value || "Non renseigné"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Ajouté par le dermatologue — dossier vivant (infos tirées du chat, validées) */}
              {Array.isArray(dossier.intake?.summaryNotes) && dossier.intake.summaryNotes.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: MUTED, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>Ajouté par le dermatologue</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dossier.intake.summaryNotes.map((n: any, i: number) => (
                      <div key={i}>
                        <span style={{ fontSize: 11.5, color: MUTED, display: "block" }}>{({ duree: "Depuis quand ?", symptomes: "Symptômes", zone: "Zone concernée", produits: "Produits essayés", evolution: "Évolution", allergies: "Allergies", antecedents: "Antécédents" } as any)[n.category] || n.category}</span>
                        <span style={{ fontSize: 13, color: INK, fontWeight: 700 }}>{n.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos envoyées */}
              {Array.isArray(dossier.photos) && dossier.photos.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 800, color: MUTED, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 0.4 }}>Photos envoyées</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {dossier.photos.map((ph: any, i: number) => (
                      <button key={i} onClick={() => setLightbox(i)} title={ph.label}
                        style={{ padding: 0, border: "none", background: "transparent", cursor: "pointer", lineHeight: 0 }}>
                        <img src={ph.url} alt={ph.label} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                          style={{ width: 66, height: 66, borderRadius: 12, objectFit: "cover", display: "block", border: `1px solid ${BORDER}` }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Aide GlowScan — mini-bloc repliable, jamais dominant */}
              {(dossier.scan?.condition || dossier.consultation?.condition || dossier.rich) && (
                <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: "hidden" }}>
                  <button onClick={() => setAiOpen((v) => !v)}
                    style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", background: dark ? "rgba(124,58,237,0.12)" : "rgba(124,58,237,0.06)", border: "none", padding: "10px 12px", cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 14 }}>🤖</span>
                    <span style={{ flex: 1, fontSize: 12.5, fontWeight: 800, color: INK }}>Aide GlowScan — à vérifier</span>
                    <span style={{ color: "#7c3aed", fontSize: 12, fontWeight: 800 }}>{aiOpen ? "▲" : "▼"}</span>
                  </button>
                  {aiOpen && (
                    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                      <p style={{ fontSize: 10.5, color: MUTED, margin: 0, lineHeight: 1.5 }}>
                        Observations générées à partir des informations disponibles. Votre appréciation clinique reste prioritaire.
                      </p>
                      {(dossier.scan?.condition || dossier.consultation?.condition) && (
                        <div>
                          <span style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 3 }}>Piste évoquée — à confirmer</span>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: INK, background: dark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)", borderRadius: 8, padding: "3px 8px", display: "inline-block" }}>
                            {dossier.scan?.condition || dossier.consultation?.condition}
                          </span>
                        </div>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {dossier.scan?.score != null && (
                          <span style={{ fontSize: 12, fontWeight: 800, color: "#7c3aed", background: dark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)", borderRadius: 8, padding: "3px 8px" }}>Score {dossier.scan.score}/100</span>
                        )}
                        {dossier.rich?.fitzpatrick && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: INK, background: dark ? "rgba(255,255,255,0.08)" : "#f1f5f9", borderRadius: 8, padding: "3px 8px" }}>Fitzpatrick {dossier.rich.fitzpatrick}</span>
                        )}
                        {dossier.rich?.severity && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: INK, background: dark ? "rgba(255,255,255,0.08)" : "#f1f5f9", borderRadius: 8, padding: "3px 8px" }}>
                            Sévérité : {({ mild: "légère", moderate: "modérée", severe: "sévère", critical: "critique" } as any)[dossier.rich.severity] || dossier.rich.severity}
                          </span>
                        )}
                        {dossier.rich?.confidence && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: INK, background: dark ? "rgba(255,255,255,0.08)" : "#f1f5f9", borderRadius: 8, padding: "3px 8px" }}>
                            Confiance : {({ low: "faible", medium: "moyenne", high: "élevée" } as any)[dossier.rich.confidence] || dossier.rich.confidence}
                          </span>
                        )}
                      </div>

                      {/* Alerte produit à risque */}
                      {Array.isArray(dossier.rich?.riskyIngredients) && dossier.rich.riskyIngredients.length > 0 && (
                        <div style={{ background: dark ? "rgba(239,68,68,0.12)" : "#fef2f2", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 10, padding: "7px 10px" }}>
                          <span style={{ fontSize: 11.5, fontWeight: 800, color: dark ? "#fca5a5" : "#b91c1c" }}>⚠️ Produit à risque : </span>
                          <span style={{ fontSize: 11.5, color: dark ? "#fecaca" : "#991b1b" }}>{dossier.rich.riskyIngredients.map((x: any) => x.name).filter(Boolean).join(" · ")}</span>
                        </div>
                      )}

                      {/* Détail repliable : métriques, zones, conseil IA */}
                      {(dossier.rich?.metrics || (Array.isArray(dossier.rich?.zones) && dossier.rich.zones.length) || dossier.rich?.advice) && (
                        <>
                          <button onClick={() => setShowFull((v) => !v)}
                            style={{ alignSelf: "flex-start", background: "transparent", border: "none", color: "#7c3aed", fontSize: 12, fontWeight: 800, cursor: "pointer", padding: 0 }}>
                            {showFull ? "▲ Masquer le détail" : "▼ Voir le détail"}
                          </button>
                          {showFull && (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                              {dossier.rich?.metrics && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {([["Hydratation", dossier.rich.metrics.hydratation], ["Sébum", dossier.rich.metrics.sebum], ["Uniformité", dossier.rich.metrics.uniformite], ["Éclat", dossier.rich.metrics.eclat]] as [string, number | null][])
                                    .filter(([, v]) => typeof v === "number").map(([k, v]) => (
                                    <span key={k} style={{ fontSize: 11.5, color: INK, background: dark ? "rgba(255,255,255,0.06)" : "#f1f5f9", borderRadius: 8, padding: "3px 8px" }}>{k} : {v}%</span>
                                  ))}
                                  {dossier.rich.inflammation && (
                                    <span style={{ fontSize: 11.5, color: INK, background: dark ? "rgba(255,255,255,0.06)" : "#f1f5f9", borderRadius: 8, padding: "3px 8px" }}>Inflammation : {({ none: "aucune", low: "faible", moderate: "modérée", high: "élevée" } as any)[dossier.rich.inflammation] || dossier.rich.inflammation}</span>
                                  )}
                                </div>
                              )}
                              {Array.isArray(dossier.rich?.zones) && dossier.rich.zones.length > 0 && (
                                <p style={{ fontSize: 12.5, color: INK, margin: 0 }}>Zones : {dossier.rich.zones.join(" · ")}</p>
                              )}
                              {dossier.rich?.advice && (
                                <p style={{ fontSize: 12.5, color: INK, margin: 0, lineHeight: 1.6 }}>{dossier.rich.advice}</p>
                              )}
                            </div>
                          )}
                        </>
                      )}

                      <p style={{ fontSize: 10.5, color: MUTED, margin: 0, lineHeight: 1.5 }}>Cette aide ne remplace pas votre examen. Votre avis médical sera celui transmis au patient.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Rapport GlowScan complet (PDF in-app) */}
              {(dossier.scan || dossier.consultation) && (
                <button onClick={openDossierPdf}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: dark ? "rgba(255,255,255,0.04)" : "#faf9ff", border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "rgba(124,58,237,0.18)"}`, borderRadius: 12, padding: "10px 12px", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>📄</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, color: INK }}>Analyse GlowScan complète</span>
                    <span style={{ display: "block", fontSize: 11, color: MUTED }}>Toucher pour ouvrir le rapport</span>
                  </span>
                  <span style={{ color: "#7c3aed", fontSize: 16, flexShrink: 0 }}>→</span>
                </button>
              )}

              {/* ── VOTRE AVIS MÉDICAL — autorité clinique, prioritaire sur l'IA ── */}
              <div style={{ border: `1px solid ${dark ? "rgba(124,58,237,0.35)" : "rgba(124,58,237,0.25)"}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: INK }}>🩺 Votre avis médical</span>

                {/* Diagnostic retenu */}
                <div>
                  <span style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 4 }}>Diagnostic retenu</span>
                  {dossier.scan?.isVerified ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: dark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10, padding: "8px 10px" }}>
                      <span style={{ fontSize: 13 }}>✅</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: dark ? "#6ee7b7" : "#047857" }}>
                        Avis médical validé{(dossier.scan?.expertCorrectedCondition || dossier.scan?.condition) ? ` — ${dossier.scan.expertCorrectedCondition || dossier.scan.condition}` : ""}
                      </span>
                    </div>
                  ) : ctx?.status === "closed" ? (
                    <span style={{ fontSize: 12.5, color: INK, fontWeight: 700 }}>{dossier.scan?.expertCorrectedCondition || dossier.scan?.condition || dossier.consultation?.condition || "—"}</span>
                  ) : (
                    <>
                      <textarea value={correctText} onChange={(e) => setCorrectText(e.target.value)} rows={2} placeholder="Votre diagnostic…"
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 10, border: `1px solid ${BORDER}`, background: dark ? "rgba(255,255,255,0.05)" : "#fff", color: INK, fontSize: 13, outline: "none", resize: "vertical" }} />
                      <button
                        onClick={() => { const ia = dossier.scan?.condition || dossier.consultation?.condition || ""; const v = correctText.trim(); submitDiagnosis(v && v !== ia ? v : null); }}
                        disabled={diagBusy}
                        style={{ marginTop: 6, width: "100%", background: "#7c3aed", color: "#fff", border: "none", borderRadius: 9999, padding: "9px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", opacity: diagBusy ? 0.6 : 1 }}>
                        {diagBusy ? "…" : "Confirmer mon avis médical"}
                      </button>
                      <p style={{ fontSize: 10, color: MUTED, margin: "4px 2px 0", lineHeight: 1.5 }}>Prérempli avec la piste GlowScan — modifiez librement. C'est votre diagnostic qui sera transmis au patient.</p>
                    </>
                  )}
                </div>

                {/* Observations, conseils, traitement et suivi — champ unique transmis au rapport */}
                {ctx?.status !== "closed" && (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: MUTED }}>Observations, conseils, traitement et suivi</span>
                      <button onClick={toggleDictation}
                        style={{ display: "flex", alignItems: "center", gap: 5, background: dictating ? "#ef4444" : (dark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)"), color: dictating ? "#fff" : "#7c3aed", border: `1px solid ${dictating ? "#ef4444" : "rgba(124,58,237,0.25)"}`, borderRadius: 9999, padding: "5px 11px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}>
                        {dictating ? "● Écoute…" : "🎙️ Dicter"}
                      </button>
                    </div>
                    <textarea value={prescription} onChange={(e) => { setPrescription(e.target.value); setPrescriptionTouched(true); }} rows={6}
                      placeholder={"Ce que vous avez observé…\nConseils pour la suite…\nTraitement, si nécessaire…\nSuivi recommandé…"}
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: dark ? "rgba(255,255,255,0.05)" : "#fff", color: INK, fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical" }} />
                    <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 2px 0", cursor: "pointer" }}>
                      <input type="checkbox" checked={isPrescription} onChange={(e) => setIsPrescription(e.target.checked)} style={{ width: 15, height: 15, accentColor: "#7c3aed" }} />
                      <span style={{ fontSize: 11.5, color: INK }}>C'est une ordonnance (sinon : « Conseils » dans le compte rendu)</span>
                    </label>
                    <p style={{ fontSize: 10, color: MUTED, margin: "4px 2px 0" }}>Inclus dans le compte rendu envoyé au patient à la clôture.</p>
                  </div>
                )}

                {/* Message personnel au patient (Section 2 du compte rendu) */}
                {ctx?.status !== "closed" && (
                  <div>
                    <span style={{ fontSize: 11, color: MUTED, display: "block", marginBottom: 6 }}>Message personnel au patient (optionnel)</span>
                    <textarea value={doctorMessage} onChange={(e) => setDoctorMessage(e.target.value)} rows={3}
                      placeholder="Ex : Bonjour, merci pour vos photos. Voici mes recommandations…"
                      style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, background: dark ? "rgba(255,255,255,0.05)" : "#fff", color: INK, fontSize: 13, lineHeight: 1.6, outline: "none", resize: "vertical" }} />
                    <p style={{ fontSize: 10, color: MUTED, margin: "4px 2px 0" }}>Apparaît en tête du compte rendu, tel quel.</p>
                    <button onClick={saveDraft} disabled={draftSaving}
                      style={{ marginTop: 8, background: "transparent", color: "#7c3aed", border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "rgba(124,58,237,0.3)"}`, borderRadius: 9999, padding: "7px 14px", fontSize: 11.5, fontWeight: 800, cursor: "pointer", opacity: draftSaving ? 0.6 : 1 }}>
                      {draftSaving ? "Enregistrement…" : "💾 Enregistrer le brouillon"}
                    </button>
                  </div>
                )}
              </div>

              {/* Raisonnement clinique IA — au fond du panneau, non dominant */}
              {ctx?.status !== "closed" && (
                <ClinicalReasoningPanel
                  dark={dark}
                  consultationId={consultationId}
                  signesCliniques={dossier.scan?.analysis || dossier.scan?.condition || dossier.consultation?.condition}
                  diagnostic={dossier.scan?.expertCorrectedCondition || dossier.scan?.condition || dossier.consultation?.condition}
                  prescription={prescription}
                  fitzpatrick={dossier.rich?.fitzpatrick}
                  age={dossier.intake?.age}
                  historiquePatient={[dossier.intake?.duration ? `Durée : ${dossier.intake.duration}` : "", dossier.intake?.products ? `Produits : ${dossier.intake.products}` : "", dossier.intake?.allergies ? `Allergies : ${dossier.intake.allergies}` : ""].filter(Boolean).join(" · ") || undefined}
                />
              )}
            </div>
          </div>
        </>
      )}

      {/* Confirmation de clôture (côté dermatologue) — rapport envoyé + paiement */}
      {side === "doctor" && closedInfo && (
        <div style={{ padding: "12px 14px", borderBottom: `1px solid ${BORDER}`, background: dark ? "rgba(16,185,129,0.12)" : "rgba(16,185,129,0.08)" }}>
          {closedInfo.demo ? (
            <>
              <p style={{ fontSize: 13, fontWeight: 800, color: dark ? "#6ee7b7" : "#047857", margin: 0 }}>🎉 Parfait. Vous êtes prêt.</p>
              <p style={{ fontSize: 11.5, color: MUTED, margin: "4px 0 0", lineHeight: 1.6 }}>
                C'était une démonstration. Votre prochain patient sera un vrai patient — vous savez maintenant exactement quoi faire.
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: 13, fontWeight: 800, color: dark ? "#6ee7b7" : "#047857", margin: 0 }}>✅ Consultation validée</p>
              <p style={{ fontSize: 11.5, color: MUTED, margin: "4px 0 8px", lineHeight: 1.6 }}>
                {closedInfo.at ? `Le ${new Date(closedInfo.at).toLocaleDateString("fr-FR")} à ${new Date(closedInfo.at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.` : ""}
                {closedInfo.payoutFcfa ? ` Paiement de ${closedInfo.payoutFcfa.toLocaleString("fr-FR")} FCFA en cours.` : ""}
                {closedInfo.followUpDate ? ` 📅 Suivi programmé pour le ${new Date(closedInfo.followUpDate).toLocaleDateString("fr-FR")}.` : ""}
              </p>
              {/* État de livraison du compte rendu */}
              {reportSent ? (
                <p style={{ fontSize: 11.5, color: dark ? "#6ee7b7" : "#047857", fontWeight: 700, margin: "0 0 8px" }}>📲 Compte rendu envoyé au patient (e-mail / WhatsApp selon les canaux disponibles).</p>
              ) : reportError ? (
                <p style={{ fontSize: 11.5, color: dark ? "#fca5a5" : "#b91c1c", fontWeight: 700, margin: "0 0 8px" }}>⚠️ L'envoi du compte rendu a échoué. La consultation reste validée — vous pouvez réessayer l'envoi ci-dessous.</p>
              ) : reportSending ? (
                <p style={{ fontSize: 11.5, color: MUTED, margin: "0 0 8px" }}>Envoi du compte rendu en cours…</p>
              ) : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {closedInfo.reportUrl && (
                  <a href={closedInfo.reportUrl} target="_blank" rel="noreferrer"
                    style={{ flex: "1 1 auto", textAlign: "center", textDecoration: "none", background: dark ? "rgba(255,255,255,0.1)" : "#fff", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 9999, padding: "10px 14px", fontSize: 12.5, fontWeight: 800 }}>
                    📄 Voir le compte rendu
                  </a>
                )}
                <button onClick={() => setDossierCollapsed(false)}
                  style={{ flex: "1 1 auto", background: dark ? "rgba(255,255,255,0.1)" : "#fff", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 9999, padding: "10px 14px", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>
                  🗂️ Ouvrir le dossier
                </button>
                {reportSent ? (
                  <span style={{ flex: "1 1 auto", textAlign: "center", color: "#047857", fontSize: 12.5, fontWeight: 800, padding: "10px 14px" }}>✅ Envoyé</span>
                ) : (
                  <button onClick={sendReport} disabled={reportSending}
                    style={{ flex: "1 1 auto", background: "#10b981", color: "#fff", border: "none", borderRadius: 9999, padding: "10px 14px", fontSize: 12.5, fontWeight: 800, cursor: "pointer", opacity: reportSending ? 0.6 : 1 }}>
                    {reportSending ? "Envoi…" : reportError ? "🔁 Réessayer l'envoi" : "📲 Envoyer au patient"}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Contexte patient (côté patient uniquement) : photo + diagnostic */}
      {side === "patient" && ctx?.imageUrl && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: CARD }}>
          <img src={ctx.imageUrl} alt="" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover" }} />
          <p style={{ fontSize: 11.5, color: MUTED, margin: 0 }}>Photo & diagnostic partagés avec le dermatologue.</p>
        </div>
      )}

      {/* Orientation patient — message NEUTRE basé sur des signaux déjà présents
          (redFlags de l'analyse). N'affirme jamais une urgence, ne bloque pas. */}
      {side === "patient" && redFlags.length > 0 && (
        <div style={{ padding: "10px 14px", borderBottom: `1px solid ${BORDER}`, background: dark ? "rgba(239,68,68,0.12)" : "#fff7ed" }}>
          <p style={{ fontSize: 12.5, color: dark ? "#fecaca" : "#9a3412", margin: 0, lineHeight: 1.6 }}>
            <strong>ℹ️ À lire :</strong> Certains éléments indiquent qu'un avis médical rapide peut être nécessaire. GlowScan ne peut pas évaluer une urgence à distance. Veuillez contacter sans attendre un professionnel de santé ou un service d'urgence près de vous.
          </p>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading && <p style={{ fontSize: 12, color: MUTED, textAlign: "center" }}>Chargement…</p>}
        {!loading && messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", padding: "24px 16px", maxWidth: 260 }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>💬</div>
            <p style={{ fontSize: 13, fontWeight: 800, color: INK, margin: "0 0 4px" }}>
              {side === "doctor" ? "Aucun message pour l'instant" : "Démarrez la conversation"}
            </p>
            <p style={{ fontSize: 12, color: MUTED, margin: 0, lineHeight: 1.5 }}>
              {side === "doctor" ? "Écrivez au patient pour lancer l'échange." : "Écrivez au dermatologue, sa réponse s'affichera ici."}
            </p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.senderType === side;
          const body = m.body || "";
          const callMatch = body.startsWith("§CALL§");
          const fileMatch = body.startsWith("§FILE§") ? body.split("§") : null; // ["", "FILE", name, type, size, ""]
          const fileName = fileMatch ? fileMatch[2] : "";
          const fileSize = fileMatch ? Number(fileMatch[4]) || 0 : 0;
          const kb = fileSize > 1048576 ? `${(fileSize / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(fileSize / 1024))} Ko`;
          return (
            <div key={m.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "82%" }}>
              {callMatch ? (
                // Carte d'appel vidéo
                <a href={body.replace("§CALL§", "")} target="_blank" rel="noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", background: "#10b981", color: "#fff", padding: "11px 14px", borderRadius: 14, fontWeight: 800, fontSize: 13 }}>
                  📞 {mine ? "Appel lancé — rejoindre" : "Rejoindre l'appel vidéo"}
                </a>
              ) : fileMatch ? (
                // Carte fichier PDF — style WhatsApp : icône + nom + taille + 2 actions.
                <div style={{ background: mine ? MINE : THEIRS, color: mine ? "#fff" : INK, padding: "11px 12px", borderRadius: 14, minWidth: 210 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                    <span style={{ fontSize: 26, flexShrink: 0 }}>📄</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{fileName || "Document.pdf"}</span>
                      <span style={{ display: "block", fontSize: 10.5, opacity: 0.85 }}>PDF · {kb}</span>
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a href={m.imageUrl || "#"} target="_blank" rel="noreferrer"
                      style={{ flex: 1, textAlign: "center", textDecoration: "none", background: mine ? "rgba(255,255,255,0.2)" : "rgba(124,58,237,0.12)", color: mine ? "#fff" : "#7c3aed", borderRadius: 9999, padding: "6px 0", fontSize: 11.5, fontWeight: 800 }}>Ouvrir</a>
                    <a href={m.imageUrl || "#"} download={fileName || "document.pdf"}
                      style={{ flex: 1, textAlign: "center", textDecoration: "none", background: mine ? "rgba(255,255,255,0.2)" : "rgba(124,58,237,0.12)", color: mine ? "#fff" : "#7c3aed", borderRadius: 9999, padding: "6px 0", fontSize: 11.5, fontWeight: 800 }}>Télécharger</a>
                  </div>
                </div>
              ) : (m.imageUrl && !m.body) ? (
                // Photo seule — bulle image style WhatsApp, tap → plein écran.
                <img src={m.imageUrl} alt="" onClick={() => setFullImg(m.imageUrl || null)}
                  style={{ maxWidth: "60vw", maxHeight: 260, width: "auto", borderRadius: 14, display: "block", cursor: "pointer", objectFit: "cover" }} />
              ) : (
              <div style={{
                background: mine ? MINE : THEIRS, color: mine ? "#fff" : INK,
                padding: "9px 12px", borderRadius: 14,
                borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4,
                fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {m.imageUrl && <img src={m.imageUrl} alt="" onClick={() => setFullImg(m.imageUrl || null)} style={{ maxWidth: "100%", borderRadius: 8, marginBottom: m.body ? 6 : 0, cursor: "pointer" }} />}
                {m.body}
              </div>
              )}
              <p style={{ fontSize: 10, color: MUTED, textAlign: mine ? "right" : "left", margin: "2px 4px 0" }}>
                {m.createdAt ? new Date(m.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}
                {mine && m.id === lastMineId ? (m.readAt ? " · Vu ✓✓" : " · Envoyé ✓") : ""}
              </p>
              {/* Dossier vivant — ajouter cette réponse du patient au résumé (dermatologue) */}
              {side === "doctor" && !mine && !!m.body && !m.body.startsWith("§") && (
                addedToSummary.has(m.id) ? (
                  <p style={{ fontSize: 10, color: "#10b981", fontWeight: 700, margin: "3px 4px 0" }}>✓ Ajouté au résumé</p>
                ) : summaryFor === m.id ? (
                  <div style={{ marginTop: 4, background: dark ? "rgba(255,255,255,0.05)" : "#f6f7fb", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "7px 8px" }}>
                    <p style={{ fontSize: 10.5, color: MUTED, margin: "0 0 6px" }}>Ajouter au résumé comme :</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {([["duree", "Depuis quand ?"], ["symptomes", "Symptômes"], ["zone", "Zone"], ["produits", "Produits essayés"], ["evolution", "Évolution"], ["allergies", "Allergies"], ["antecedents", "Antécédents"]] as [string, string][]).map(([cat, label]) => (
                        <button key={cat} disabled={summaryBusy} onClick={() => addToSummary(m.id, cat, m.body || "")}
                          style={{ background: dark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)", color: "#7c3aed", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 9999, padding: "4px 9px", fontSize: 10.5, fontWeight: 700, cursor: summaryBusy ? "wait" : "pointer" }}>
                          {label}
                        </button>
                      ))}
                      <button disabled={summaryBusy} onClick={() => setSummaryFor(null)}
                        style={{ background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 9999, padding: "4px 9px", fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}>Annuler</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setSummaryFor(m.id)}
                    style={{ background: "transparent", border: "none", color: "#7c3aed", fontSize: 10.5, fontWeight: 700, cursor: "pointer", padding: "2px 4px", margin: "1px 0 0" }}>
                    ＋ Ajouter au résumé
                  </button>
                )
              )}
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

      {/* Barre de progression d'upload */}
      {uploadPct > 0 && (
        <div style={{ height: 3, background: dark ? "rgba(255,255,255,0.08)" : "#eef0f6" }}>
          <div style={{ height: "100%", width: `${uploadPct}%`, background: MINE, transition: "width .3s" }} />
        </div>
      )}

      {/* Réponses rapides (dermatologue) — insérées dans le brouillon, jamais envoyées auto */}
      {side === "doctor" && quickOpen && (
        <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 12px", borderTop: `1px solid ${BORDER}`, background: CARD, WebkitOverflowScrolling: "touch" }}>
          {QUICK_REPLIES.map((q, i) => (
            <button key={i} onClick={() => useQuickReply(q)}
              style={{ flexShrink: 0, maxWidth: 230, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", background: dark ? "rgba(124,58,237,0.18)" : "rgba(124,58,237,0.08)", color: dark ? "#c4b5fd" : "#7c3aed", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 9999, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Saisie */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 12px", borderTop: `1px solid ${BORDER}`, background: CARD }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: "none" }}
          onChange={(e) => { sendFile(e.target.files?.[0]); e.currentTarget.value = ""; }}
        />
        {side === "doctor" && (
          <button
            onClick={() => setQuickOpen((v) => !v)}
            title="Réponses rapides"
            style={{ background: quickOpen ? MINE : "transparent", border: quickOpen ? "none" : `1px solid ${BORDER}`, color: quickOpen ? "#fff" : "#7c3aed", cursor: "pointer", fontSize: 15, flexShrink: 0, borderRadius: 9999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            ⚡
          </button>
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={sending}
          title="Envoyer une photo ou un PDF"
          style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 20, flexShrink: 0, opacity: sending ? 0.5 : 1, color: "#7c3aed" }}
        >
          📷
        </button>
        <button
          onClick={startCall}
          disabled={sending}
          title="Démarrer un appel vidéo"
          style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: 19, flexShrink: 0, opacity: sending ? 0.5 : 1, color: "#10b981" }}
        >
          📞
        </button>
        <input
          value={text}
          onChange={(e) => { setText(e.target.value); if (e.target.value.trim()) notifyTyping(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={msgDictating ? "🎙️ Dictée en cours…" : (side === "doctor" ? "Écrire au patient…" : "Écrire au dermatologue…")}
          style={{ flex: 1, minWidth: 0, padding: "10px 14px", borderRadius: 9999, border: `1px solid ${BORDER}`, background: dark ? "rgba(255,255,255,0.05)" : "#fff", color: INK, fontSize: 13, outline: "none" }}
        />
        <button
          onClick={toggleMsgDictation}
          title={msgDictating ? "Arrêter la dictée" : "Dicter le message"}
          style={{ background: msgDictating ? "#ef4444" : "transparent", border: msgDictating ? "none" : `1px solid ${BORDER}`, color: msgDictating ? "#fff" : "#7c3aed", cursor: "pointer", fontSize: 16, flexShrink: 0, borderRadius: 9999, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {msgDictating ? "●" : "🎙️"}
        </button>
        <button onClick={send} disabled={sending || !text.trim()}
          style={{ background: MINE, color: "#fff", border: "none", borderRadius: "50%", width: 42, height: 42, cursor: "pointer", fontSize: 18, opacity: sending || !text.trim() ? 0.5 : 1, flexShrink: 0 }}>
          ➤
        </button>
      </div>

      {/* ── Onboarding : bulle d'aide séquentielle (1re consultation, non bloquant) ── */}
      {side === "doctor" && coachStep >= 0 && coachStep < COACH.length && (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 78, display: "flex", justifyContent: "center", padding: "0 16px", zIndex: 60, pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto", maxWidth: 360, width: "100%", background: "#7c3aed", color: "#fff", borderRadius: 16, padding: "14px 16px", boxShadow: "0 10px 30px rgba(0,0,0,0.35)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 900 }}>{COACH[coachStep].t}</span>
              <span style={{ fontSize: 10.5, opacity: 0.8, fontWeight: 700 }}>{coachStep + 1}/{COACH.length}</span>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: "0 0 10px", opacity: 0.95 }}>{COACH[coachStep].b}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => { try { localStorage.setItem(`derm_onboarding_done_${myUserId || "anon"}`, "1"); } catch {} setCoachStep(-1); }}
                style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                Passer
              </button>
              <button onClick={advanceCoach}
                style={{ background: "#fff", color: "#7c3aed", border: "none", borderRadius: 9999, padding: "8px 16px", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>
                {coachStep === COACH.length - 1 ? "Compris — Je termine →" : "OK →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sélecteur de suivi (à la clôture) ── */}
      {showFollowUp && (
        <div onClick={() => { if (!closing) { setShowFollowUp(false); setConfirmSend(false); } }}
          style={{ position: "fixed", inset: 0, zIndex: 85, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380, width: "100%", maxHeight: "88vh", overflowY: "auto", background: dark ? "#171226" : "#fff", borderRadius: 20, padding: 20, boxShadow: "0 20px 50px rgba(0,0,0,0.4)" }}>
            {!confirmSend ? (
              <>
                {/* Étape 1 — revue du compte rendu (réutilise l'avis médical + le dossier) */}
                <p style={{ fontSize: 16, fontWeight: 900, color: INK, margin: "0 0 4px" }}>Vérifiez votre compte rendu</p>
                <p style={{ fontSize: 12, color: MUTED, margin: "0 0 14px", lineHeight: 1.5 }}>Ce que le patient recevra. Rien n'est envoyé tant que vous n'avez pas validé.</p>

                {/* Prévisualisation enrichie : sections visibles + sections masquées (vides) */}
                {(() => {
                  const consented = dossier?.intake?.consent?.accepted === true;
                  const hasPhotos = Array.isArray(dossier?.photos) && dossier.photos.length > 0 && consented;
                  const hasSignaled = !!(dossier?.intake?.duration || dossier?.intake?.products || dossier?.intake?.allergies || (Array.isArray(dossier?.intake?.summaryNotes) && dossier.intake.summaryNotes.length));
                  const avisTxt = dossier?.scan?.isVerified
                    ? `Compatible avec « ${dossier?.scan?.expertCorrectedCondition || dossier?.scan?.condition || "avis validé"} »`
                    : "Surveillance / prochaines étapes indiquées";
                  const adviceTitle = isPrescription ? "Traitement prescrit" : "Conseils de votre dermatologue";
                  const sections = [
                    { on: !!doctorMessage.trim(), t: "Message personnel", v: doctorMessage.trim() },
                    { on: true, t: "L'avis de votre dermatologue", v: avisTxt },
                    { on: hasSignaled, t: "Ce que vous avez signalé", v: "" },
                    { on: !!prescription.trim(), t: adviceTitle, v: prescription.trim().slice(0, 140) },
                    { on: followUpOpt !== "none", t: "Votre suivi", v: "" },
                    { on: hasPhotos, t: "Photos", v: hasPhotos ? `${dossier.photos.length} photo(s)` : "" },
                  ];
                  const masked = sections.filter((s) => !s.on).map((s) => s.t);
                  return (
                    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 14, display: "flex", flexDirection: "column", gap: 9 }}>
                      <span style={{ fontSize: 10.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 800 }}>Aperçu du compte rendu patient</span>
                      {sections.filter((s) => s.on).map((s) => (
                        <div key={s.t}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: INK }}>✓ {s.t}</span>
                          {s.v && <span style={{ display: "block", fontSize: 12, color: MUTED, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{s.v}{s.v.length >= 140 ? "…" : ""}</span>}
                        </div>
                      ))}
                      {!dossier?.scan?.isVerified && (
                        <p style={{ fontSize: 11, color: dark ? "#fbbf24" : "#b45309", margin: 0 }}>⚠️ Diagnostic non confirmé — le compte rendu indiquera « surveillance / examen complémentaire ».</p>
                      )}
                      {masked.length > 0 && (
                        <p style={{ fontSize: 10.5, color: MUTED, margin: "2px 0 0", lineHeight: 1.5 }}>Sections masquées (vides) : {masked.join(" · ")}</p>
                      )}
                    </div>
                  );
                })()}

                <p style={{ fontSize: 12.5, fontWeight: 800, color: INK, margin: "0 0 8px" }}>Programmer un suivi ?</p>
                {[
                  { v: "2_weeks", l: "Dans 2 semaines" },
                  { v: "1_month", l: "Dans 1 mois" },
                  { v: "2_months", l: "Dans 2 mois" },
                  { v: "none", l: "Pas de suivi" },
                ].map((o) => (
                  <button key={o.v} onClick={() => setFollowUpOpt(o.v)}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: followUpOpt === o.v ? (dark ? "rgba(124,58,237,0.2)" : "rgba(124,58,237,0.08)") : "transparent", border: `1px solid ${followUpOpt === o.v ? "#7c3aed" : BORDER}`, borderRadius: 12, padding: "11px 14px", marginBottom: 8, cursor: "pointer" }}>
                    <span style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${followUpOpt === o.v ? "#7c3aed" : MUTED}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {followUpOpt === o.v && <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#7c3aed" }} />}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{o.l}</span>
                  </button>
                ))}
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button onClick={() => setShowFollowUp(false)}
                    style={{ flex: "0 0 auto", background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 9999, padding: "13px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                    ← Modifier
                  </button>
                  <button onClick={() => setConfirmSend(true)}
                    style={{ flex: 1, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 9999, padding: "13px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                    Continuer →
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Étape 2 — confirmation d'envoi */}
                <p style={{ fontSize: 16, fontWeight: 900, color: INK, margin: "0 0 8px" }}>Prêt à envoyer le compte rendu ?</p>
                <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 18px", lineHeight: 1.6 }}>
                  Le patient recevra le compte rendu validé par vous par e-mail et/ou WhatsApp selon les canaux disponibles. Le dossier restera accessible dans votre historique.
                </p>
                <button onClick={validateAndSend} disabled={closing || reportSending}
                  style={{ width: "100%", background: "#10b981", color: "#fff", border: "none", borderRadius: 9999, padding: "14px", fontSize: 14, fontWeight: 800, cursor: "pointer", opacity: (closing || reportSending) ? 0.6 : 1 }}>
                  {closing ? "Validation…" : reportSending ? "Envoi…" : "Valider et envoyer"}
                </button>
                <button onClick={() => setConfirmSend(false)} disabled={closing || reportSending}
                  style={{ width: "100%", marginTop: 8, background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 9999, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Retour à la consultation
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Photo du CHAT en plein écran (fond noir, croix) ── */}
      {fullImg && (
        <div onClick={() => setFullImg(null)}
          style={{ position: "fixed", inset: 0, zIndex: 95, background: "rgba(0,0,0,0.94)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
          <button onClick={() => setFullImg(null)}
            style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, fontSize: 20, cursor: "pointer" }}>✕</button>
          <img src={fullImg} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "92vh", objectFit: "contain", borderRadius: 8 }} />
        </div>
      )}

      {/* ── Photo en plein écran (lightbox) — voir la peau en gros plan ── */}
      {lightbox >= 0 && dossier?.photos?.[lightbox] && (
        <div onClick={() => setLightbox(-1)}
          style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <button onClick={() => setLightbox(-1)}
            style={{ position: "absolute", top: 14, right: 16, background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, fontSize: 20, cursor: "pointer" }}>✕</button>
          <img src={dossier.photos[lightbox].url} alt={dossier.photos[lightbox].label} onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "100%", maxHeight: "82vh", borderRadius: 12, objectFit: "contain" }} />
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 16 }}>
            {dossier.photos.length > 1 && (
              <button onClick={() => setLightbox((i) => (i - 1 + dossier.photos.length) % dossier.photos.length)}
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 9999, padding: "8px 16px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>← Préc.</button>
            )}
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>{dossier.photos[lightbox].label}{dossier.photos.length > 1 ? ` · ${lightbox + 1}/${dossier.photos.length}` : ""}</span>
            {dossier.photos.length > 1 && (
              <button onClick={() => setLightbox((i) => (i + 1) % dossier.photos.length)}
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", borderRadius: 9999, padding: "8px 16px", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>Suiv. →</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
