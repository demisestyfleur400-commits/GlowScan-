import { useState } from "react";
import { VoiceButton } from "@/components/VoiceButton";

// ════════════════════════════════════════════════════════════════════════
// Examen physique (DERM) — documenté par le médecin AVANT la photo et l'IA.
// Respecte la démarche clinique (§3, §8) : lésions élémentaires, localisation,
// nombre, morphologie, distribution, examen dermatologique, autres signes.
// Composant contrôlé : value (objet) + onChange.
// ════════════════════════════════════════════════════════════════════════

export interface ExamenData {
  phototype: string;
  lesions: string[];
  zones: string[];
  lesionNombre: string;
  lesionMorphologie: string;
  lesionDistribution: string;
  examPeau: string;
  examPhaneres: string;
  examMuqueuses: string;
  examGanglions: string;
  autresSignes: string;
  pihRisk: string;
  keloidRisk: string;
  // §9 — champs chéloïde conditionnels (affichés si risque Moyen/Élevé ou lésion « Chéloïde »)
  keloidAntecedents: string;
  keloidLocalisation: string;
  keloidAnciennete: string;
  keloidSymptomes: string;
}

export const EMPTY_EXAMEN: ExamenData = {
  phototype: "", lesions: [], zones: [], lesionNombre: "", lesionMorphologie: "",
  lesionDistribution: "", examPeau: "", examPhaneres: "", examMuqueuses: "",
  examGanglions: "", autresSignes: "", pihRisk: "", keloidRisk: "",
  keloidAntecedents: "", keloidLocalisation: "", keloidAnciennete: "", keloidSymptomes: "",
};

const PHOTOTYPES = [
  { id: "IV", label: "IV", bg: "#c8956c", title: "Phototype IV — brun clair / métissée" },
  { id: "V", label: "V", bg: "#8b5e3c", title: "Phototype V — noire / brun foncé" },
  { id: "VI", label: "VI", bg: "#3b1f0e", title: "Phototype VI — très foncée / ébène" },
];
const LESION_OPTS = ["Macule", "Papule", "Pustule", "Nodule", "Comédon", "Plaque", "Squame", "Vésicule", "Bulle", "Cicatrice/PIH", "Chéloïde"];
const ZONE_OPTS = ["Front", "Joue D", "Joue G", "Nez/Zone T", "Menton", "Cou", "Cuir chevelu", "Tronc", "Membres", "Mains", "Pieds"];

const INK = "#0F172A";
const MUTED = "#64748B";
const fieldBg = "#F1F5F9";
const fieldBorder = "1px solid rgba(167,139,250,0.2)";

// ── Champs définis AU NIVEAU MODULE (jamais dans le render) : sinon React
// démonte/remonte l'input à chaque frappe → perte de focus après 1 lettre. ──
type SetFn = (patch: Partial<ExamenData>) => void;

function TextField({ k, label, ml, ph, value, set }: { k: keyof ExamenData; label: string; ml?: boolean; ph?: string; value: ExamenData; set: SetFn }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 4 }}>{label}</label>
      <div style={{ display: "flex", alignItems: ml ? "flex-start" : "center", gap: 6 }}>
        {ml ? (
          <textarea value={value[k] as string} onChange={(e) => set({ [k]: e.target.value } as any)} rows={2} placeholder={ph}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, background: fieldBg, border: fieldBorder, color: INK, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
        ) : (
          <input type="text" value={value[k] as string} onChange={(e) => set({ [k]: e.target.value } as any)} placeholder={ph}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, background: fieldBg, border: fieldBorder, color: INK, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        )}
        <VoiceButton value={(value[k] as string) || ""} onChange={(t) => set({ [k]: t } as any)} />
      </div>
    </div>
  );
}

