import { useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  MessageCircle,
  FileText,
  ScanLine,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertCircle,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  usePatientDossier,
  useValidateScan,
  useDeletePatient,
  useProAccount,
} from "@/hooks/use-pro";
import { ProLayout, ProCard, ProInput, StatusBadge } from "@/components/ProLayout";
import { useToast } from "@/hooks/use-toast";
import { LoadingScreen } from "./ProDashboard";

const NAVY = "#7c3aed";
const INK = "#f3f0ff";
const GREEN = "#10b981";

const DS = {
  body: "rgba(200,185,255,0.65)",
  muted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.07)",
};

export default function ProPatient() {
  const [, params] = useRoute("/pro/patient/:id");
  const [, setLocation] = useLocation();
  const id = params ? parseInt(params.id) : null;
  const { data, isLoading } = usePatientDossier(id);
  const { data: accData } = useProAccount();
  const validate = useValidateScan();
  const del = useDeletePatient();
  const { toast } = useToast();
  const [validatingId, setValidatingId] = useState<number | null>(null);
  const [validateNote, setValidateNote] = useState("");
  const [validateCorrection, setValidateCorrection] = useState("");

  if (isLoading || !data) return <LoadingScreen />;

  const { patient: p, scans } = data;
  const lastScan = scans[0];
  const previousScan = scans[1];
  const dermato = accData?.account;

  const sendWhatsApp = () => {
    if (!p.whatsappNumber) {
      toast({ title: "Pas de WhatsApp", description: "Ce patient n'a pas de numéro enregistré.", variant: "destructive" });
      return;
    }
    if (!lastScan) return;
    const products = (lastScan.recommendations as any)?.products?.slice(0, 3).join(", ") || "";
    const msg = encodeURIComponent(
      `Bonjour ${p.firstName}, suite à votre analyse GlowScan du ${new Date(lastScan.createdAt!).toLocaleDateString("fr-FR")},\n` +
        `voici votre diagnostic : ${lastScan.condition || "—"}.\n` +
        (products ? `Produits recommandés : ${products}.\n` : "") +
        `Prochaine étape : ${lastScan.motivation || "rescannez dans 4 semaines pour mesurer votre progression."}\n\n` +
        `— ${dermato?.fullName || "Votre dermato"}\nvia GlowScan Pro`
    );
    const phone = p.whatsappNumber.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const exportPdf = () => window.open(`/api/pro/patients/${p.id}/pdf`, "_blank");

  const handleValidate = async (scanId: number, isVerified: boolean) => {
    try {
      await validate.mutateAsync({ scanId, isVerified, expertNote: validateNote, expertCorrectedCondition: validateCorrection });
      toast({ title: isVerified ? "Validé" : "Rejeté", description: isVerified ? "Ajouté au dataset GlowScan" : "Sera réétudié" });
      setValidatingId(null);
      setValidateNote("");
      setValidateCorrection("");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Supprimer le dossier de ${p.firstName} ${p.lastName} ?`)) return;
    await del.mutateAsync(p.id);
    setLocation("/pro/patients");
  };

  const daysSinceLast = lastScan?.createdAt
    ? Math.floor((Date.now() - new Date(lastScan.createdAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const showReminder = daysSinceLast !== null && daysSinceLast >= 30;
  const evolution = lastScan && previousScan ? (lastScan.score || 0) - (previousScan.score || 0) : null;

  return (
    <ProLayout
      title="Dossier patient"
      back="/pro/patients"
      rightAction={
        <button
          onClick={handleDelete}
          data-testid="button-delete"
          className="p-2 rounded-xl transition-colors"
          style={{ color: DS.muted }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
          onMouseLeave={(e) => (e.currentTarget.style.color = DS.muted)}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      }
    >
      {/* Patient header */}
      <ProCard className="p-5 mb-4">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-extrabold text-base flex-shrink-0"
            style={{ background: NAVY }}
          >
            {p.firstName[0]}
            {p.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-extrabold" style={{ color: INK }} data-testid="text-patient-name">
              {p.firstName} {p.lastName}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: DS.muted }}>
              {p.age ? `${p.age} ans · ` : ""}
              {p.sex || ""}
              {p.whatsappNumber ? ` · ${p.whatsappNumber}` : ""}
            </p>
            <div className="mt-2">
              <StatusBadge status={p.status} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Link
            href={`/pro/analyse?patient=${p.id}`}
            data-testid="button-new-scan"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-full text-white text-xs font-extrabold transition-all active:scale-[0.97]"
            style={{ background: NAVY }}
          >
            <ScanLine className="w-3.5 h-3.5" />
            Nouvelle analyse
          </Link>
          <button
            onClick={sendWhatsApp}
            data-testid="button-whatsapp"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-full text-white text-xs font-extrabold transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg, #25d366 0%, #128c7e 100%)" }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={exportPdf}
            data-testid="button-pdf"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-full text-xs font-extrabold transition-all active:scale-[0.97]"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: DS.body }}
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      </ProCard>

      {/* Reminder 30j */}
      {showReminder && (
        <ProCard className="p-4 mb-4" style={{ background: "rgba(251,191,36,0.08)", borderColor: "rgba(251,191,36,0.25)" }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
            <div className="flex-1">
              <p className="text-sm font-extrabold" style={{ color: "#fbbf24" }}>Pas de suivi depuis {daysSinceLast} jours</p>
              <p className="text-xs mb-2" style={{ color: DS.body }}>Envoyer un rappel à {p.firstName} ?</p>
              <button
                onClick={sendWhatsApp}
                className="text-xs font-extrabold underline"
                style={{ color: GREEN }}
                data-testid="button-send-reminder"
              >
                Envoyer un rappel WhatsApp
              </button>
            </div>
          </div>
        </ProCard>
      )}

      {/* Comparison avant/après */}
      {lastScan && previousScan && (
        <ProCard className="p-5 mb-4">
          <p className="text-[11px] font-extrabold uppercase tracking-wider mb-3" style={{ color: DS.muted }}>
            Comparaison avant / après
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div
              className="text-center p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}` }}
            >
              <p className="text-[10px]" style={{ color: DS.muted }}>{new Date(previousScan.createdAt!).toLocaleDateString("fr-FR")}</p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: INK }}>
                {previousScan.score}<span className="text-sm" style={{ color: DS.muted }}>/100</span>
              </p>
              <p className="text-[10px] truncate mt-1" style={{ color: DS.body }}>{previousScan.condition}</p>
            </div>
            <div
              className="text-center p-3 rounded-xl"
              style={{
                background: (evolution || 0) >= 0 ? "rgba(16,185,129,0.1)" : "rgba(251,191,36,0.1)",
                border: `1px solid ${(evolution || 0) >= 0 ? "rgba(16,185,129,0.25)" : "rgba(251,191,36,0.25)"}`,
              }}
            >
              <p className="text-[10px] font-extrabold" style={{ color: (evolution || 0) >= 0 ? "#6ee7b7" : "#fbbf24" }}>
                {new Date(lastScan.createdAt!).toLocaleDateString("fr-FR")}
              </p>
              <p className="text-2xl font-extrabold mt-1" style={{ color: (evolution || 0) >= 0 ? "#6ee7b7" : "#fbbf24" }}>
                {lastScan.score}<span className="text-sm opacity-70">/100</span>
              </p>
              <p className="text-[10px] truncate mt-1" style={{ color: DS.body }}>{lastScan.condition}</p>
            </div>
          </div>
          <p className="text-xs text-center mt-3" style={{ color: DS.body }}>
            Évolution :{" "}
            <span className="font-extrabold" style={{ color: (evolution || 0) >= 0 ? GREEN : "#fbbf24" }}>
              {(evolution || 0) >= 0 ? "+" : ""}
              {evolution} pts
            </span>
          </p>
        </ProCard>
      )}

      {/* Timeline */}
      <p className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1" style={{ color: DS.muted }}>
        Historique ({scans.length})
      </p>

      {scans.length === 0 ? (
        <ProCard className="p-8 text-center">
          <p className="text-sm mb-3" style={{ color: DS.body }}>Aucune analyse encore</p>
          <Link
            href={`/pro/analyse?patient=${p.id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-extrabold active:scale-[0.97] transition-all"
            style={{ background: NAVY }}
            data-testid="link-first-scan"
          >
            <ScanLine className="w-4 h-4" />
            Lancer la 1ère analyse
          </Link>
        </ProCard>
      ) : (
        <div className="space-y-3">
          {scans.map((s) => (
            <ProCard key={s.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-extrabold" style={{ color: INK }} data-testid={`text-condition-${s.id}`}>
                    {s.condition || "Diagnostic en attente"}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: DS.muted }}>
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                      : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-2xl font-extrabold" style={{ color: NAVY }}>{s.score}</p>
                  <p className="text-[9px] uppercase font-extrabold tracking-wider" style={{ color: DS.muted }}>Glow</p>
                </div>
              </div>

              {s.imageUrl && (
                <img
                  src={s.imageUrl}
                  alt=""
                  className="w-full h-44 object-cover rounded-xl mb-3"
                  style={{ border: `1px solid ${DS.border}` }}
                />
              )}

              {s.analysis && (
                <p className="text-xs leading-relaxed mb-2" style={{ color: DS.body }}>{s.analysis}</p>
              )}

              {s.dermatoNote && (
                <p
                  className="text-xs rounded-xl p-2.5 mb-2"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${DS.border}`, color: INK }}
                >
                  <strong style={{ color: DS.body }}>Note :</strong> {s.dermatoNote}
                </p>
              )}

              {(() => {
                const ctx = (s.clinicalContext as any) || {};
                const answers = ctx.questionnaire as Record<string, string> | undefined;
                const items = ctx.questionnaireItems as { id: string; label: string; axis: string }[] | undefined;
                if (!answers || !items || items.length === 0) return null;
                return (
                  <details
                    className="mb-2 rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${DS.border}` }}
                    data-testid={`questionnaire-${s.id}`}
                  >
                    <summary
                      className="cursor-pointer text-[11px] font-extrabold px-3 py-2 transition-colors"
                      style={{ color: DS.body, background: "rgba(255,255,255,0.03)" }}
                    >
                      Anamnèse ({Object.keys(answers).length} réponses)
                    </summary>
                    <div className="p-3 pt-0 space-y-1.5" style={{ background: "rgba(255,255,255,0.02)" }}>
                      {items.map((q) => {
                        const a = answers[q.id];
                        if (!a) return null;
                        const colorMap: any = {
                          oui: { bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.25)", text: "#6ee7b7", label: "Oui" },
                          non: { bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)", text: "#f87171", label: "Non" },
                          nsp: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: DS.muted, label: "NSP" },
                        };
                        const c = colorMap[a] || colorMap.nsp;
                        return (
                          <div key={q.id} className="flex items-start gap-2 text-[11px] pt-1.5">
                            <span
                              className="px-1.5 py-0.5 rounded font-extrabold flex-shrink-0"
                              style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.text }}
                            >
                              {c.label}
                            </span>
                            <span style={{ color: DS.body }}>{q.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                );
              })()}

              {(() => {
                const fr = (s.recommendations as any)?._fullResult || {};
                const zones = fr.analyse_zones as Record<string, string> | undefined;
                const justif = fr.justification_score as string | undefined;
                const conseil = fr.conseil_expert as string | undefined;
                if (!zones && !justif && !conseil) return null;
                return (
                  <details
                    className="mb-2 rounded-xl overflow-hidden"
                    style={{ border: `1px solid ${DS.border}` }}
                    data-testid={`technical-${s.id}`}
                  >
                    <summary
                      className="cursor-pointer text-[11px] font-extrabold px-3 py-2"
                      style={{ color: DS.body, background: "rgba(255,255,255,0.03)" }}
                    >
                      Analyse technique par zone
                    </summary>
                    <div className="p-3 pt-0 space-y-2" style={{ background: "rgba(255,255,255,0.02)" }}>
                      {zones && Object.entries(zones).map(([zone, desc]) => (
                        <div key={zone} className="text-[11px]">
                          <span className="font-extrabold uppercase tracking-wider" style={{ color: DS.muted }}>{zone}</span>
                          <p className="leading-snug" style={{ color: DS.body }}>{desc}</p>
                        </div>
                      ))}
                      {justif && (
                        <div className="text-[11px] pt-2" style={{ borderTop: `1px solid ${DS.border}` }}>
                          <span className="font-extrabold uppercase tracking-wider" style={{ color: DS.muted }}>Justification du score</span>
                          <p className="leading-snug" style={{ color: DS.body }}>{justif}</p>
                        </div>
                      )}
                      {conseil && (
                        <div
                          className="text-[11px] rounded-lg p-2"
                          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}
                        >
                          <span className="font-extrabold uppercase tracking-wider" style={{ color: "#fbbf24" }}>Conseil expert</span>
                          <p className="leading-snug mt-0.5" style={{ color: DS.body }}>{conseil}</p>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })()}

              {s.isVerified && (
                <div
                  className="inline-flex items-center gap-1.5 text-[10px] font-extrabold mt-2 px-2 py-1 rounded-full"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", color: "#6ee7b7" }}
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Validé pour le dataset GlowScan {s.expertReviewer ? `· ${s.expertReviewer}` : ""}
                </div>
              )}

              {!s.isVerified && validatingId !== s.id && (
                <button
                  onClick={() => {
                    setValidatingId(s.id);
                    setValidateCorrection(s.condition || "");
                  }}
                  data-testid={`button-validate-${s.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold hover:underline"
                  style={{ color: NAVY }}
                >
                  <Sparkles className="w-3 h-3" />
                  Valider pour le dataset
                </button>
              )}

              {validatingId === s.id && (
                <div className="mt-3 space-y-2 pt-3" style={{ borderTop: `1px solid ${DS.border}` }}>
                  <ProInput
                    value={validateCorrection}
                    onChange={(e) => setValidateCorrection(e.target.value)}
                    placeholder="Diagnostic corrigé (si nécessaire)"
                    testid={`input-correction-${s.id}`}
                  />
                  <textarea
                    value={validateNote}
                    onChange={(e) => setValidateNote(e.target.value)}
                    placeholder="Note dermato (optionnel)"
                    data-testid={`input-note-${s.id}`}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl text-xs outline-none resize-none"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(167,139,250,0.2)",
                      color: INK,
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleValidate(s.id, true)}
                      disabled={validate.isPending}
                      data-testid={`button-confirm-validate-${s.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-full text-white text-xs font-extrabold disabled:opacity-50 active:scale-[0.97] transition-all"
                      style={{ background: GREEN }}
                    >
                      {validate.isPending ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Valider
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleValidate(s.id, false)}
                      disabled={validate.isPending}
                      data-testid={`button-reject-${s.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-full text-xs font-extrabold active:scale-[0.97] transition-all"
                      style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}
                    >
                      <XCircle className="w-3 h-3" />
                      Rejeter
                    </button>
                    <button
                      onClick={() => setValidatingId(null)}
                      className="px-3 py-2 rounded-full text-xs font-extrabold"
                      style={{ background: "rgba(255,255,255,0.06)", color: DS.muted }}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </ProCard>
          ))}
        </div>
      )}
    </ProLayout>
  );
}
