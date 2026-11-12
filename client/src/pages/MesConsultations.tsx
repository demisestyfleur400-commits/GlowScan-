import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, FileText, MessageCircle, Sparkles, Star, Stethoscope } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ConsultationChat } from "@/components/ConsultationChat";
import { ensureDermFonts } from "@/components/derm/tokens";

// ════════════════════════════════════════════════════════════════════════
// Messages (style de la nouvelle maquette B2C). Médecins et Assistant GlowScan
// au même endroit ; compte rendu PDF et note de 1 à 5 étoiles pour les
// consultations terminées. ?open=<id> ouvre directement la conversation.
// ════════════════════════════════════════════════════════════════════════

interface Consult {
  id: number; condition?: string; status?: string; paymentStatus?: string; unreadPatient?: number;
  createdAt?: string; rating?: number | null; reportStatus?: string | null; doctorName?: string | null;
}

const G = { dark: "#164034", text: "#17392c", muted: "#5f6f69", line: "#e3e8e2", sage: "#e7eedc", soft: "#f1f5ec", peach: "#f7e8dc", peachFg: "#7a3f1d", lime: "#cfe08a" };
const drName = (n?: string | null) => (!n ? "Dermatologue" : /^(dr|pr)\.?\s/i.test(n) ? n : `Dr ${n}`);
const initials = (n?: string | null) => String(n || "").replace(/^(dr|pr)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "Dr";

function statusOf(c: Consult): { label: string; tone: "ok" | "wait" | "warn" | "muted" } {
  if (c.status === "refund_due") return { label: "Pas de réponse sous 24 h : remboursement en cours", tone: "warn" };
  if (c.status === "refunded") return { label: "Remboursée", tone: "muted" };
  if (c.paymentStatus !== "paid") return { label: "Paiement en cours de vérification", tone: "wait" };
  if (c.status === "closed") return { label: "Consultation terminée", tone: "muted" };
  if (c.status === "answered") return { label: "Le médecin a répondu", tone: "ok" };
  return { label: "En attente de la réponse du médecin", tone: "wait" };
}
const TONE = { ok: { bg: "#e7eedc", fg: "#164034" }, wait: { bg: "#f7e8dc", fg: "#7a3f1d" }, warn: { bg: "#f8e3dd", fg: "#9b3a28" }, muted: { bg: "#f1f5ec", fg: "#5f6f69" } };

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
  const [failed, setFailed] = useState(false);

  const load = () => {
    setLoading(true); setFailed(false);
    fetch("/api/consultations/mine", { credentials: "include" })
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then((d) => setList(d.consultations || []))
      .catch(() => { setList([]); setFailed(true); }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); ensureDermFonts(); }, []);
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
      <div className="b2c-theme" style={{ position: "fixed", inset: 0, zIndex: 50 }}>
        <ConsultationChat key={openId} consultationId={openId} myUserId={user?.id || null}
          onBack={() => { setOpenId(null); window.history.replaceState(null, "", "/consultations"); load(); }} />
      </div>
    );
  }

  const openable = (c: Consult) => c.paymentStatus === "paid" && c.status !== "refund_due" && c.status !== "refunded";

  return (
    <div className="b2c-theme min-h-screen bg-organic-bg font-body" style={{ color: G.text }}>
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[30px] leading-[1.12]">Messages</h1>
          <span className="text-[13.5px]" style={{ color: G.muted }}>Vos dermatologues et l'assistant GlowScan, au même endroit.</span>
        </div>

        <button type="button" onClick={() => setLocation("/chat")} className="flex items-center gap-3 rounded-[16px] border-0 px-4 py-3.5 text-left text-white" style={{ background: G.dark }}>
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px]" style={{ background: G.lime, color: G.dark }}><Sparkles size={19} strokeWidth={1.75} /></span>
          <span className="flex flex-1 flex-col">
            <b className="text-[15px] font-semibold">Assistant GlowScan</b>
            <span className="text-[12.5px] opacity-80">Vos questions sur votre peau et votre routine</span>
          </span>
          <ArrowRight size={17} />
        </button>

        <b className="mt-1 text-[16px] font-semibold">Vos consultations</b>

        {loading && <span className="text-[14px]" style={{ color: G.muted }}>Chargement de vos consultations…</span>}
        {!loading && failed && (
          <div className="flex flex-col items-start gap-2 rounded-[16px] border bg-white p-4 text-[14px]" style={{ borderColor: G.line, color: G.muted }}>
            Vos consultations n'ont pas pu être chargées. Vérifiez votre connexion.
            <button type="button" onClick={load} className="rounded-[10px] border-0 px-4 py-2 text-[14px] font-semibold text-white" style={{ background: G.dark }}>Réessayer</button>
          </div>
        )}
        {!loading && !failed && list.length === 0 && (
          <div className="flex flex-col items-start gap-2.5 rounded-[16px] p-4" style={{ background: G.sage }}>
            <b className="text-[15px] font-semibold">Pour l'instant, aucune consultation.</b>
            <span className="text-[14px] leading-relaxed" style={{ color: G.muted }}>Un dermatologue du réseau peut examiner vos photos et vous répondre par écrit.</span>
            <button type="button" onClick={() => setLocation("/dermatologues")} className="rounded-[10px] border-0 px-4 py-2.5 text-[14px] font-semibold text-white" style={{ background: G.dark }}>Demander un avis expert</button>
          </div>
        )}

        {list.map((c) => {
          const st = statusOf(c);
          const can = openable(c);
          const unread = (c.unreadPatient || 0) > 0 && can;
          return (
            <div key={c.id} className="flex flex-col overflow-hidden rounded-[16px] border bg-white" style={{ borderColor: unread ? G.dark : G.line }}>
              <button type="button" onClick={() => can && setOpenId(c.id)} disabled={!can}
                className="flex items-center gap-3 border-0 bg-transparent px-4 py-3.5 text-left disabled:cursor-default" style={{ color: G.text }}>
                <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] text-[13px] font-bold" style={{ background: G.sage, color: G.dark }}>{initials(c.doctorName)}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <b className="truncate text-[15px] font-semibold">{drName(c.doctorName)}{c.condition ? ` · ${c.condition.split("(")[0].trim()}` : ""}</b>
                  <span className="self-start rounded-pill px-2.5 py-[2px] text-[12px] font-semibold" style={{ background: TONE[st.tone].bg, color: TONE[st.tone].fg }}>{st.label}</span>
                </span>
                {unread
                  ? <span className="flex h-6 min-w-6 items-center justify-center rounded-pill px-1.5 text-[12px] font-bold text-white" style={{ background: G.dark }}>{c.unreadPatient}</span>
                  : can && <MessageCircle size={18} strokeWidth={1.7} style={{ color: G.muted }} />}
              </button>
              {c.status === "closed" && (
                <div className="flex flex-col gap-2.5 border-t px-4 py-3" style={{ borderColor: G.line }}>
                  <a href={`/api/consultations/${c.id}/report/download`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 self-start rounded-[10px] px-3.5 py-2 text-[13.5px] font-semibold text-white no-underline" style={{ background: G.dark }}>
                    <FileText size={15} strokeWidth={1.8} /> Compte rendu signé (PDF)
                  </a>
                  {c.rating ? (
                    <span className="flex items-center gap-1 text-[13px]" style={{ color: G.muted }}>Merci pour votre note :
                      {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={15} strokeWidth={1.75} fill={s <= c.rating! ? "#d9a441" : "none"} color="#d9a441" />)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-[13.5px] font-semibold">Notez votre consultation
                      <span className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button key={s} type="button" onClick={() => rate(c.id, s)} aria-label={`${s} étoile${s > 1 ? "s" : ""}`} className="border-0 bg-transparent p-0.5" style={{ color: "#c9d3cc" }}>
                            <Star size={21} strokeWidth={1.75} />
                          </button>
                        ))}
                      </span>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <button type="button" onClick={() => setLocation("/dermatologues")} className="flex items-center gap-3 rounded-[14px] p-3.5 text-left" style={{ background: G.sage, color: G.dark }}>
          <Stethoscope size={18} strokeWidth={1.7} />
          <b className="flex-1 text-[14.5px] font-semibold">Consulter un dermatologue</b>
          <ArrowRight size={17} />
        </button>
      </main>
    </div>
  );
}
