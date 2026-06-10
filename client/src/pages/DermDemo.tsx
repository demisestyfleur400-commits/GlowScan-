import { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, Play, Pause, CheckCircle2, Brain, FileText,
  Users, Shield, Stethoscope, Camera, ChevronRight, Star, Zap,
  ClipboardList, TrendingUp, MessageCircle, BarChart3, Sparkles,
} from "lucide-react";

const DS = {
  bg: "#0d0a0e",
  surface: "#13101f",
  card: "#1a1628",
  violet: "#7c3aed",
  violetMid: "#a78bfa",
  violetLight: "#c4b5fd",
  teal: "#0d9488",
  tealLight: "#2dd4bf",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
  border: "rgba(167,139,250,0.18)",
  text: "#f3f0ff",
  muted: "rgba(200,185,255,0.65)",
  subtle: "rgba(255,255,255,0.35)",
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
};

/* ─── STEP SCREENS (mockups inline) ─── */

function StepWelcome() {
  return (
    <div style={{ textAlign: "center" }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
        <div style={{ width: 80, height: 80, borderRadius: 24, background: "rgba(124,58,237,0.15)", border: `2px solid ${DS.violet}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Stethoscope size={36} color={DS.violetMid} />
        </div>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: DS.text, marginBottom: 12 }}>
          Bienvenue sur <span style={{ color: DS.violet }}>GlowScan DERM</span>
        </h2>
        <p style={{ fontSize: 16, color: DS.muted, lineHeight: 1.7, maxWidth: 500, margin: "0 auto 32px" }}>
          La première plateforme IA spécialisée dans les peaux africaines (Fitzpatrick IV–VI), conçue pour et avec des dermatologues camerounais.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, maxWidth: 480, margin: "0 auto" }}>
          {[
            { icon: <Brain size={18} color={DS.violet} />, label: "IA Médicale", sub: "Groq LLaMA 4" },
            { icon: <Users size={18} color={DS.tealLight} />, label: "Multi-patients", sub: "Tableau de bord" },
            { icon: <FileText size={18} color={DS.green} />, label: "PDF cliniques", sub: "À votre nom" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
              style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 16, padding: "16px 12px", textAlign: "center" }}>
              <div style={{ marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: DS.text }}>{item.label}</div>
              <div style={{ fontSize: 11, color: DS.muted }}>{item.sub}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function StepPhotoAnalysis() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(t); setDone(true); return 100; }
        return p + 2;
      });
    }, 40);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* Left: phone mockup */}
      <div style={{ flex: "0 0 auto", width: 200, margin: "0 auto" }}>
        <div style={{ background: "#111", borderRadius: 32, padding: 12, border: "2px solid rgba(255,255,255,0.1)", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
          {/* Camera area */}
          <div style={{ background: "#0a0a0a", borderRadius: 24, overflow: "hidden", aspectRatio: "9/16", position: "relative", display: "flex", flexDirection: "column" }}>
            {/* Fake camera grid */}
            <div style={{ flex: 1, background: "linear-gradient(135deg,#1a0d2e,#0d1a2e)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              {/* Face silhouette */}
              <div style={{ width: 100, height: 120, borderRadius: "50% 50% 45% 45%", background: "rgba(180,120,80,0.3)", border: "2px solid rgba(180,120,80,0.5)", position: "relative" }}>
                {/* Scan lines */}
                {!done && (
                  <motion.div animate={{ y: [0, 120, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,#7c3aed,transparent)", boxShadow: "0 0 8px #7c3aed" }} />
                )}
              </div>
              {/* Corner marks */}
              {[["top:10px","left:10px"], ["top:10px","right:10px"], ["bottom:10px","left:10px"], ["bottom:10px","right:10px"]].map((pos, i) => {
                const [v, h] = pos;
                const isRight = h.includes("right");
                const isBottom = v.includes("bottom");
                return (
                  <div key={i} style={{ position: "absolute", [v.split(":")[0]]: v.split(":")[1], [h.split(":")[0]]: h.split(":")[1], width: 14, height: 14, borderTop: isBottom ? "none" : "2px solid #a78bfa", borderBottom: isBottom ? "2px solid #a78bfa" : "none", borderLeft: isRight ? "none" : "2px solid #a78bfa", borderRight: isRight ? "2px solid #a78bfa" : "none" }} />
                );
              })}
              {done && (
                <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                  style={{ position: "absolute", top: 8, right: 8, background: DS.green, borderRadius: 9999, padding: "3px 8px", fontSize: 10, fontWeight: 800, color: "#fff" }}>
                  ✓ Capturé
                </motion.div>
              )}
            </div>
            {/* Bottom bar */}
            <div style={{ background: "#0d0a0e", padding: "10px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: done ? DS.green : DS.violetMid, fontWeight: 700 }}>
                {done ? "Analyse terminée ✓" : "Analyse en cours…"}
              </div>
              <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 4, height: 4, marginTop: 6, overflow: "hidden" }}>
                <motion.div style={{ width: `${progress}%`, height: "100%", background: done ? DS.green : `linear-gradient(90deg,${DS.violet},${DS.violetMid})`, borderRadius: 4 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: explanation */}
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(124,58,237,0.12)", border: `1px solid ${DS.border}`, borderRadius: 9999, padding: "4px 12px", marginBottom: 16 }}>
          <Camera size={12} color={DS.violetMid} />
          <span style={{ fontSize: 11, fontWeight: 700, color: DS.violetMid }}>ÉTAPE 1 · ANALYSE PHOTO</span>
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: DS.text, marginBottom: 12 }}>
          L'IA analyse la photo en 30 secondes
        </h3>
        <p style={{ fontSize: 14, color: DS.muted, lineHeight: 1.7, marginBottom: 20 }}>
          Le patient ou vous-même prenez une photo du visage. L'IA détecte automatiquement le phototype Fitzpatrick, les zones affectées et propose un pré-diagnostic.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "Détection phototype Fitzpatrick IV–VI", color: DS.violet },
            { label: "Analyse zone par zone (front, joues, menton…)", color: DS.tealLight },
            { label: "Score GlowScore sur 100", color: DS.green },
            { label: "Anti-faux positifs acnéiques", color: DS.amber },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
              style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: DS.muted }}>{item.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepDiagnostic() {
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* Mockup result card */}
      <div style={{ flex: "0 0 auto", width: 240, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 20, padding: 16, fontSize: 12 }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 14, color: DS.text }}>Hyperpigmentation</div>
              <div style={{ color: DS.muted, fontSize: 11 }}>Post-inflammatoire · Modérée</div>
            </div>
            <div style={{ background: "rgba(124,58,237,0.15)", border: `1px solid ${DS.violet}`, borderRadius: 12, padding: "6px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: DS.violetMid }}>74</div>
              <div style={{ fontSize: 9, color: DS.muted }}>GlowScore</div>
            </div>
          </div>
          {/* Zones */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: DS.muted, marginBottom: 6, textTransform: "uppercase" }}>Zones affectées</div>
            {[
              { zone: "Joues", level: 75, color: DS.amber },
              { zone: "Front", level: 45, color: DS.green },
              { zone: "Menton", level: 60, color: DS.amber },
            ].map((z, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: DS.muted, marginBottom: 3 }}>
                  <span>{z.zone}</span><span>{z.level}%</span>
                </div>
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 4, height: 4, overflow: "hidden" }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${z.level}%` }} transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                    style={{ height: "100%", background: z.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          {/* Fitzpatrick badge */}
          <div style={{ background: "rgba(13,148,136,0.12)", border: "1px solid rgba(45,212,191,0.3)", borderRadius: 10, padding: "8px 10px", display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: DS.tealLight, fontWeight: 700, fontSize: 11 }}>Fitzpatrick V</span>
            <span style={{ color: DS.muted, fontSize: 10 }}>Peau foncée</span>
          </div>
        </motion.div>
      </div>

      {/* Explanation */}
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(13,148,136,0.12)", border: "1px solid rgba(45,212,191,0.25)", borderRadius: 9999, padding: "4px 12px", marginBottom: 16 }}>
          <Brain size={12} color={DS.tealLight} />
          <span style={{ fontSize: 11, fontWeight: 700, color: DS.tealLight }}>ÉTAPE 2 · DIAGNOSTIC IA</span>
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: DS.text, marginBottom: 12 }}>
          Pré-diagnostic complet à valider
        </h3>
        <p style={{ fontSize: 14, color: DS.muted, lineHeight: 1.7, marginBottom: 20 }}>
          L'IA génère un rapport détaillé : condition principale, zones d'atteinte, score cutané, classification Fitzpatrick. Vous validez ou corrigez en 1 clic.
        </p>
        <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: DS.violetMid, marginBottom: 10 }}>📋 Rapport IA inclut :</div>
          {["Résumé clinique structuré", "Protocole de traitement matin/soir", "Posologie détaillée des actifs", "Interactions produits signalées", "Suivi recommandé (J15, J30, J90)"].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <CheckCircle2 size={13} color={DS.violet} />
              <span style={{ fontSize: 12, color: DS.muted }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepClinicalOverride() {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setActive(1), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* Override UI mockup */}
      <div style={{ flex: "0 0 auto", width: 240, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 20, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: DS.muted, marginBottom: 12, textTransform: "uppercase" }}>Clinical Override</div>
          {[
            { id: 0, label: "🩺 Confirmer le diagnostic IA", sub: "Acnée vulgaire · Modérée", color: DS.green },
            { id: 1, label: "✏️ Corriger la sévérité", sub: "Changer Modérée → Légère", color: DS.amber },
            { id: 2, label: "🔄 Remplacer le diagnostic", sub: "Saisir un diagnostic libre", color: DS.violet },
          ].map((opt) => (
            <motion.div key={opt.id} onClick={() => setActive(opt.id)}
              whileHover={{ scale: 1.02 }}
              style={{ background: active === opt.id ? `rgba(${opt.id === 0 ? "16,185,129" : opt.id === 1 ? "245,158,11" : "124,58,237"},0.12)` : "rgba(255,255,255,0.03)", border: `1px solid ${active === opt.id ? opt.color : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8, cursor: "pointer", transition: "all 0.2s" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: active === opt.id ? opt.color : DS.text }}>{opt.label}</div>
              <div style={{ fontSize: 10, color: DS.muted, marginTop: 3 }}>{opt.sub}</div>
            </motion.div>
          ))}
          {active === 1 && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 10, padding: 10, marginTop: 4 }}>
              <div style={{ fontSize: 10, color: DS.amber, fontWeight: 700, marginBottom: 6 }}>Sévérité corrigée</div>
              <div style={{ display: "flex", gap: 4 }}>
                {["Légère", "Modérée", "Sévère"].map((s, i) => (
                  <div key={i} style={{ flex: 1, textAlign: "center", padding: "4px 0", borderRadius: 8, background: i === 0 ? DS.amber : "rgba(255,255,255,0.05)", color: i === 0 ? "#fff" : DS.muted, fontSize: 10, fontWeight: i === 0 ? 800 : 400 }}>{s}</div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Explanation */}
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 9999, padding: "4px 12px", marginBottom: 16 }}>
          <Shield size={12} color={DS.amber} />
          <span style={{ fontSize: 11, fontWeight: 700, color: DS.amber }}>ÉTAPE 3 · CLINICAL OVERRIDE</span>
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: DS.text, marginBottom: 12 }}>
          Vous gardez le contrôle total
        </h3>
        <p style={{ fontSize: 14, color: DS.muted, lineHeight: 1.7, marginBottom: 20 }}>
          L'IA propose — vous décidez. En 1 clic, vous pouvez confirmer, ajuster la sévérité ou remplacer entièrement le diagnostic. Votre correction est tracée dans le PDF.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { level: "Niveau 1", desc: "Confirmer · IA correcte, vous validez", color: DS.green },
            { level: "Niveau 2", desc: "Ajuster · Corriger la sévérité ou la condition", color: DS.amber },
            { level: "Niveau 3", desc: "Remplacer · Diagnostic clinique libre complet", color: DS.violet },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{ background: `rgba(${i === 0 ? "16,185,129" : i === 1 ? "245,158,11" : "124,58,237"},0.15)`, border: `1px solid ${item.color}`, borderRadius: 8, padding: "3px 8px", flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: item.color }}>{item.level}</span>
              </div>
              <span style={{ fontSize: 13, color: DS.muted, lineHeight: 1.5 }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepPDF() {
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* PDF mockup */}
      <div style={{ flex: "0 0 auto", width: 200, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "#fff", borderRadius: 12, padding: 14, boxShadow: "0 20px 60px rgba(0,0,0,0.5)", fontSize: 9, color: "#111", lineHeight: 1.4 }}>
          {/* Header */}
          <div style={{ background: "#1a3a3a", color: "#fff", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1 }}>✦ GLOWSCAN DERM</div>
            <div style={{ fontSize: 8, opacity: 0.7 }}>Rapport Dermato Clinique — Confidentiel</div>
          </div>
          {/* Patient info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 8 }}>
            {[["Patient", "Mme Amina K."], ["Âge", "28 ans"], ["Phototype", "Fitzpatrick V"], ["Date", "08/06/2026"]].map(([k, v], i) => (
              <div key={i}><span style={{ color: "#666", fontSize: 8 }}>{k} </span><span style={{ fontWeight: 700 }}>{v}</span></div>
            ))}
          </div>
          {/* Diagnosis */}
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 6, padding: 6, marginBottom: 6 }}>
            <div style={{ fontWeight: 900, color: "#065f46" }}>Hyperpigmentation post-inflammatoire</div>
            <div style={{ color: "#059669", fontSize: 8 }}>Sévérité légère · GlowScore 78/100</div>
          </div>
          {/* Protocol */}
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontWeight: 700, color: "#1a3a3a", fontSize: 9, marginBottom: 4, borderBottom: "1px solid #e5e7eb", paddingBottom: 3 }}>PROTOCOLE DE SOIN</div>
            <div style={{ color: "#374151", marginBottom: 3 }}>☀️ Matin : Vitamine C 15% + SPF 50+</div>
            <div style={{ color: "#374151" }}>🌙 Soir : Acide azélaïque 10% + Niacinamide</div>
          </div>
          {/* Signature */}
          <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 8, paddingTop: 6 }}>
            <div style={{ color: "#666", fontSize: 8, marginBottom: 3 }}>Signature du praticien</div>
            <div style={{ fontFamily: "Georgia, serif", fontSize: 13, color: "#1a3a3a" }}>Dr. M. Mbarga</div>
            <div style={{ color: "#666", fontSize: 7 }}>Dermatologue · Douala</div>
            <div style={{ background: "#1a3a3a", color: "#fff", borderRadius: 4, padding: "3px 6px", display: "inline-block", marginTop: 4, fontSize: 7 }}>✦ GlowScan DERM certifié</div>
          </div>
        </motion.div>
      </div>

      {/* Explanation */}
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 9999, padding: "4px 12px", marginBottom: 16 }}>
          <FileText size={12} color={DS.green} />
          <span style={{ fontSize: 11, fontWeight: 700, color: DS.green }}>ÉTAPE 4 · PDF CLINIQUE</span>
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: DS.text, marginBottom: 12 }}>
          Rapport PDF à votre signature
        </h3>
        <p style={{ fontSize: 14, color: DS.muted, lineHeight: 1.7, marginBottom: 20 }}>
          Document médical complet de 2 pages, exporté en 1 clic. Votre nom, spécialité et signature figurent en bas. Remis au patient ou transmis par WhatsApp.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { title: "Page 1", items: ["Résumé clinique", "Zones analysées", "GlowScore + évolution"] },
            { title: "Page 2", items: ["Protocole matin/soir", "Bon de commande produits", "Signature & cachet"] },
          ].map((page, i) => (
            <div key={i} style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: DS.green, marginBottom: 8 }}>{page.title}</div>
              {page.items.map((item, j) => (
                <div key={j} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 5 }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: DS.green, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: DS.muted }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepDashboard() {
  const patients = [
    { name: "Amina K.", age: 28, condition: "Hyperpigmentation", score: 78, status: "stable", last: "Aujourd'hui" },
    { name: "Fatou D.", age: 34, condition: "Mélasma", score: 62, status: "monitoring", last: "Hier" },
    { name: "Léa N.", age: 22, condition: "Acné vulgaire", score: 55, status: "priority", last: "Il y a 2j" },
  ];
  const statusColor = { priority: DS.red, monitoring: DS.amber, stable: DS.green };
  const statusLabel = { priority: "Priorité", monitoring: "Suivi", stable: "Stable" };

  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* Dashboard mockup */}
      <div style={{ flex: "0 0 auto", width: 260, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 20, padding: 16 }}>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
            {[
              { val: "3", label: "Patients", color: DS.violet },
              { val: "1", label: "Priorité", color: DS.red },
              { val: "1", label: "En suivi", color: DS.amber },
            ].map((k, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: k.color }}>{k.val}</div>
                <div style={{ fontSize: 9, color: DS.muted }}>{k.label}</div>
              </div>
            ))}
          </div>
          {/* Patient list */}
          {patients.map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
              style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: DS.text }}>{p.name} · {p.age}a</div>
                  <div style={{ fontSize: 10, color: DS.muted }}>{p.condition}</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                  <div style={{ background: `rgba(${p.status === "priority" ? "239,68,68" : p.status === "monitoring" ? "245,158,11" : "16,185,129"},0.15)`, border: `1px solid ${statusColor[p.status as keyof typeof statusColor]}`, borderRadius: 6, padding: "2px 6px" }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: statusColor[p.status as keyof typeof statusColor] }}>{statusLabel[p.status as keyof typeof statusLabel]}</span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: DS.violetMid }}>{p.score}/100</span>
                </div>
              </div>
              <div style={{ fontSize: 9, color: DS.subtle, marginTop: 4 }}>Dernière analyse : {p.last}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Explanation */}
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(167,139,250,0.12)", border: `1px solid ${DS.border}`, borderRadius: 9999, padding: "4px 12px", marginBottom: 16 }}>
          <BarChart3 size={12} color={DS.violetMid} />
          <span style={{ fontSize: 11, fontWeight: 700, color: DS.violetMid }}>TABLEAU DE BORD · MULTI-PATIENTS</span>
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: DS.text, marginBottom: 12 }}>
          Tous vos patients en un regard
        </h3>
        <p style={{ fontSize: 14, color: DS.muted, lineHeight: 1.7, marginBottom: 20 }}>
          Retrouvez l'historique complet de chaque patient, leur évolution GlowScore dans le temps, les consultations à priorité élevée et les suivis programmés.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { icon: <TrendingUp size={14} color={DS.violet} />, title: "Suivi GlowScore dans le temps", desc: "Courbe d'évolution par patient" },
            { icon: <ClipboardList size={14} color={DS.tealLight} />, title: "Historique des analyses", desc: "Toutes les consultations archivées" },
            { icon: <Zap size={14} color={DS.amber} />, title: "Alertes patients prioritaires", desc: "Signalement automatique des cas urgents" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ marginTop: 1 }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: DS.text, marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 11, color: DS.muted }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepNetwork() {
  return (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
      {/* Network card mockup */}
      <div style={{ flex: "0 0 auto", width: 230, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 20, padding: 16 }}>
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: "rgba(124,58,237,0.2)", border: `2px solid ${DS.violet}`, margin: "0 auto 8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Stethoscope size={24} color={DS.violetMid} />
            </div>
            <div style={{ fontWeight: 900, fontSize: 14, color: DS.text }}>Dr. Marie Mbarga</div>
            <div style={{ fontSize: 11, color: DS.muted }}>Dermatologue · Douala</div>
            <div style={{ display: "flex", justifyContent: "center", gap: 3, marginTop: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: DS.green }} />
              <span style={{ fontSize: 10, color: DS.green, fontWeight: 700 }}>Disponible</span>
            </div>
          </div>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { val: "47", label: "Patients" },
              { val: "4.9★", label: "Note" },
            ].map((s, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px", textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: DS.violetMid }}>{s.val}</div>
                <div style={{ fontSize: 9, color: DS.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ background: DS.teal, borderRadius: 10, padding: "10px", textAlign: "center", cursor: "pointer" }}>
            <MessageCircle size={14} color="#fff" style={{ display: "inline", marginRight: 6, verticalAlign: "middle" }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>Contacter sur WhatsApp</span>
          </div>
          <div style={{ fontSize: 10, color: DS.muted, textAlign: "center", marginTop: 8 }}>
            Visible sur chaque analyse GlowScan
          </div>
        </motion.div>
      </div>

      {/* Explanation */}
      <div style={{ flex: 1, minWidth: 260 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(13,148,136,0.12)", border: "1px solid rgba(45,212,191,0.25)", borderRadius: 9999, padding: "4px 12px", marginBottom: 16 }}>
          <Users size={12} color={DS.tealLight} />
          <span style={{ fontSize: 11, fontWeight: 700, color: DS.tealLight }}>VISIBILITÉ · RÉSEAU GLOWSCAN</span>
        </div>
        <h3 style={{ fontSize: 22, fontWeight: 900, color: DS.text, marginBottom: 12 }}>
          Les patients viennent à vous
        </h3>
        <p style={{ fontSize: 14, color: DS.muted, lineHeight: 1.7, marginBottom: 20 }}>
          Votre fiche praticien est affichée à chaque utilisateur GlowScan après son analyse. Ils vous contactent directement sur WhatsApp, déjà pré-diagnostiqués.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Profil visible sur 100% des analyses GlowScan",
            "Patients arrivent avec leur rapport IA en main",
            "Consultation 30min au lieu de 60min",
            "Commission 2 000 FCFA / consultation générée",
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
              style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <CheckCircle2 size={14} color={DS.tealLight} style={{ marginTop: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: DS.muted }}>{item}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StepCTA() {
  return (
    <div style={{ textAlign: "center" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ display: "flex", justifyContent: "center", gap: 4, marginBottom: 20 }}>
          {[1, 2, 3, 4, 5].map(i => <Star key={i} size={20} color="#fbbf24" fill="#fbbf24" />)}
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 900, color: DS.text, marginBottom: 12 }}>
          Prêt à rejoindre GlowScan DERM ?
        </h2>
        <p style={{ fontSize: 15, color: DS.muted, lineHeight: 1.7, maxWidth: 480, margin: "0 auto 32px" }}>
          14 jours d'essai gratuit, aucune carte bancaire. Démarrez dès aujourd'hui et recevez vos premiers patients pré-diagnostiqués.
        </p>
        {/* Summary boxes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, maxWidth: 600, margin: "0 auto 32px" }}>
          {[
            { num: "30s", label: "Analyse photo IA" },
            { num: "1 clic", label: "Export PDF clinique" },
            { num: "30min", label: "Consultation complète" },
            { num: "14j", label: "Essai gratuit" },
          ].map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + i * 0.08 }}
              style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 16, padding: "16px 12px" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: DS.violet, marginBottom: 4 }}>{item.num}</div>
              <div style={{ fontSize: 12, color: DS.muted }}>{item.label}</div>
            </motion.div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/pro/inscription">
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{ background: DS.violet, color: "#fff", border: "none", borderRadius: 9999, padding: "14px 32px", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={16} /> Démarrer l'essai gratuit <ArrowRight size={16} />
            </motion.button>
          </Link>
          <a href="https://wa.me/237674377959?text=Bonjour%2C+j%27ai+vu+la+d%C3%A9mo+GlowScan+DERM+et+j%27ai+des+questions" target="_blank" rel="noopener noreferrer">
            <button style={{ background: "transparent", color: DS.muted, border: `1px solid ${DS.border}`, borderRadius: 9999, padding: "14px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              Parler à l'équipe
            </button>
          </a>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── STEPS CONFIG ─── */
const STEPS = [
  { id: 0, title: "Présentation", icon: <Sparkles size={14} />, component: StepWelcome },
  { id: 1, title: "Analyse photo", icon: <Camera size={14} />, component: StepPhotoAnalysis },
  { id: 2, title: "Diagnostic IA", icon: <Brain size={14} />, component: StepDiagnostic },
  { id: 3, title: "Clinical Override", icon: <Shield size={14} />, component: StepClinicalOverride },
  { id: 4, title: "PDF clinique", icon: <FileText size={14} />, component: StepPDF },
  { id: 5, title: "Tableau de bord", icon: <BarChart3 size={14} />, component: StepDashboard },
  { id: 6, title: "Réseau patients", icon: <Users size={14} />, component: StepNetwork },
  { id: 7, title: "Commencer", icon: <Star size={14} />, component: StepCTA },
];

/* ─── MAIN COMPONENT ─── */
export default function DermDemo() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const AUTOPLAY_DELAY = 8000;

  const goNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const goPrev = () => setStep(s => Math.max(s - 1, 0));

  useEffect(() => {
    if (playing) {
      timerRef.current = setInterval(() => {
        setStep(s => {
          if (s >= STEPS.length - 1) { setPlaying(false); return s; }
          return s + 1;
        });
      }, AUTOPLAY_DELAY);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [playing]);

  const CurrentStep = STEPS[step].component;

  return (
    <div style={{ background: DS.bg, minHeight: "100vh", color: DS.text, fontFamily: DS.font }}>
      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: "rgba(13,10,14,0.9)", backdropFilter: "blur(20px)", borderBottom: `1px solid ${DS.border}` }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 20px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/derm">
              <button style={{ background: "none", border: "none", cursor: "pointer", color: DS.muted, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8 }}>
                <ArrowLeft size={16} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>Retour</span>
              </button>
            </Link>
            <div style={{ width: 1, height: 20, background: DS.border }} />
            <span style={{ fontSize: 15, fontWeight: 900, color: DS.violet }}>✦ GlowScan DERM</span>
            <div style={{ background: "rgba(124,58,237,0.12)", border: `1px solid ${DS.border}`, borderRadius: 9999, padding: "3px 10px" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: DS.violetMid }}>DÉMO INTERACTIVE</span>
            </div>
          </div>
          <Link href="/pro/inscription">
            <button style={{ background: DS.violet, color: "#fff", border: "none", borderRadius: 9999, padding: "8px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
              Essai gratuit
            </button>
          </Link>
        </div>
      </nav>

      {/* ── PROGRESS STEPS ── */}
      <div style={{ paddingTop: 52 }}>
        <div style={{ background: DS.surface, borderBottom: `1px solid ${DS.border}`, overflowX: "auto" }}>
          <div style={{ display: "flex", padding: "12px 16px", gap: 4, minWidth: "max-content", maxWidth: 960, margin: "0 auto" }}>
            {STEPS.map((s, i) => (
              <button key={i} onClick={() => setStep(i)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20, background: step === i ? "rgba(124,58,237,0.15)" : "transparent", border: step === i ? `1px solid ${DS.violet}` : "1px solid transparent", color: step === i ? DS.violetMid : i < step ? DS.green : DS.subtle, fontSize: 12, fontWeight: step === i ? 800 : 500, cursor: "pointer", transition: "all 0.2s", whiteSpace: "nowrap" }}>
                {i < step ? <CheckCircle2 size={12} color={DS.green} /> : s.icon}
                {s.title}
              </button>
            ))}
          </div>
          {/* Progress bar */}
          <div style={{ height: 2, background: "rgba(255,255,255,0.06)" }}>
            <motion.div animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ duration: 0.3 }}
              style={{ height: "100%", background: `linear-gradient(90deg,${DS.violet},${DS.violetMid})` }} />
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 20px 120px" }}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
              <CurrentStep />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(13,10,14,0.95)", backdropFilter: "blur(20px)", borderTop: `1px solid ${DS.border}`, padding: "14px 20px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Step counter */}
          <div style={{ fontSize: 13, color: DS.muted }}>
            <span style={{ fontWeight: 900, color: DS.violet }}>{step + 1}</span>
            <span> / {STEPS.length}</span>
            <span style={{ marginLeft: 8, color: DS.subtle }}>{STEPS[step].title}</span>
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={goPrev} disabled={step === 0}
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${DS.border}`, borderRadius: 10, padding: "8px 14px", color: step === 0 ? DS.subtle : DS.muted, cursor: step === 0 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
              <ArrowLeft size={14} /> Précédent
            </button>

            <button onClick={() => setPlaying(p => !p)}
              style={{ background: playing ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${playing ? DS.violet : DS.border}`, borderRadius: 10, padding: "8px 14px", color: playing ? DS.violetMid : DS.muted, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }}>
              {playing ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Auto</>}
            </button>

            {step < STEPS.length - 1 ? (
              <button onClick={goNext}
                style={{ background: DS.violet, border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800 }}>
                Suivant <ArrowRight size={14} />
              </button>
            ) : (
              <Link href="/pro/inscription">
                <button style={{ background: DS.violet, border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800 }}>
                  <Sparkles size={14} /> Démarrer <ArrowRight size={14} />
                </button>
              </Link>
            )}
          </div>

          {/* Dot indicators */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? DS.violet : i < step ? DS.green : "rgba(255,255,255,0.15)", border: "none", cursor: "pointer", transition: "all 0.2s", padding: 0 }}></button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
