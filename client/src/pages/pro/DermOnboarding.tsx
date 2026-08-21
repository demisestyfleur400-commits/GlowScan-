/**
 * DermOnboarding — Flow 3 étapes post-inscription
 * Montre la valeur AVANT de payer.
 * Étape 1 : Profil (30s) → Étape 2 : Premier patient (60s) → Étape 3 : PDF prêt (30s)
 */
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Upload, CheckCircle2, FileText, Loader2, User, MapPin, Phone, Stethoscope } from "lucide-react";
import { useProAccount, useUpdateProAccount, useCreatePatient } from "@/hooks/use-pro";
import { useAnalyze } from "@/hooks/use-scans";
import { useToast } from "@/hooks/use-toast";

const DS = {
  bg: "#F6FAFD",
  surface: "#FFFFFF",
  violet: "#7c3aed",
  violetMid: "#0369A1",
  border: "rgba(167,139,250,0.18)",
  text: "#0F172A",
  muted: "#64748B",
  subtle: "#94A3B8",
  inputBg: "#F1F5F9",
  inputBorder: "rgba(167,139,250,0.2)",
};

const inp: React.CSSProperties = {
  width: "100%", background: DS.inputBg, border: `1px solid ${DS.inputBorder}`,
  borderRadius: 12, color: DS.text, fontSize: 14, fontWeight: 500,
  padding: "12px 16px", outline: "none",
};

function StepDot({ n, current }: { n: number; current: number }) {
  const done = current > n;
  const active = current === n;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        fontWeight: 800, fontSize: 13,
        background: done ? "#10b981" : active ? DS.violet : "#F1F5F9",
        color: (done || active) ? "#fff" : DS.subtle,
        border: active ? `2px solid ${DS.violetMid}` : "none",
      }}>
        {done ? <CheckCircle2 size={16} /> : n}
      </div>
      <span style={{ fontSize: 9, color: active ? DS.violetMid : DS.subtle, fontWeight: 700 }}>
        {["Profil", "Patient", "PDF"][n - 1]}
      </span>
    </div>
  );
}

