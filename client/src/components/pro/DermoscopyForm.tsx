import { useRef } from "react";
import { Microscope, X, ImagePlus } from "lucide-react";
import { VoiceButton } from "@/components/VoiceButton";
import { DERMO_CHOICES, EMPTY_DERMO, type DermoData } from "@/components/pro/ExamenPhysiqueForm";

// ════════════════════════════════════════════════════════════════════════
// Dermoscopie (DERM) — bloc à part, rempli à l'étape « Examen + Photo », AVANT
// l'analyse IA. Ses constatations orientent les diagnostics proposés par l'IA et
// par Glow. Les photos au dermatoscope sont rangées à part (jamais envoyées à l'IA
// photo) : le médecin les retrouve au dossier et au suivi.
// ════════════════════════════════════════════════════════════════════════

const INK = "var(--color-text)";
const MUTED = "var(--color-neutral-700)";
const ACC = "#2a6b4f";
const LINE = "1px solid #E2E8F0";
const field = { flex: 1, padding: "9px 12px", borderRadius: 10, background: "var(--color-bg)", border: "1px solid rgba(42,107,79,0.2)", color: INK, fontSize: 13, outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit" };

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <span style={{ flex: "none", width: 24, height: 24, borderRadius: 99, background: "rgba(42,107,79,0.12)", color: ACC, fontSize: 12, fontWeight: 800, display: "grid", placeItems: "center", marginTop: 1 }}>{n}</span>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12.5, fontWeight: 800, color: INK }}>{title}</p>
          {hint && <p style={{ margin: "1px 0 0", fontSize: 11, color: MUTED }}>{hint}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

function Chips({ options, value, onChange, single }: { options: string[]; value: string[]; onChange: (v: string[]) => void; single?: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" aria-pressed={on}
            onClick={() => onChange(single ? (on ? [] : [o]) : on ? value.filter((x) => x !== o) : [...value, o])}
            style={{ padding: "6px 11px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: "pointer",
              background: on ? "rgba(42,107,79,0.14)" : "var(--color-bg)", color: on ? "var(--color-accent)" : MUTED, border: on ? `1px solid ${ACC}` : LINE }}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Text({ value, onChange, ph, ml }: { value: string; onChange: (v: string) => void; ph?: string; ml?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: ml ? "flex-start" : "center", gap: 6 }}>
      {ml
        ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={ph} style={{ ...field, resize: "vertical" }} />
        : <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={ph} style={field} />}
      <VoiceButton value={value} onChange={onChange} />
    </div>
  );
}

export function DermoscopyForm({ value, onChange, photos, onPhotos, compress }: {
  value: DermoData | undefined;
  onChange: (next: DermoData) => void;
  photos: string[];
  onPhotos: (next: string[]) => void;
  /** Compression fournie par la page (même réglage que les photos cliniques). */
  compress: (f: File) => Promise<{ base64: string }>;
}) {
  const d: DermoData = { ...EMPTY_DERMO, ...(value || {}) };
  const set = (patch: Partial<DermoData>) => onChange({ ...d, ...patch });
  const fileRef = useRef<HTMLInputElement | null>(null);
  const addPhoto = async (f: File | undefined | null) => {
    if (!f || !f.type.startsWith("image/") || photos.length >= 2) return;
    try { const { base64 } = await compress(f); onPhotos([...photos, base64].slice(0, 2)); } catch { /* image illisible : ignorée */ }
  };

  return (
    <div data-testid="dermoscopy-block" style={{ borderRadius: 16, background: "#fff", border: `1.5px solid ${ACC}`, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "rgba(42,107,79,0.07)", borderBottom: "1px solid rgba(42,107,79,0.15)" }}>
        <Microscope size={18} color={ACC} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: INK }}>Dermoscopie</p>
          <p style={{ margin: 0, fontSize: 11, color: MUTED }}>Avant l'analyse IA : vos constatations orientent les diagnostics proposés par l'IA et par Glow.</p>
        </div>
      </div>

      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: INK }}>Avez-vous fait une dermoscopie ?</span>
          {(["oui", "non"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={d.done === v} onClick={() => set({ done: d.done === v ? "" : v })}
              style={{ padding: "7px 18px", borderRadius: 10, fontSize: 12.5, fontWeight: 800, cursor: "pointer",
                background: d.done === v ? ACC : "var(--color-bg)", color: d.done === v ? "#fff" : MUTED, border: d.done === v ? `1px solid ${ACC}` : LINE }}>
              {v === "oui" ? "Oui" : "Non"}
            </button>
          ))}
        </div>

        {d.done === "non" && <p style={{ margin: 0, fontSize: 12, color: MUTED }}>Pas de dermoscopie pour cette consultation : l'IA s'appuie sur l'examen physique et les photos.</p>}

        {d.done === "oui" && (
          <>
            <Step n={1} title="Lésion ou zone examinée" hint="Où avez-vous posé le dermatoscope ?">
              <Text value={d.zone} onChange={(v) => set({ zone: v })} ph="ex : macule de la pommette gauche" />
            </Step>
            <Step n={2} title="Mode d'examen">
              <Chips options={DERMO_CHOICES.mode} value={d.mode} onChange={(v) => set({ mode: v })} />
            </Step>
            <Step n={3} title="Couleurs observées">
              <Chips options={DERMO_CHOICES.couleurs} value={d.couleurs} onChange={(v) => set({ couleurs: v })} />
            </Step>
            <Step n={4} title="Motif global" hint="Un seul choix">
              <Chips single options={DERMO_CHOICES.motif} value={d.motif ? [d.motif] : []} onChange={(v) => set({ motif: v[0] || "" })} />
            </Step>
            <Step n={5} title="Structures observées" hint="Cochez ce que vous voyez, par famille">
              <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 800, color: MUTED }}>Pigmentaires</p>
              <Chips options={DERMO_CHOICES.pigmentaires} value={d.pigmentaires} onChange={(v) => set({ pigmentaires: v })} />
              <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 800, color: MUTED }}>Folliculaires et de surface</p>
              <Chips options={DERMO_CHOICES.folliculaires} value={d.folliculaires} onChange={(v) => set({ folliculaires: v })} />
              <p style={{ margin: "6px 0 0", fontSize: 11, fontWeight: 800, color: MUTED }}>Vaisseaux</p>
              <Chips options={DERMO_CHOICES.vaisseaux} value={d.vaisseaux} onChange={(v) => set({ vaisseaux: v })} />
            </Step>
            <Step n={6} title="Votre conclusion dermoscopique" hint="Un seul choix, puis votre hypothèse">
              <Chips single options={DERMO_CHOICES.conclusion} value={d.conclusion ? [d.conclusion] : []} onChange={(v) => set({ conclusion: v[0] || "" })} />
              <Text value={d.hypothese} onChange={(v) => set({ hypothese: v })} ph="Hypothèse dermoscopique, ex : mélasma épidermique" />
            </Step>
            <Step n={7} title="Description libre" hint="Facultatif : ce que les cases ne disent pas">
              <Text ml value={d.description} onChange={(v) => set({ description: v })} ph="répartition, intensité, aspect des orifices folliculaires…" />
            </Step>
            <Step n={8} title="Photos au dermatoscope" hint="Facultatif, 2 au maximum. Rangées au dossier, elles ne sont pas analysées par l'IA.">
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {photos.map((src, i) => (
                  <div key={i} style={{ position: "relative", width: 96, height: 96, borderRadius: 12, overflow: "hidden", border: LINE }}>
                    <img src={src} alt={`Photo au dermatoscope ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <button type="button" aria-label="Retirer la photo" onClick={() => onPhotos(photos.filter((_, j) => j !== i))}
                      style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 99, border: 0, background: "rgba(0,0,0,.6)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
                      <X size={13} />
                    </button>
                  </div>
                ))}
                {photos.length < 2 && (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    style={{ width: 96, height: 96, borderRadius: 12, border: `1.5px dashed ${ACC}`, background: "rgba(42,107,79,0.04)", color: ACC, fontSize: 11, fontWeight: 800, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <ImagePlus size={18} /> Ajouter
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden data-testid="dermo-photo-input"
                  onChange={(e) => { addPhoto(e.target.files?.[0]); e.target.value = ""; }} />
              </div>
            </Step>
          </>
        )}
      </div>
    </div>
  );
}