function RiskRow({ k, label, value, set }: { k: "pihRisk" | "keloidRisk"; label: string; value: ExamenData; set: SetFn }) {
  return (
    <div>
      <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, marginBottom: 4 }}>{label}</p>
      <div style={{ display: "flex", gap: 4 }}>
        {[["low", "Faible", "#047857"], ["medium", "Moyen", "#fcd34d"], ["high", "Élevé", "#dc2626"]].map(([v, l, c]) => (
          <button key={v} type="button" onClick={() => set({ [k]: value[k] === v ? "" : v } as any)}
            style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 10, fontWeight: 700, cursor: "pointer",
              background: value[k] === v ? `${c}33` : fieldBg, color: value[k] === v ? (c as string) : "#64748B", border: "1px solid #E2E8F0" }}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExamenPhysiqueForm({ value, onChange }: { value: ExamenData; onChange: (next: ExamenData) => void }) {
  const [open, setOpen] = useState(true);
  const set = (patch: Partial<ExamenData>) => onChange({ ...value, ...patch });
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div style={{ borderRadius: 16, overflow: "hidden", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "transparent", border: "none", cursor: "pointer", color: INK, fontSize: 13, fontWeight: 800 }}>
        <span>🔬 Examen physique</span>
        <span style={{ fontSize: 16, color: "#a78bfa" }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Phototype */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, marginBottom: 6 }}>Phototype Fitzpatrick</p>
            <div style={{ display: "flex", gap: 8 }}>
              {PHOTOTYPES.map((p) => (
                <button key={p.id} type="button" title={p.title} onClick={() => set({ phototype: value.phototype === p.id ? "" : p.id })}
                  style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer",
                    background: value.phototype === p.id ? p.bg : "#F1F5F9", color: value.phototype === p.id ? "#fff" : "#64748B",
                    border: value.phototype === p.id ? `2px solid ${p.bg}` : "1px solid #E2E8F0" }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lésions élémentaires */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, marginBottom: 6 }}>Lésions élémentaires</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {LESION_OPTS.map((l) => {
                const on = value.lesions.includes(l);
                return (
                  <button key={l} type="button" onClick={() => set({ lesions: toggle(value.lesions, l) })}
                    style={{ padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
                      background: on ? "rgba(139,92,246,0.3)" : "#F1F5F9", color: on ? "#7c3aed" : "#64748B",
                      border: on ? "1px solid #7c3aed" : "1px solid #E2E8F0" }}>
                    {l}
                  </button>
                );
              })}
            </div>
          </div>

          <TextField value={value} set={set} k="lesionNombre" label="Nombre" ph="ex : 5-10, multiples…" />
          <TextField value={value} set={set} k="lesionMorphologie" label="Morphologie" ml ph="taille, couleur, contours, relief…" />
          <TextField value={value} set={set} k="lesionDistribution" label="Distribution" ph="symétrique, localisée, diffuse…" />

          {/* Zones / localisation */}
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, marginBottom: 6 }}>Localisation / zones atteintes</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {ZONE_OPTS.map((z) => {
                const on = value.zones.includes(z);
                return (
                  <button key={z} type="button" onClick={() => set({ zones: toggle(value.zones, z) })}
                    style={{ padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: "pointer",
                      background: on ? "rgba(59,130,246,0.3)" : "#F1F5F9", color: on ? "#2563eb" : "#64748B",
                      border: on ? "1px solid #3b82f6" : "1px solid #E2E8F0" }}>
                    {z}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Examen dermatologique */}
          <TextField value={value} set={set} k="examPeau" label="Peau" ml />
          <TextField value={value} set={set} k="examPhaneres" label="Phanères (ongles, cheveux)" />
          <TextField value={value} set={set} k="examMuqueuses" label="Muqueuses" />
          <TextField value={value} set={set} k="examGanglions" label="Aires ganglionnaires" />
          <TextField value={value} set={set} k="autresSignes" label="Autres signes cliniques pertinents" ml />

          {/* Risques */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <RiskRow value={value} set={set} k="pihRisk" label="Risque PIH" />
            <RiskRow value={value} set={set} k="keloidRisk" label="Risque chéloïde" />
          </div>

          {/* §9 — Sous-section chéloïde conditionnelle : n'apparaît que si le risque
              est Moyen/Élevé ou si « Chéloïde » est coché en lésion élémentaire. */}
          {(value.keloidRisk === "medium" || value.keloidRisk === "high" || value.lesions.includes("Chéloïde")) && (
            <div style={{ borderRadius: 12, padding: 12, background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)", display: "flex", flexDirection: "column", gap: 10 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: "#dc2626", margin: 0 }}>⚠️ Documentation chéloïde</p>
              <TextField value={value} set={set} k="keloidAntecedents" label="Antécédents (personnels / familiaux)" ph="ex : chéloïde après piercing, antécédents familiaux…" />
              <TextField value={value} set={set} k="keloidLocalisation" label="Localisation des chéloïdes" ph="ex : lobe oreille, thorax, épaules…" />
              <TextField value={value} set={set} k="keloidAnciennete" label="Ancienneté / évolution" ph="ex : apparue il y a 2 ans, extension progressive…" />
              <TextField value={value} set={set} k="keloidSymptomes" label="Symptômes (prurit, douleur, extension)" ml />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
