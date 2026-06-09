/**
 * PDFViewerModal — viewer fullscreen avec 3 actions :
 *   ✏️ Modifier  |  📤 Envoyer WhatsApp  |  ⬇️ Télécharger
 *
 * Utilise des marqueurs data-edit="key" dans le HTML source pour
 * identifier les zones éditables. L'édition se fait en panneau
 * latéral glissant; la sauvegarde réinjecte via regex dans le HTML.
 */
import { useState, useEffect, useCallback } from "react";
import html2pdf from "html2pdf.js";

// ── Types ──────────────────────────────────────────────────────────────────
export interface EditableFields {
  diagnostic: string;
  severite: string;
  observations: string;
  notes: string;
}

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  filename: string;
  patientFirstName: string;
  patientPhone?: string;
  dermatologue?: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function extractEditFields(html: string): EditableFields {
  const get = (key: string): string => {
    const m = html.match(
      new RegExp(`data-edit="${key}"[^>]*>([\\s\\S]*?)<\\/span>`)
    );
    if (!m) return "";
    // Strip inner tags, convert <br> → newline
    return m[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();
  };
  return {
    diagnostic: get("diagnostic"),
    severite: get("severite"),
    observations: get("observations"),
    notes: get("notes"),
  };
}

function applyEdits(html: string, edits: EditableFields): string {
  let result = html;
  (["diagnostic", "severite", "observations", "notes"] as const).forEach((key) => {
    const val = edits[key].replace(/\n/g, "<br>");
    result = result.replace(
      new RegExp(`(<span\\s[^>]*data-edit="${key}"[^>]*>)[\\s\\S]*?(<\\/span>)`),
      `$1${val}$2`
    );
  });
  return result;
}

// ── Sub-components ─────────────────────────────────────────────────────────
function ActionBtn({
  onClick,
  label,
  icon,
  style,
  disabled,
}: {
  onClick: () => void;
  label: string;
  icon: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "7px 11px",
        borderRadius: 10,
        fontSize: 12,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0,
        opacity: disabled ? 0.55 : 1,
        whiteSpace: "nowrap",
        transition: "opacity 0.15s",
        ...style,
      }}
    >
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function EditField({
  label,
  value,
  onChange,
  multiline,
  rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  const base: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    borderRadius: 8,
    border: "1.5px solid #e5e7eb",
    fontSize: 13,
    color: "#111827",
    background: "#f9fafb",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: 1.55,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#9ca3af",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows ?? 3}
          style={{ ...base, resize: "vertical" }}
          onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
          onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={base}
          onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
          onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
        />
      )}
    </div>
  );
}

