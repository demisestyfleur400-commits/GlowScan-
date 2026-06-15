import { useState } from "react";
import { motion } from "framer-motion";
import type { AnalysisResult } from "@shared/schema";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface ClinicalOverrideProps {
  aiDiagnosis: AnalysisResult;
  patientId: number;
  scanId: number;
  onSave: (override: ClinicalOverrideData) => Promise<void>;
}

export interface ClinicalOverrideData {
  overrideMode: "none" | "partial" | "full";
  condition?: string;
  score?: number;
  explanation: string;
}

const NAVY = "#7c3aed";
const GREEN = "#10b981";
const INK = "#f3f0ff";
const SURFACE = "#13101f";

export function ClinicalOverride({
  aiDiagnosis,
  patientId,
  scanId,
  onSave,
}: ClinicalOverrideProps) {
  const [overrideMode, setOverrideMode] = useState<"none" | "partial" | "full">(
    "none"
  );
  const [condition, setCondition] = useState(aiDiagnosis.condition || "");
  const [score, setScore] = useState(aiDiagnosis.score || 50);
  const [explanation, setExplanation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle"
  );

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");

    try {
      await onSave({
        overrideMode,
        condition: overrideMode !== "none" ? condition : undefined,
        score: overrideMode !== "none" ? score : undefined,
        explanation,
      });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch (err) {
      console.error("Failed to save override:", err);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  const hasOverride = overrideMode !== "none" && explanation.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Mode Selector */}
      <Card style={{ background: SURFACE, border: "1px solid rgba(167,139,250,0.2)" }}>
        <CardHeader className="pb-3">
          <CardTitle style={{ color: INK }} className="text-sm">
            Clinical Override Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {(["none", "partial", "full"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setOverrideMode(mode)}
                className="py-2 px-3 rounded-lg font-medium text-sm transition-all"
                style={{
                  background:
                    overrideMode === mode ? NAVY : "rgba(167,139,250,0.1)",
                  color:
                    overrideMode === mode
                      ? INK
                      : "rgba(200,185,255,0.6)",
                  border:
                    overrideMode === mode
                      ? `2px solid ${NAVY}`
                      : "1px solid rgba(167,139,250,0.2)",
                }}
              >
                {mode === "none"
                  ? "No Override"
                  : mode === "partial"
                    ? "Partial"
                    : "Full"}
              </button>
            ))}
          </div>
          <p style={{ color: "rgba(200,185,255,0.6)", fontSize: "12px" }}>
            {overrideMode === "none"
              ? "AI diagnosis stands as-is"
              : overrideMode === "partial"
                ? "Correct condition/score only"
                : "Full replacement of diagnosis"}
          </p>
        </CardContent>
      </Card>

      {/* Side-by-Side Comparison */}
      {overrideMode !== "none" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 gap-4"
        >
          {/* AI Diagnosis */}
          <Card style={{ background: SURFACE, border: `2px solid ${NAVY}` }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ color: NAVY }} className="text-xs">
                🤖 AI DETECTED
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p style={{ color: "rgba(200,185,255,0.5)", fontSize: "11px" }}>
                  Condition
                </p>
                <p
                  style={{ color: INK, fontSize: "13px" }}
                  className="font-medium"
                >
                  {aiDiagnosis.condition}
                </p>
              </div>
              <div>
                <p style={{ color: "rgba(200,185,255,0.5)", fontSize: "11px" }}>
                  Score
                </p>
                <p
                  style={{ color: INK, fontSize: "13px" }}
                  className="font-medium"
                >
                  {aiDiagnosis.score}/100
                </p>
              </div>
              <div>
                <p style={{ color: "rgba(200,185,255,0.5)", fontSize: "11px" }}>
                  Confidence
                </p>
                <p
                  style={{ color: INK, fontSize: "13px" }}
                  className="font-medium"
                >
                  {aiDiagnosis.confidence || "95%"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Your Override */}
          <Card style={{ background: SURFACE, border: `2px solid ${GREEN}` }}>
            <CardHeader className="pb-2">
              <CardTitle style={{ color: GREEN }} className="text-xs">
                👨‍⚕️ YOUR OVERRIDE
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label
                  style={{ color: "rgba(200,185,255,0.6)", fontSize: "11px" }}
                  className="block mb-1 font-medium"
                >
                  Correct Condition
                </label>
                <input
                  type="text"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full px-2 py-1 rounded text-sm"
                  style={{
                    background: "rgba(167,139,250,0.1)",
                    border: "1px solid rgba(167,139,250,0.2)",
                    color: INK,
                  }}
                />
              </div>
              <div>
                <label
                  style={{ color: "rgba(200,185,255,0.6)", fontSize: "11px" }}
                  className="block mb-1 font-medium"
                >
                  Corrected Score: {score}/100
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="w-full"
                  style={{ accentColor: GREEN }}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Explanation */}
      {overrideMode !== "none" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          <label style={{ color: "rgba(200,185,255,0.6)" }} className="text-sm font-medium block">
            Clinical Explanation (Why you're overriding)
          </label>
          <Textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="E.g., 'I see inflammation in capillaries indicating rosacea component. Also visible keloid scarring on left cheek which AI scored as acne only.'"
            className="min-h-20"
            style={{
              background: SURFACE,
              border: "1px solid rgba(167,139,250,0.2)",
              color: INK,
            }}
          />
          <p style={{ color: "rgba(200,185,255,0.4)", fontSize: "11px" }}>
            This explanation will be stored for audit trail and patient communication.
          </p>
        </motion.div>
      )}

      {/* Save Button */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={
            isSaving || (overrideMode !== "none" && explanation.trim().length === 0)
          }
          className="flex-1"
          style={{
            background: hasOverride ? GREEN : NAVY,
            color: INK,
          }}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : saveStatus === "success" ? (
            <>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Saved ✓
            </>
          ) : (
            `Save ${overrideMode !== "none" ? "Override" : "Diagnosis"}`
          )}
        </Button>

        {saveStatus === "error" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-red-400 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            Save failed
          </motion.div>
        )}
      </div>

      {/* Info */}
      {overrideMode === "none" && (
        <div
          className="p-3 rounded-lg text-xs"
          style={{
            background: "rgba(124,58,237,0.1)",
            border: `1px solid ${NAVY}`,
            color: "rgba(200,185,255,0.8)",
          }}
        >
          💡 <strong>No override:</strong> AI diagnosis will be used as-is for the PDF and patient report.
        </div>
      )}
    </motion.div>
  );
}
