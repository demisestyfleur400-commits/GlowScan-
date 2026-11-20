import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Check, ChevronDown, ChevronUp } from "lucide-react";
import { D } from "./tokens";
import { api } from "./ui";

// ════════════════════════════════════════════════════════════════════════
// File d'envoi en un clic : chaque jour, les rappels à envoyer aux patients
// (rendez-vous de demain, contrôles du jour ou en retard), messages déjà rédigés.
// Un clic ouvre WhatsApp avec le texte prêt ; le rappel est alors noté comme envoyé.
// Vide : on le dit, sans carte qui charge à l'infini.
// ════════════════════════════════════════════════════════════════════════

type Item = { kind: "rdv" | "suivi"; id: number; name: string; label: string; message: string; waLink: string };

export function RemindersQueue() {
  const qc = useQueryClient();
  const { data, isError, isLoading, refetch } = useQuery<{ items: Item[] }>({ queryKey: ["/api/derm/reminders-queue"], retry: 1 });
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);
  const items = data?.items || [];
  const left = items.filter((i) => !done[`${i.kind}-${i.id}`]).length;

  const send = async (i: Item) => {
    window.open(i.waLink, "_blank", "noopener");
    setDone((d) => ({ ...d, [`${i.kind}-${i.id}`]: true }));
    try { await api("/api/derm/reminders-queue/done", "POST", { kind: i.kind, id: i.id }); } catch { /* reste affiché comme envoyé ; il réapparaîtra demain si l'enregistrement a échoué */ }
    qc.invalidateQueries({ queryKey: ["/api/derm/followups"] });
  };

  return (
    <section data-testid="reminders-queue" style={{ background: "#fff", border: `1px solid ${D.border}`, borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
      <div className="flex flex-wrap items-center justify-between" style={{ gap: 8 }}>
        <div>
          <b style={{ fontSize: 14, fontWeight: 600, color: D.text }}>Rappels à envoyer aujourd'hui{items.length ? ` · ${left} restant${left > 1 ? "s" : ""}` : ""}</b>
          <div style={{ fontSize: 12, color: D.muted, marginTop: 2 }}>Message déjà rédigé : un clic ouvre WhatsApp, il ne reste qu'à appuyer sur Envoyer.</div>
        </div>
      </div>

      {isLoading ? <div style={{ fontSize: 12.5, color: D.muted, marginTop: 10 }}>Préparation des rappels…</div>
        : isError ? <div style={{ fontSize: 12.5, color: D.muted, marginTop: 10 }}>Les rappels n'ont pas pu être chargés. <button type="button" onClick={() => refetch()} style={{ border: 0, background: "none", color: D.cta, fontWeight: 700, cursor: "pointer" }}>Réessayer</button></div>
        : items.length === 0 ? <div style={{ fontSize: 12.5, color: D.muted, marginTop: 10 }}>Aucun rappel à envoyer pour l'instant : pas de rendez-vous demain à confirmer ni de contrôle en retard.</div>
        : (
          <div className="flex flex-col" style={{ marginTop: 10 }}>
            {items.map((i) => {
              const k = `${i.kind}-${i.id}`, sent = done[k];
              return (
                <div key={k} style={{ borderTop: `1px solid ${D.sep}`, padding: "10px 0" }}>
                  <div className="flex flex-wrap items-center" style={{ gap: 10 }}>
                    <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                      <b style={{ fontSize: 13, fontWeight: 600, color: D.text }}>{i.name}</b>
                      <div style={{ fontSize: 11.5, color: i.kind === "suivi" && i.label.includes("retard") ? "#9b3a28" : D.muted }}>{i.label}</div>
                    </div>
                    <button type="button" onClick={() => setOpen(open === k ? null : k)} aria-expanded={open === k}
                      style={{ border: 0, background: "none", color: D.muted, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 3 }}>
                      Voir le message {open === k ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {sent ? (
                      <span className="inline-flex items-center" style={{ gap: 5, fontSize: 12.5, fontWeight: 700, color: "#2a6b4f", padding: "8px 12px" }}><Check size={15} /> Envoyé</span>
                    ) : (
                      <button type="button" onClick={() => send(i)} data-testid={`reminder-send-${k}`}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 9, border: 0, background: "#25D366", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                        <MessageCircle size={15} /> Ouvrir WhatsApp
                      </button>
                    )}
                  </div>
                  {open === k && <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 12, color: "#33504a", background: "#f6f8f6", borderRadius: 8, padding: 10, margin: "8px 0 0" }}>{i.message}</pre>}
                </div>
              );
            })}
          </div>
        )}
    </section>
  );
}
