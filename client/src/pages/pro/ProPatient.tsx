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
          className="p-2 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      }
    >
      {/* Patient header */}
      <ProCard className="p-5 mb-4">
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0"
            style={{ background: NAVY }}
          >
            {p.firstName[0]}
            {p.lastName[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold" style={{ color: INK }} data-testid="text-patient-name">
              {p.firstName} {p.lastName}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
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
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white text-xs font-semibold transition-all hover:shadow-md"
            style={{ background: NAVY }}
          >
            <ScanLine className="w-3.5 h-3.5" />
            Nouvelle analyse
          </Link>
          <button
            onClick={sendWhatsApp}
            data-testid="button-whatsapp"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-white text-xs font-semibold transition-all hover:shadow-md"
            style={{ background: GREEN }}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={exportPdf}
            data-testid="button-pdf"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      </ProCard>

      {/* Reminder 30j */}
      {showReminder && (
        <ProCard className="p-4 mb-4 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Pas de suivi depuis {daysSinceLast} jours</p>
              <p className="text-xs text-amber-700 mb-2">Envoyer un rappel à {p.firstName} ?</p>
              <button onClick={sendWhatsApp} className="text-xs font-semibold underline" style={{ color: GREEN }} data-testid="button-send-reminder">
                Envoyer un rappel WhatsApp
              </button>
            </div>
          </div>
        </ProCard>
      )}

      {/* Comparison avant/après */}
      {lastScan && previousScan && (
        <ProCard className="p-5 mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Comparaison avant / après
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-lg bg-slate-50">
              <p className="text-[10px] text-slate-500">{new Date(previousScan.createdAt!).toLocaleDateString("fr-FR")}</p>
              <p className="text-2xl font-bold text-slate-700 mt-1">{previousScan.score}<span className="text-sm text-slate-400">/100</span></p>
              <p className="text-[10px] text-slate-500 truncate mt-1">{previousScan.condition}</p>
            </div>
            <div className="text-center p-3 rounded-lg" style={{ background: (evolution || 0) >= 0 ? "#ECFDF5" : "#FEF3C7" }}>
              <p className="text-[10px] font-semibold" style={{ color: (evolution || 0) >= 0 ? GREEN : "#B45309" }}>
                {new Date(lastScan.createdAt!).toLocaleDateString("fr-FR")}
              </p>
              <p className="text-2xl font-bold mt-1" style={{ color: (evolution || 0) >= 0 ? GREEN : "#B45309" }}>
                {lastScan.score}<span className="text-sm opacity-70">/100</span>
              </p>
              <p className="text-[10px] text-slate-600 truncate mt-1">{lastScan.condition}</p>
            </div>
          </div>
          <p className="text-xs text-center mt-3 text-slate-600">
            Évolution :{" "}
            <span className="font-bold" style={{ color: (evolution || 0) >= 0 ? GREEN : "#B45309" }}>
              {(evolution || 0) >= 0 ? "+" : ""}
              {evolution} pts
            </span>
          </p>
        </ProCard>
      )}

      {/* Timeline */}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 px-1">
        Historique ({scans.length})
      </p>

      {scans.length === 0 ? (
        <ProCard className="p-8 text-center">
          <p className="text-slate-500 text-sm mb-3">Aucune analyse encore</p>
          <Link
            href={`/pro/analyse?patient=${p.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
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
                  <p className="text-sm font-bold" style={{ color: INK }} data-testid={`text-condition-${s.id}`}>
                    {s.condition || "Diagnostic en attente"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {s.createdAt
                      ? new Date(s.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                      : ""}
                  </p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-2xl font-bold" style={{ color: NAVY }}>{s.score}</p>
                  <p className="text-[9px] uppercase text-slate-400 font-semibold tracking-wider">Glow</p>
                </div>
              </div>

              {s.imageUrl && (
                <img src={s.imageUrl} alt="" className="w-full h-44 object-cover rounded-lg mb-3 border border-slate-200" />
              )}

              {s.analysis && <p className="text-xs text-slate-600 leading-relaxed mb-2">{s.analysis}</p>}

              {s.dermatoNote && (
                <p className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-2" style={{ color: INK }}>
                  <strong>Note :</strong> {s.dermatoNote}
                </p>
              )}

              {(() => {
                const ctx = (s.clinicalContext as any) || {};
                const answers = ctx.questionnaire as Record<string, string> | undefined;
                const items = ctx.questionnaireItems as { id: string; label: string; axis: string }[] | undefined;
                if (!answers || !items || items.length === 0) return null;
                return (
                  <details className="mb-2 rounded-lg border border-slate-200 bg-white" data-testid={`questionnaire-${s.id}`}>
                    <summary className="cursor-pointer text-[11px] font-semibold text-slate-700 px-3 py-2 hover:bg-slate-50">
                      Anamnèse ({Object.keys(answers).length} réponses)
                    </summary>
                    <div className="p-3 pt-0 space-y-1.5">
                      {items.map((q) => {
                        const a = answers[q.id];
                        if (!a) return null;
                        const colorMap: any = {
                          oui: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Oui" },
                          non: { bg: "bg-red-50", text: "text-red-700", label: "Non" },
                          nsp: { bg: "bg-slate-100", text: "text-slate-600", label: "NSP" },
                        };
                        const c = colorMap[a] || colorMap.nsp;
                        return (
                          <div key={q.id} className="flex items-start gap-2 text-[11px]">
                            <span className={`px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${c.bg} ${c.text}`}>
                              {c.label}
                            </span>
                            <span className="text-slate-600">{q.label}</span>
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
                  <details className="mb-2 rounded-lg border border-slate-200 bg-white" data-testid={`technical-${s.id}`}>
                    <summary className="cursor-pointer text-[11px] font-semibold text-slate-700 px-3 py-2 hover:bg-slate-50">
                      Analyse technique par zone
                    </summary>
                    <div className="p-3 pt-0 space-y-2">
                      {zones && Object.entries(zones).map(([zone, desc]) => (
                        <div key={zone} className="text-[11px]">
                          <span className="font-bold uppercase tracking-wider text-slate-500">{zone}</span>
                          <p className="text-slate-700 leading-snug">{desc}</p>
                        </div>
                      ))}
                      {justif && (
                        <div className="text-[11px] pt-2 border-t border-slate-100">
                          <span className="font-bold uppercase tracking-wider text-slate-500">Justification du score</span>
                          <p className="text-slate-700 leading-snug">{justif}</p>
                        </div>
                      )}
                      {conseil && (
                        <div className="text-[11px] bg-amber-50 border border-amber-200 rounded p-2">
                          <span className="font-bold uppercase tracking-wider text-amber-700">Conseil expert</span>
                          <p className="text-slate-800 leading-snug mt-0.5">{conseil}</p>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })()}

              {s.isVerified && (
                <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold mt-2 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200" style={{ color: GREEN }}>
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
                  className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold hover:underline"
                  style={{ color: NAVY }}
                >
                  <Sparkles className="w-3 h-3" />
                  Valider pour le dataset
                </button>
              )}

              {validatingId === s.id && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
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
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-xs outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleValidate(s.id, true)}
                      disabled={validate.isPending}
                      data-testid={`button-confirm-validate-${s.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-50"
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
                      className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50"
                    >
                      <XCircle className="w-3 h-3" />
                      Rejeter
                    </button>
                    <button
                      onClick={() => setValidatingId(null)}
                      className="px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-100 text-xs"
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
