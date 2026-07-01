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
const INK = "#f3f0ff";
const MUTED = "rgba(255,255,255,0.55)";
const fieldBg = "rgba(255,255,255,0.04)";
const fieldBorder = "1px solid rgba(167,139,250,0.2)";

type FieldDef = { key: string; label: string; ml?: boolean; ph?: string };
type Section = { id: string; title: string; icon: string; fields: FieldDef[] };

const SECTIONS: Section[] = [
  {
    id: "ident", title: "Identification (compléments)", icon: "🪪",
    fields: [
      { key: "profession", label: "Profession" },
      { key: "dateNaissance", label: "Date de naissance", ph: "JJ/MM/AAAA" },
      { key: "lieuNaissance", label: "Lieu de naissance" },
      { key: "ethnie", label: "Ethnie" },
      { key: "ville", label: "Ville de résidence" },
      { key: "adresse", label: "Adresse" },
      { key: "email", label: "Email" },
      { key: "contactUrgence", label: "Personne à joindre (urgence)" },
      { key: "religion", label: "Religion" },
      { key: "statutMarital", label: "Statut marital" },
    ],
  },
  {
    id: "motif", title: "Motif de consultation", icon: "🎯",
    fields: [{ key: "motif", label: "Motif (mots du patient)", ml: true, ph: "Ce que le patient décrit lui-même…" }],
  },
  {
    id: "hma", title: "Histoire de la maladie (HMA)", icon: "📈",
    fields: [
      { key: "hmaDebut", label: "Date de début / durée", ph: "Ex : il y a 3 semaines" },
      { key: "hmaInstallation", label: "Mode d'installation", ph: "brutal / progressif" },
      { key: "hmaEvolution", label: "Évolution", ml: true },
      { key: "hmaSymptomes", label: "Symptômes associés", ml: true, ph: "prurit, douleur, brûlure…" },
      { key: "hmaTraitements", label: "Traitements déjà entrepris", ml: true },
      { key: "hmaConsultations", label: "Consultations antérieures", ml: true },
      { key: "hmaExamens", label: "Examens déjà réalisés", ml: true },
    ],
  },
  {
    id: "atcdPerso", title: "Antécédents personnels", icon: "🧬",
    fields: [
      { key: "atcdCosmeto", label: "Cosmétologiques (produits, habitudes de soins)", ml: true },
      { key: "atcdMedicaux", label: "Médicaux", ml: true },
      { key: "atcdChirurgicaux", label: "Chirurgicaux", ml: true },
      { key: "allergAlimentaires", label: "Allergies — alimentaires" },
      { key: "allergMedic", label: "Allergies — médicamenteuses" },
      { key: "allergEnv", label: "Allergies — environnementales" },
      { key: "atopie", label: "Atopie" },
      { key: "groupeSanguin", label: "Groupe sanguin" },
      { key: "rhesus", label: "Rhésus" },
      { key: "serologieHiv", label: "Sérologie HIV (date)" },
      { key: "gynecoObst", label: "Gynéco-obstétricaux" },
      { key: "toxicologiques", label: "Toxicologiques (tabac, alcool…)" },
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

export function ClinicalDossierForm({ value, onChange }: { value: ClinicalRecord; onChange: (next: ClinicalRecord) => void }) {
  const [open, setOpen] = useState<string>("motif"); // Motif ouvert par défaut
  const set = (k: string, v: string) => onChange({ ...value, [k]: v });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {SECTIONS.map((sec) => {
        const isOpen = open === sec.id;
        const filled = sec.fields.filter((f) => (value[f.key] || "").trim()).length;
        return (
          <div key={sec.id} style={{ borderRadius: 14, overflow: "hidden", background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)" }}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? "" : sec.id)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", background: "transparent", border: "none", cursor: "pointer", color: INK, fontSize: 13, fontWeight: 800 }}
            >
              <span>
                {sec.icon} {sec.title}
                {filled > 0 ? <span style={{ color: "#a78bfa", marginLeft: 6, fontWeight: 700 }}>· {filled}</span> : null}
              </span>
              <span style={{ fontSize: 16, lineHeight: 1, color: "#a78bfa" }}>{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                {sec.fields.map((f) => {
                  return (
                  <div key={f.key}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: MUTED, marginBottom: 4 }}>{f.label}</label>
                    <div style={{ display: "flex", alignItems: f.ml ? "flex-start" : "center", gap: 6 }}>
                      {f.ml ? (
                        <textarea
                          value={value[f.key] || ""}
                          onChange={(e) => set(f.key, e.target.value)}
                          rows={2}
                          placeholder={f.ph}
                          style={{ flex: 1, padding: "9px 12px", borderRadius: 10, background: fieldBg, border: fieldBorder, color: INK, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={value[f.key] || ""}
                          onChange={(e) => set(f.key, e.target.value)}
                          placeholder={f.ph}
                          style={{ flex: 1, padding: "9px 12px", borderRadius: 10, background: fieldBg, border: fieldBorder, color: INK, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                        />
                      )}
                      <VoiceButton value={value[f.key] || ""} onChange={(t) => set(f.key, t)} />
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
