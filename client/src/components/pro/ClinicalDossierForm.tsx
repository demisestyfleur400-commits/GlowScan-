import { useState } from "react";
import { VoiceButton } from "@/components/VoiceButton";

// ════════════════════════════════════════════════════════════════════════
// Dossier clinique structuré (DERM) — démarche médicale standard.
// Étape 1 : Identification / Motif / HMA / Antécédents (dermato-focus).
// L'examen clinique = étape séparée (Étape 3). Tout est stocké en JSON.
// Composant contrôlé : value (objet plat) + onChange.
// ════════════════════════════════════════════════════════════════════════

export type ClinicalRecord = Record<string, string>;

const NAVY = "#7c3aed";
const INK = "#0F172A";
const MUTED = "#64748B";
const fieldBg = "#F1F5F9";
const fieldBorder = "1px solid rgba(167,139,250,0.2)";

type FieldDef = { key: string; label: string; ml?: boolean; ph?: string; choices?: string[]; multi?: boolean };
type Section = { id: string; title: string; icon: string; fields: FieldDef[] };

// Le seul champ visible par défaut : le MOTIF. Tout le reste = contexte optionnel.
const MOTIF: FieldDef = { key: "motif", label: "Motif de consultation (mots du patient)", ml: true, ph: "Ex : taches brunes sur les joues depuis 3 mois…" };

// Contexte clinique — replié par défaut sous un seul bouton. Champs administratifs
// (identité complète, groupe sanguin, rhésus, sérologie, ethnie, religion, statut
// marital…) RETIRÉS du flux d'analyse : ils relèvent d'un dossier administratif,
// pas d'une lecture dermatologique. On garde uniquement ce qui change une décision.
const SECTIONS: Section[] = [
  {
    id: "hma", title: "Histoire de la maladie", icon: "📈",
    fields: [
      { key: "hmaDebut", label: "Depuis quand ?", choices: ["< 1 semaine", "1–4 semaines", "1–3 mois", "> 3 mois"] },
      { key: "hmaEvolution", label: "Évolution", choices: ["S'aggrave", "Stable", "S'améliore", "Par poussées"] },
      { key: "hmaSymptomes", label: "Autres symptômes", ml: true, ph: "au-delà de prurit/douleur (déjà dans Signes fonctionnels)…" },
      { key: "hmaTraitements", label: "Traitements déjà entrepris", ml: true },
    ],
  },
  {
    id: "atcdPerso", title: "Antécédents pertinents", icon: "🧬",
    fields: [
      { key: "atcdCosmeto", label: "Cosmétologiques (produits, habitudes de soins)", ml: true },
      { key: "atcdMedicaux", label: "Médicaux / traitements en cours", ml: true },
      { key: "allergMedic", label: "Allergies médicamenteuses", choices: ["Aucune connue", "Oui (préciser ci-dessous)"] },
      { key: "toxicologiques", label: "Toxicologiques", choices: ["Tabac", "Alcool", "Aucun"], multi: true },
    ],
  },
  {
    id: "atcdFam", title: "Antécédents familiaux & mode de vie", icon: "👪",
    fields: [
      { key: "atcdFamiliaux", label: "Antécédents familiaux", ml: true },
      { key: "modeVie", label: "Mode de vie", ml: true },
    ],
  },
];

// Anamnèse — signes fonctionnels (oui/non), remplis dès l'intake (avant l'examen).
// Stockés dans le dossier sous la clé anam_<key>.
const ANAMNESE_YESNO: { key: string; label: string }[] = [
  { key: "prurit", label: "Démangeaisons (prurit) ?" },
  { key: "douleur", label: "Douleur ou brûlure ?" },
  { key: "soleil", label: "Aggravation au soleil ?" },
  { key: "extension", label: "Les lésions s'étendent-elles ?" },
  { key: "fievre", label: "Fièvre associée ?" },
  { key: "atopie", label: "Terrain allergique / atopique ?" },
  { key: "medicaments", label: "Prise de médicaments en cours ?" },
  { key: "familial", label: "Antécédents familiaux cutanés ?" },
];

