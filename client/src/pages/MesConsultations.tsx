import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { MessageCircle, Sparkles, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ConsultationChat } from "@/components/ConsultationChat";

// ════════════════════════════════════════════════════════════════════════
// Messages (refonte Organic) — maquette « GlowScan App » › Messages.
// Médecins et Assistant GlowScan au même endroit ; compte rendu PDF et note
// de 1 à 5 étoiles pour les consultations terminées.
// ════════════════════════════════════════════════════════════════════════

interface Consult {
  id: number; condition?: string; status?: string; paymentStatus?: string; unreadPatient?: number;
  createdAt?: string; rating?: number | null; reportStatus?: string | null; doctorName?: string | null;
}

const drName = (n?: string | null) => (!n ? "Dermatologue" : /^(dr|pr)\.?\s/i.test(n) ? n : `Dr ${n}`);

function statusLabel(c: Consult) {
  if (c.status === "refund_due") return "Pas de réponse sous 24 h : remboursement en cours";
  if (c.status === "refunded") return "Remboursée";
  if (c.paymentStatus !== "paid") return "Paiement en cours de vérification";
  if (c.status === "closed") return "Consultation terminée";
  if (c.status === "answered") return "Le médecin a répondu";
  return "En attente de la réponse du médecin";
}

export default function MesConsultations() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [list, setList] = useState<Consult[]>([]);
  // ?open=<id> (Accueil, Réserver) ouvre directement la conversation.
  const [openId, setOpenId] = useState<number | null>(() => {
    const v = Number(new URLSearchParams(window.location.search).get("open"));
    return Number.isFinite(v) && v > 0 ? v : null;
  });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/consultations/mine", { credentials: "include" })
      .then((r) => r.json()).then((d) => setList(d.consultations || []))
      .catch(() => setList([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!authLoading && !user) setLocation("/auth"); }, [authLoading, user, setLocation]);

  // Recharge la liste au retour sur la page.
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, []);

  const rate = async (id: number, stars: number) => {
    try {
      await fetch(`/api/consultations/${id}/rate`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: stars }),
      });
      load();
    } catch { /* la note pourra être redonnée */ }
  };

  if (openId) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 50 }}>
        <ConsultationChat key={openId} consultationId={openId} myUserId={user?.id || null}
          onBack={() => { setOpenId(null); window.history.replaceState(null, "", "/consultations"); load(); }} />
      </div>
    );
  }

  const openable = (c: Consult) => c.paymentStatus === "paid" && c.status !== "refund_due" && c.status !== "refunded";

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <h1 className="m-0 text-[28px]">Messages</h1>

        <button type="button" onClick={() => setLocation("/chat")} className="flex items-center gap-3 rounded-lg border-0 bg-organic-surface px-4 py-3.5 text-left text-organic-text">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-pill bg-organic-neutral-900 text-organic-neutral-100"><Sparkles size={19} strokeWidth={1.75} /></span>
          <span className="flex flex-1 flex-col">
            <span className="text-[14px] font-bold">Assistant GlowScan</span>
            <span className="text-[12px] text-organic-neutral-700">Vos questions sur votre peau et votre routine</span>
          </span>
        </button>

        {loading && <span className="text-[13px] text-organic-neutral-700">Chargement…</span>}
        {!loading && list.length === 0 && (
          <div className="rounded-lg bg-organic-surface p-4 text-[13px]">Aucune consultation pour le moment.</div>
        )}

        {list.map((c) => (
          <div key={c.id} className="flex flex-col overflow-hidden rounded-lg bg-organic-surface">
            <button type="button" onClick={() => openable(c) && setOpenId(c.id)} disabled={!openable(c)}
              className="flex items-center gap-3 border-0 bg-transparent px-4 py-3.5 text-left text-organic-text disabled:cursor-default">
              <span className="flex h-10 w-10 flex-none items-center justify-center rounded-pill bg-organic-accent-2-500 text-organic-bg"><MessageCircle size={19} strokeWidth={1.75} /></span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-bold">{drName(c.doctorName)}{c.condition ? ` · ${c.condition.split("(")[0].trim()}` : ""}</span>
                <span className="text-[12px] text-organic-neutral-700">{statusLabel(c)}</span>
              </span>
              {(c.unreadPatient || 0) > 0 && openable(c) && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-organic-accent px-1.5 text-[11px] font-bold text-organic-neutral-100">{c.unreadPatient}</span>
              )}
            </button>
            {c.status === "closed" && (
              <div className="flex flex-col gap-2 border-t border-organic-divider px-4 py-3">
                <a href={`/api/consultations/${c.id}/report/download`} target="_blank" rel="noopener noreferrer"
                  className="self-start rounded-pill bg-organic-accent px-3.5 py-1.5 text-[13px] font-bold text-organic-neutral-100 no-underline">
                  Compte rendu signé (PDF)
                </a>
                {c.rating ? (
                  <span className="flex items-center gap-1 text-[12px] text-organic-neutral-700">Merci pour votre note :
                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={14} strokeWidth={1.75} fill={s <= c.rating! ? "var(--color-accent-400)" : "none"} className="text-organic-accent-400" />)}
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-[12px] font-bold">Notez votre consultation
                    <span className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button key={s} type="button" onClick={() => rate(c.id, s)} aria-label={`${s} étoile${s > 1 ? "s" : ""}`} className="border-0 bg-transparent p-0.5 text-organic-neutral-400 hover:text-organic-accent-400">
                          <Star size={20} strokeWidth={1.75} />
                        </button>
                      ))}
                    </span>
                  </span>
                )}
              </div>
            )}
          </div>
        ))}

        <button type="button" onClick={() => setLocation("/dermatologues")} className="rounded-pill border border-organic-divider bg-transparent p-3 text-[14px] font-bold">
          Consulter un dermatologue
        </button>
      </main>
    </div>
  );
}
