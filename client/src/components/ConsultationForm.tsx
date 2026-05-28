import { useState } from "react";
import { Loader2, Sparkles, CheckCircle } from "lucide-react";

interface Question {
  id: number;
  label: string;
}

interface ConsultationData {
  observations_visuelles: string;
  questions: Question[];
}

const DS = {
  base: "#0d0a0e",
  surface: "#13101f",
  text: "#f3f0ff",
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
  inputBorder: "rgba(167,139,250,0.2)",
};

export default function ConsultationForm() {
  const [image, setImage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [consultation, setConsultation] = useState<ConsultationData | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [diagnosticFinal, setDiagnosticFinal] = useState<string>("");

  const demarrerConsultation = async () => {
    if (!image) return;
    setLoading(true);
    try {
      const response = await fetch("/api/generate-consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image: image }),
      });
      const data = await response.json();
      setConsultation(data);
    } catch (error) {
      console.error("Erreur consultation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (questionId: number, value: string) => {
    setAnswers({ ...answers, [questionId]: value });
  };

  const soumettreConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/generate-diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: image, reponses: answers }),
      });
      const data = await response.json();
      setDiagnosticFinal(data.diagnostic);
    } catch (error) {
      console.error("Erreur diagnostic:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="p-5 max-w-md mx-auto rounded-2xl"
      style={{
        background: DS.surface,
        border: `1px solid ${DS.border}`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(167,139,250,0.3)" }}>
          <Sparkles className="w-4 h-4" style={{ color: "#a78bfa" }} />
        </div>
        <h2 className="text-sm font-extrabold" style={{ color: DS.text }}>Consultation GlowScan AI</h2>
      </div>

      {/* Phase 1: image URL */}
      {!consultation && (
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider mb-1.5" style={{ color: DS.muted }}>
              URL ou base64 de la photo de peau
            </label>
            <input
              type="text"
              placeholder="URL de la photo..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ background: DS.base, border: `1px solid ${DS.inputBorder}`, color: DS.text }}
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </div>
          <button
            onClick={demarrerConsultation}
            disabled={loading || !image}
            className="w-full py-3 rounded-full font-extrabold text-xs text-white transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "#7c3aed" }}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Analyse en cours…</>
            ) : (
              "Lancer mon analyse cutanée"
            )}
          </button>
        </div>
      )}

      {/* Phase 2: questionnaire */}
      {consultation && !diagnosticFinal && (
        <form onSubmit={soumettreConsultation} className="space-y-4">
          <div
            className="p-4 rounded-xl text-xs italic leading-relaxed"
            style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)", color: DS.body }}
          >
            <span className="font-extrabold not-italic" style={{ color: "#c4b5fd" }}>Dr GlowScan : </span>
            "{consultation.observations_visuelles}"
          </div>

          <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: DS.muted }}>Questions complémentaires :</p>

          {consultation.questions.map((q) => (
            <div key={q.id} className="flex flex-col gap-1.5">
              <label className="text-xs font-bold" style={{ color: DS.body }}>{q.label}</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: DS.base, border: `1px solid ${DS.inputBorder}`, color: DS.text }}
                placeholder="Votre réponse…"
                onChange={(e) => handleInputChange(q.id, e.target.value)}
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full font-extrabold text-xs text-white transition-all active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: "#7c3aed" }}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Génération du diagnostic…</>
            ) : (
              "Obtenir mon ordonnance personnalisée"
            )}
          </button>
        </form>
      )}

      {/* Phase 3: résultat */}
      {diagnosticFinal && (
        <div className="mt-4 p-4 rounded-xl space-y-3" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" style={{ color: "#6ee7b7" }} />
            <h3 className="text-xs font-extrabold uppercase tracking-wider" style={{ color: "#6ee7b7" }}>Diagnostic & routine :</h3>
          </div>
          <p className="text-xs leading-relaxed whitespace-pre-line" style={{ color: DS.body }}>{diagnosticFinal}</p>
        </div>
      )}
    </div>
  );
}