function Chips({ f, value, set }: { f: FieldDef; value: ClinicalRecord; set: (k: string, v: string) => void }) {
  const cur = value[f.key] || "";
  const selected = f.multi ? cur.split(",").map((s) => s.trim()).filter(Boolean) : [cur];
  const toggle = (c: string) => {
    if (f.multi) {
      const has = selected.includes(c);
      const next = has ? selected.filter((x) => x !== c) : [...selected, c];
      set(f.key, next.join(", "));
    } else {
      set(f.key, cur === c ? "" : c);
    }
  };
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 6 }}>{f.label}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(f.choices || []).map((c) => {
          const on = selected.includes(c);
          return (
            <button key={c} type="button" onClick={() => toggle(c)}
              style={{ padding: "7px 12px", borderRadius: 9999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: on ? "rgba(124,58,237,0.12)" : "#F1F5F9", color: on ? NAVY : "#64748B",
                border: on ? `1px solid ${NAVY}` : "1px solid #E2E8F0" }}>
              {c}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Field({ f, value, set }: { f: FieldDef; value: ClinicalRecord; set: (k: string, v: string) => void }) {
  if (f.choices) return <Chips f={f} value={value} set={set} />;
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 4 }}>{f.label}</label>
      <div style={{ display: "flex", alignItems: f.ml ? "flex-start" : "center", gap: 6 }}>
        {f.ml ? (
          <textarea value={value[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} rows={2} placeholder={f.ph}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, background: fieldBg, border: fieldBorder, color: INK, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
        ) : (
          <input type="text" value={value[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} placeholder={f.ph}
            style={{ flex: 1, padding: "9px 12px", borderRadius: 10, background: fieldBg, border: fieldBorder, color: INK, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
        )}
        <VoiceButton value={value[f.key] || ""} onChange={(t) => set(f.key, t)} />
      </div>
    </div>
  );
}

export function ClinicalDossierForm({ value, onChange }: { value: ClinicalRecord; onChange: (next: ClinicalRecord) => void }) {
  const [showContext, setShowContext] = useState(false); // contexte replié par défaut
  const [open, setOpen] = useState<string>("hma");        // 1re sous-section ouverte quand on déplie
  const set = (k: string, v: string) => onChange({ ...value, [k]: v });

  // Combien de champs de contexte sont remplis (pour un indice discret sur le bouton).
  const ctxFilled =
    SECTIONS.reduce((n, s) => n + s.fields.filter((f) => (value[f.key] || "").trim()).length, 0) +
    ANAMNESE_YESNO.filter((q) => (value[`anam_${q.key}`] || "").trim()).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* MOTIF — le seul champ visible par défaut */}
      <Field f={MOTIF} value={value} set={set} />

      {/* Un SEUL bouton pour tout le contexte clinique (optionnel) */}
      <button type="button" onClick={() => setShowContext((v) => !v)} data-testid="toggle-clinical-context"
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px",
          background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 12, cursor: "pointer",
          color: NAVY, fontSize: 13, fontWeight: 800 }}>
        <span>+ Contexte clinique <span style={{ color: MUTED, fontWeight: 600 }}>(optionnel)</span>{ctxFilled > 0 ? <span style={{ color: "#0369A1", marginLeft: 6 }}>· {ctxFilled}</span> : null}</span>
        <span style={{ fontSize: 16, lineHeight: 1 }}>{showContext ? "−" : "+"}</span>
      </button>

      {showContext && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SECTIONS.map((sec) => {
            const isOpen = open === sec.id;
            return (
              <div key={sec.id} style={{ borderRadius: 14, overflow: "hidden", background: "rgba(124,58,237,0.04)", border: "1px solid #E2E8F0" }}>
                <button type="button" onClick={() => setOpen(isOpen ? "" : sec.id)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "transparent", border: "none", cursor: "pointer", color: INK, fontSize: 13, fontWeight: 800 }}>
                  <span>{sec.icon} {sec.title}</span>
                  <span style={{ fontSize: 16, lineHeight: 1, color: "#0369A1" }}>{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {sec.fields.map((f) => <Field key={f.key} f={f} value={value} set={set} />)}
                  </div>
                )}
              </div>
            );
          })}

          {/* Anamnèse — signes fonctionnels (toggles rapides, nourrissent l'IA) */}
          {(() => {
            const isOpen = open === "anamYesNo";
            return (
              <div style={{ borderRadius: 14, overflow: "hidden", background: "rgba(124,58,237,0.04)", border: "1px solid #E2E8F0" }}>
                <button type="button" onClick={() => setOpen(isOpen ? "" : "anamYesNo")}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "transparent", border: "none", cursor: "pointer", color: INK, fontSize: 13, fontWeight: 800 }}>
                  <span>❓ Signes fonctionnels <span style={{ color: MUTED, fontWeight: 600, fontSize: 11 }}>· rapide</span></span>
                  <span style={{ fontSize: 16, lineHeight: 1, color: "#0369A1" }}>{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                    {ANAMNESE_YESNO.map((q) => {
                      const cur = value[`anam_${q.key}`] || "";
                      return (
                        <div key={q.key}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: INK, margin: "0 0 5px" }}>{q.label}</p>
                          <div style={{ display: "flex", gap: 6 }}>
                            {[["oui", "Oui", "#047857", "rgba(16,185,129,0.15)"], ["non", "Non", "#dc2626", "rgba(248,113,113,0.15)"], ["nsp", "NSP", "#64748B", "#F1F5F9"]].map(([v, lab, col, bg]) => {
                              const on = cur === v;
                              return (
                                <button key={v} type="button" onClick={() => set(`anam_${q.key}`, on ? "" : (v as string))}
                                  style={{ flex: 1, padding: "8px 0", borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer",
                                    background: on ? (bg as string) : "#F8FAFC", color: on ? (col as string) : "#64748B",
                                    border: on ? `1px solid ${col}` : "1px solid #E2E8F0" }}>
                                  {lab}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