export default function DermOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: accData } = useProAccount();
  const updateAcc = useUpdateProAccount();
  const createPatient = useCreatePatient();
  const analyze = useAnalyze();

  const [step, setStep] = useState(1);

  // Étape 1 — Profil
  const [specialty, setSpecialty] = useState("");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Étape 2 — Patient test
  const [patientFirst, setPatientFirst] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [createdPatientId, setCreatedPatientId] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const acc = accData?.account;

  // ── Étape 1 → sauvegarder le profil ─────────────────────────────
  const saveProfile = async () => {
    if (!specialty || !city) {
      toast({ title: "Spécialité et ville requises", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      await updateAcc.mutateAsync({ specialty, city, phone: whatsapp || undefined } as any);
      setStep(2);
    } catch {
      toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
    } finally {
      setSavingProfile(false);
    }
  };

  // ── Étape 2 → lancer analyse ─────────────────────────────────────
  const runAnalysis = async () => {
    if (!patientFirst || !photo) {
      toast({ title: "Prénom et photo requis", variant: "destructive" });
      return;
    }
    setAnalyzing(true);
    try {
      // Créer patient test
      const p = await createPatient.mutateAsync({
        firstName: patientFirst,
        lastName: "Test",
        age: patientAge ? parseInt(patientAge) : 25,
        sex: "F",
        whatsappNumber: null,
        status: "stable",
      });
      setCreatedPatientId(p.id);

      // Lancer analyse IA
      const result = await analyze.mutateAsync({ image: photo, area: "face" });
      setAnalysisResult(result);
      setStep(3);
    } catch (e: any) {
      toast({ title: "Erreur analyse", description: e.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Étape 3 → terminer ──────────────────────────────────────────
  const finish = async () => {
    await updateAcc.mutateAsync({ onboardingDone: true } as any);
    setLocation("/derm/dashboard");
  };

  return (
    <div style={{ background: DS.bg, minHeight: "100vh", color: DS.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>

      {/* Stepper */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <StepDot n={n} current={step} />
            {n < 3 && <div style={{ width: 40, height: 1, background: step > n ? "#10b981" : DS.border }} />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ── ÉTAPE 1 — Profil ── */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            style={{ width: "100%", maxWidth: 420, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 24, padding: 28 }}>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: DS.violetMid, letterSpacing: ".5px", textTransform: "uppercase" }}>Étape 1 / 3 · 30 secondes</span>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Votre profil médical</h2>
            <p style={{ fontSize: 13, color: DS.muted, marginBottom: 24 }}>Ces informations apparaîtront sur vos rapports PDF.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: DS.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".4px" }}>
                  Nom complet
                </label>
                <input style={{ ...inp, background: "#F8FAFC", cursor: "not-allowed", color: DS.subtle }} readOnly
                  value={acc?.fullName || "—"} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: DS.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".4px" }}>
                  Spécialité *
                </label>
                <select value={specialty} onChange={e => setSpecialty(e.target.value)} style={{ ...inp }}>
                  <option value="">Sélectionner...</option>
                  {["Dermatologue", "Dermatologue-Vénérologue", "Dermatologue pédiatrique", "Cosméticien certifié", "Infirmière dermatologiste", "Médecin généraliste"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: DS.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".4px" }}>
                  Ville / Pays *
                </label>
                <input style={{ ...inp }} placeholder="Ex: Douala, Cameroun" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: DS.muted, display: "block", marginBottom: 5, textTransform: "uppercase", letterSpacing: ".4px" }}>
                  WhatsApp professionnel
                </label>
                <input style={{ ...inp }} placeholder="+237..." value={whatsapp} onChange={e => setWhatsapp(e.target.value)} type="tel" />
              </div>

              <button onClick={saveProfile} disabled={savingProfile || !specialty || !city}
                style={{ marginTop: 8, background: DS.violet, color: "#fff", border: "none", borderRadius: 9999, padding: "14px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: (!specialty || !city) ? 0.5 : 1 }}>
                {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <><span>Continuer</span><ArrowRight size={16} /></>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE 2 — Premier patient ── */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            style={{ width: "100%", maxWidth: 420, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 24, padding: 28 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: DS.violetMid, letterSpacing: ".5px", textTransform: "uppercase" }}>Étape 2 / 3 · 60 secondes</span>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: "6px 0 6px" }}>Votre premier patient</h2>
            <p style={{ fontSize: 13, color: DS.muted, marginBottom: 24 }}>Ajoutez un patient test pour voir GlowScan DERM en action.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: DS.muted, display: "block", marginBottom: 5 }}>Prénom *</label>
                  <input style={{ ...inp }} placeholder="Ex: Julienne" value={patientFirst} onChange={e => setPatientFirst(e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: DS.muted, display: "block", marginBottom: 5 }}>Âge</label>
                  <input style={{ ...inp }} placeholder="25" type="number" value={patientAge} onChange={e => setPatientAge(e.target.value)} />
                </div>
              </div>

              {/* Photo upload */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: DS.muted, display: "block", marginBottom: 5 }}>Photo du visage *</label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => setPhoto(ev.target?.result as string);
                  reader.readAsDataURL(file);
                }} />
                {photo ? (
                  <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", height: 160 }}>
                    <img src={photo} alt="patient" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button onClick={() => setPhoto(null)} style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", fontSize: 14 }}>✕</button>
                  </div>
                ) : (
                  <button onClick={() => fileRef.current?.click()}
                    style={{ width: "100%", height: 120, border: `2px dashed ${DS.inputBorder}`, borderRadius: 12, background: DS.inputBg, cursor: "pointer", color: DS.muted, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <Upload size={24} color={DS.violetMid} />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Cliquez pour ajouter une photo</span>
                  </button>
                )}
              </div>

              <button onClick={runAnalysis} disabled={analyzing || !patientFirst || !photo}
                style={{ marginTop: 8, background: analyzing ? "rgba(124,58,237,0.5)" : DS.violet, color: "#fff", border: "none", borderRadius: 9999, padding: "14px 0", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyse en cours…</> : <><span>Lancer l'analyse IA</span><ArrowRight size={16} /></>}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── ÉTAPE 3 — PDF prêt ── */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
            style={{ width: "100%", maxWidth: 420, background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 24, padding: 28, textAlign: "center" }}>

            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 size={32} color="#6ee7b7" />
            </div>

            <span style={{ fontSize: 11, fontWeight: 700, color: DS.violetMid, letterSpacing: ".5px", textTransform: "uppercase" }}>Étape 3 / 3 · Votre PDF est prêt</span>
            <h2 style={{ fontSize: 22, fontWeight: 900, margin: "8px 0 8px" }}>
              Analyse de {patientFirst} terminée !
            </h2>

            {analysisResult && (
              <div style={{ background: "rgba(124,58,237,0.06)", border: `1px solid ${DS.border}`, borderRadius: 16, padding: "14px 16px", margin: "16px 0", textAlign: "left" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: DS.violetMid, marginBottom: 4, textTransform: "uppercase" }}>Résultat IA</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: DS.text, marginBottom: 2 }}>{analysisResult.condition || "—"}</p>
                <p style={{ fontSize: 12, color: DS.muted }}>Glow Score : {analysisResult.score || "—"}/100 · {analysisResult.severity || "—"}</p>
              </div>
            )}

            <p style={{ fontSize: 13, color: DS.muted, lineHeight: 1.7, marginBottom: 24 }}>
              Le rapport PDF clinique de <strong style={{ color: DS.text }}>{patientFirst}</strong> a été généré avec votre nom de praticien.
              C'est ce que vos patients reçoivent à chaque consultation.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {createdPatientId && (
                <a href={`/derm/patient/${createdPatientId}`}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: DS.violet, color: "#fff", borderRadius: 9999, padding: "13px 0", fontSize: 14, fontWeight: 800, textDecoration: "none" }}>
                  <FileText size={16} /> Voir le dossier patient & PDF
                </a>
              )}
              <button onClick={finish}
                style={{ background: "#F1F5F9", border: `1px solid ${DS.border}`, color: DS.muted, borderRadius: 9999, padding: "13px 0", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Accéder au tableau de bord →
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Skip */}
      <button onClick={finish} style={{ marginTop: 20, background: "none", border: "none", color: DS.subtle, fontSize: 12, cursor: "pointer" }}>
        Passer l'onboarding →
      </button>
    </div>
  );
}