// ── Component principal ────────────────────────────────────────────────────
export default function PDFViewerModal({
  isOpen,
  onClose,
  htmlContent,
  filename,
  patientFirstName,
  patientPhone,
  dermatologue,
}: PDFViewerModalProps) {
  const [currentHtml, setCurrentHtml] = useState(htmlContent);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [editFields, setEditFields] = useState<EditableFields>({
    diagnostic: "",
    severite: "",
    observations: "",
    notes: "",
  });
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "ok" | "fallback">("idle");
  const [phoneInput, setPhoneInput] = useState("");
  const [showPhoneInput, setShowPhoneInput] = useState(false);

  // Sync HTML quand le parent change le contenu
  useEffect(() => {
    if (isOpen) {
      setCurrentHtml(htmlContent);
      setMode("view");
    }
  }, [htmlContent, isOpen]);

  // Générer blob URL pour l'iframe
  useEffect(() => {
    if (!isOpen || !currentHtml) return;
    const blob = new Blob([currentHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [currentHtml, isOpen]);

  // Réinitialiser au close
  useEffect(() => {
    if (!isOpen) {
      setMode("view");
      setShowPhoneInput(false);
      setUploadStatus("idle");
    }
  }, [isOpen]);

  const enterEditMode = () => {
    setEditFields(extractEditFields(currentHtml));
    setMode("edit");
  };

  const handleSaveEdits = () => {
    const updated = applyEdits(currentHtml, editFields);
    setCurrentHtml(updated);
    setMode("view");
  };

  const handleDownload = useCallback(() => {
    const el = document.createElement("div");
    el.innerHTML = currentHtml;
    html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .from(el)
      .save();
  }, [currentHtml, filename]);

  const sendWhatsAppWithLink = (phone: string, pdfUrl: string) => {
    const msg = encodeURIComponent(
      `Bonjour ${patientFirstName || "cher(e) patient(e)"},\n\n` +
        `Voici votre rapport de consultation dermatologique GlowScan` +
        (dermatologue ? ` établi par ${dermatologue}` : "") +
        `.\n\n📄 Télécharger votre rapport PDF :\n${pdfUrl}\n\n` +
        `— Cabinet GlowScan DERM`
    );
    const cleaned = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  const sendWhatsAppFallback = (phone: string) => {
    const msg = encodeURIComponent(
      `Bonjour ${patientFirstName || "cher(e) patient(e)"},\n\n` +
        `Votre rapport de consultation GlowScan est prêt.` +
        (dermatologue ? ` Établi par ${dermatologue}.` : "") +
        `\nContactez votre cabinet pour le recevoir.\n\n— GlowScan DERM`
    );
    const cleaned = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  const handleSendWhatsApp = useCallback(async () => {
    const phone = patientPhone || phoneInput;
    if (!phone) {
      setShowPhoneInput(true);
      return;
    }
    setUploading(true);
    setUploadStatus("idle");
    try {
      const el = document.createElement("div");
      el.innerHTML = currentHtml;
      const pdfBlob = await html2pdf()
        .set({
          margin: 0,
          filename,
          image: { type: "jpeg", quality: 0.82 },
          html2canvas: { scale: 1.5, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(el)
        .output("blob");

      const base64 = await blobToBase64(pdfBlob);
      const res = await fetch("/api/pro/pdf-upload", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64: base64, filename }),
      });

      if (res.ok) {
        const { url } = await res.json();
        const fullUrl = `${window.location.origin}${url}`;
        setUploadStatus("ok");
        sendWhatsAppWithLink(phone, fullUrl);
      } else {
        setUploadStatus("fallback");
        sendWhatsAppFallback(phone);
      }
    } catch {
      setUploadStatus("fallback");
      sendWhatsAppFallback(patientPhone || phoneInput);
    } finally {
      setUploading(false);
    }
  }, [currentHtml, filename, patientFirstName, patientPhone, phoneInput, dermatologue]);

  if (!isOpen) return null;

  const FF =
    '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#e5e7eb",
        display: "flex",
        flexDirection: "column",
        fontFamily: FF,
      }}
    >
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <div
        style={{
          height: 56,
          background: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "0 12px",
          flexShrink: 0,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Fermer"
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            border: "none",
            background: "rgba(0,0,0,0.06)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            color: "#374151",
            flexShrink: 0,
          }}
        >
          ✕
        </button>

        {/* Titre */}
        <div style={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#111827",
              margin: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {mode === "edit" ? "✏️ Modifier le rapport" : "📄 Rapport clinique"}
          </p>
          {patientFirstName && (
            <p style={{ fontSize: 10, color: "#9ca3af", margin: 0 }}>
              {patientFirstName}
              {dermatologue ? ` · ${dermatologue}` : ""}
            </p>
          )}
        </div>

        {/* Actions — mode VIEW */}
        {mode === "view" && (
          <>
            <ActionBtn
              onClick={enterEditMode}
              icon="✏️"
              label="Modifier"
              style={{
                border: "1.5px solid #7c3aed",
                color: "#7c3aed",
                background: "#fff",
              }}
            />
            <ActionBtn
              onClick={handleSendWhatsApp}
              icon={uploading ? "⏳" : "📤"}
              label={uploading ? "…" : "Envoyer"}
              disabled={uploading}
              style={{ background: "#25d366", color: "#fff", border: "none" }}
            />
            <ActionBtn
              onClick={handleDownload}
              icon="⬇️"
              label="Télécharger"
              style={{
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #e5e7eb",
              }}
            />
          </>
        )}

        {/* Actions — mode EDIT */}
        {mode === "edit" && (
          <>
            <button
              onClick={() => setMode("view")}
              style={{
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#fff",
                color: "#6b7280",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleSaveEdits}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                border: "none",
                background: "#7c3aed",
                color: "#fff",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Sauvegarder
            </button>
          </>
        )}
      </div>

      {/* ── Barre saisie téléphone (si manquant) ─────────────────────── */}
      {showPhoneInput && (
        <div
          style={{
            background: "#fefce8",
            borderBottom: "1px solid #fef08a",
            padding: "10px 16px",
            display: "flex",
            gap: 8,
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: 12, color: "#92400e", flexShrink: 0 }}>
            📱 Numéro WhatsApp du patient :
          </span>
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder="237 6XX XXX XXX"
            style={{
              flex: 1,
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #d97706",
              fontSize: 13,
              outline: "none",
              minWidth: 0,
            }}
          />
          <button
            onClick={handleSendWhatsApp}
            disabled={!phoneInput || uploading}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              background: "#25d366",
              color: "#fff",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
              opacity: !phoneInput || uploading ? 0.5 : 1,
            }}
          >
            {uploading ? "..." : "Envoyer"}
          </button>
          <button
            onClick={() => setShowPhoneInput(false)}
            style={{
              padding: "4px 8px",
              borderRadius: 6,
              border: "none",
              background: "transparent",
              color: "#9ca3af",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Status bar (upload OK / fallback) ──────────────────────────── */}
      {uploadStatus !== "idle" && (
        <div
          style={{
            padding: "8px 16px",
            background: uploadStatus === "ok" ? "#f0fdf4" : "#fffbeb",
            borderBottom: `1px solid ${uploadStatus === "ok" ? "#bbf7d0" : "#fde68a"}`,
            fontSize: 12,
            color: uploadStatus === "ok" ? "#166534" : "#92400e",
            flexShrink: 0,
          }}
        >
          {uploadStatus === "ok"
            ? "✅ PDF envoyé — WhatsApp ouvert avec le lien"
            : "⚠️ Lien non disponible — message de confirmation envoyé sans PDF"}
        </div>
      )}

      {/* ── Zone principale ───────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {/* Iframe PDF (toujours monté) */}
        {blobUrl && (
          <iframe
            src={blobUrl}
            title="Rapport clinique GlowScan"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              border: "none",
              filter: mode === "edit" ? "blur(3px) brightness(0.55)" : "none",
              transition: "filter 0.25s ease",
              pointerEvents: mode === "edit" ? "none" : "auto",
            }}
          />
        )}

        {/* Panneau éditeur (glisse depuis la droite) */}
        {mode === "edit" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(100%, 480px)",
              background: "#fff",
              boxShadow: "-6px 0 24px rgba(0,0,0,0.18)",
              overflowY: "auto",
              padding: "20px 20px 32px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {/* Header panneau */}
            <div>
              <p
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  color: "#111827",
                  margin: "0 0 4px",
                }}
              >
                Modifier le rapport
              </p>
              <p style={{ fontSize: 11, color: "#9ca3af", margin: 0 }}>
                Les modifications seront intégrées au PDF et à l'envoi WhatsApp
              </p>
            </div>

            <EditField
              label="Diagnostic principal"
              value={editFields.diagnostic}
              onChange={(v) => setEditFields((f) => ({ ...f, diagnostic: v }))}
            />
            <EditField
              label="Sévérité"
              value={editFields.severite}
              onChange={(v) => setEditFields((f) => ({ ...f, severite: v }))}
            />
            <EditField
              label="Observations cliniques"
              value={editFields.observations}
              onChange={(v) =>
                setEditFields((f) => ({ ...f, observations: v }))
              }
              multiline
              rows={5}
            />
            <EditField
              label="Notes du praticien"
              value={editFields.notes}
              onChange={(v) => setEditFields((f) => ({ ...f, notes: v }))}
              multiline
              rows={4}
            />

            <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
              <button
                onClick={() => setMode("view")}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#6b7280",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSaveEdits}
                style={{
                  flex: 2,
                  padding: "12px 0",
                  borderRadius: 10,
                  border: "none",
                  background: "#7c3aed",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                ✓ Sauvegarder les modifications
              </button>
            </div>

            <p style={{ fontSize: 10, color: "#d1d5db", textAlign: "center" }}>
              Le rapport original n'est pas modifié en base · Exportez pour archiver
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
