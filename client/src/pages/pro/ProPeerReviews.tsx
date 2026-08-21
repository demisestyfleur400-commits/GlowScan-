import { useState } from "react";
import { motion } from "framer-motion";
import { Users, MessageSquare, ShieldCheck, Send, Loader2, ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import { ProLayout, ProCard } from "@/components/ProLayout";
import { useToast } from "@/hooks/use-toast";
import {
  usePeerReviews, usePeerReview, useReplyPeerReview, useClosePeerReview,
  type PeerReview,
} from "@/hooks/use-pro";

const NAVY = "#7c3aed";
const BLUE = "#0369A1";
const INK = "#0F172A";
const DS = { body: "#475569", muted: "#64748B", border: "#E2E8F0", soft: "#F1F5F9" };

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: "En attente d'avis", color: "#b45309", bg: "rgba(217,119,6,0.1)" },
  answered: { label: "Avis reçu", color: "#047857", bg: "rgba(5,150,105,0.1)" },
  closed: { label: "Clôturé", color: "#64748B", bg: "#F1F5F9" },
};

export default function ProPeerReviews() {
  const [openId, setOpenId] = useState<number | null>(null);
  if (openId) return <PeerReviewDetail id={openId} onBack={() => setOpenId(null)} />;
  return <PeerReviewList onOpen={setOpenId} />;
}

function PeerReviewList({ onOpen }: { onOpen: (id: number) => void }) {
  const { data, isLoading } = usePeerReviews();
  const items = data?.items || [];
  const mine = items.filter((i) => i.mine);
  const network = items.filter((i) => !i.mine);

  return (
    <ProLayout title="Second avis confrères" back="/derm/dashboard">
      {/* Bandeau explicatif */}
      <div className="mb-4 p-4 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(3,105,161,0.08), rgba(124,58,237,0.05))", border: `1px solid ${DS.border}` }}>
        <div className="flex items-center gap-2 mb-1.5">
          <Users className="w-4 h-4" style={{ color: BLUE }} />
          <p className="text-sm font-extrabold" style={{ color: INK }}>Demandez l'avis d'un confrère</p>
        </div>
        <p className="text-xs" style={{ color: DS.body }}>
          Un cas difficile ? Partagez-le (photo + âge/sexe + question, <strong>sans aucun nom</strong>) avec un confrère du
          réseau GlowScan. Vous restez le médecin traitant — c'est juste un deuxième regard.
        </p>
        <div className="inline-flex items-center gap-1.5 mt-2 text-[11px] font-bold" style={{ color: "#047857" }}>
          <Lock className="w-3 h-3" /> Cas 100 % anonymisés
        </div>
      </div>

      <p className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1" style={{ color: DS.muted }}>
        Pour vous demander un avis (réseau) — {network.length}
      </p>
      {isLoading ? (
        <ProCard className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: NAVY }} /></ProCard>
      ) : network.length === 0 ? (
        <ProCard className="p-6 text-center mb-4">
          <p className="text-sm" style={{ color: DS.body }}>Aucun cas du réseau pour le moment.</p>
        </ProCard>
      ) : (
        <div className="space-y-2 mb-5">
          {network.map((r) => <ReviewRow key={r.id} r={r} onOpen={onOpen} />)}
        </div>
      )}

      <p className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1" style={{ color: DS.muted }}>
        Mes demandes — {mine.length}
      </p>
      {mine.length === 0 ? (
        <ProCard className="p-6 text-center">
          <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: DS.muted }} />
          <p className="text-sm" style={{ color: DS.body }}>
            Vous n'avez pas encore demandé d'avis. Depuis un dossier patient, bouton
            <strong style={{ color: INK }}> « Demander un 2ᵉ avis »</strong>.
          </p>
        </ProCard>
      ) : (
        <div className="space-y-2">
          {mine.map((r) => <ReviewRow key={r.id} r={r} onOpen={onOpen} />)}
        </div>
      )}
    </ProLayout>
  );
}

function ReviewRow({ r, onOpen }: { r: PeerReview; onOpen: (id: number) => void }) {
  const st = STATUS[r.status] || STATUS.open;
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpen(r.id)} data-testid={`peer-review-${r.id}`}
      className="w-full text-left p-3.5 rounded-2xl flex items-center gap-3 active:scale-[0.99] transition-all"
      style={{ background: "#fff", border: `1px solid ${DS.border}` }}
    >
      {r.imageUrl ? (
        <img src={r.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" style={{ border: `1px solid ${DS.border}` }} />
      ) : (
        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: DS.soft }}>
          <MessageSquare className="w-5 h-5" style={{ color: DS.muted }} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.color }}>{st.label}</span>
          {r.replyCount > 0 && <span className="text-[10px] font-bold" style={{ color: DS.muted }}>{r.replyCount} réponse{r.replyCount > 1 ? "s" : ""}</span>}
        </div>
        <p className="text-sm font-bold truncate" style={{ color: INK }}>{r.condition || "Cas clinique"}{r.ageSex ? ` · ${r.ageSex}` : ""}</p>
        <p className="text-[11px] truncate" style={{ color: DS.body }}>
          {r.mine ? "Votre demande" : `${r.requesterName}${r.requesterCity ? ` · ${r.requesterCity}` : ""}`} — {r.question}
        </p>
      </div>
    </motion.button>
  );
}

function PeerReviewDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const { toast } = useToast();
  const { data, isLoading } = usePeerReview(id);
  const reply = useReplyPeerReview(id);
  const close = useClosePeerReview();
  const [msg, setMsg] = useState("");

  const review = data?.review;
  const replies = data?.replies || [];
  const st = review ? (STATUS[review.status] || STATUS.open) : STATUS.open;

  const send = async () => {
    if (!msg.trim()) return;
    try { await reply.mutateAsync(msg.trim()); setMsg(""); }
    catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
  };

  return (
    <ProLayout title="Cas clinique" back="/derm/confreres" hideBottomNav>
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-extrabold mb-3" style={{ color: BLUE }}>
        <ArrowLeft className="w-3.5 h-3.5" /> Retour à la liste
      </button>

      {isLoading || !review ? (
        <ProCard className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" style={{ color: NAVY }} /></ProCard>
      ) : (
        <>
          <ProCard className="p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-extrabold px-2 py-1 rounded" style={{ background: st.bg, color: st.color }}>{st.label}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold" style={{ color: "#047857" }}>
                <ShieldCheck className="w-3 h-3" /> Anonymisé
              </span>
            </div>
            {review.imageUrl && (
              <img src={review.imageUrl} alt="Cas" className="w-full rounded-xl mb-3 object-cover" style={{ maxHeight: 320, border: `1px solid ${DS.border}` }} />
            )}
            <p className="text-sm font-extrabold" style={{ color: INK }}>{review.condition || "Cas clinique"}{review.ageSex ? ` · ${review.ageSex}` : ""}</p>
            <p className="text-[11px] mb-2" style={{ color: DS.muted }}>
              {review.mine ? "Votre demande" : `${review.requesterName}${review.requesterCity ? ` · ${review.requesterCity}` : ""}`}
            </p>
            <p className="text-sm" style={{ color: DS.body }}>{review.question}</p>

            {review.mine && review.status !== "closed" && (
              <button onClick={() => close.mutate(review.id)} disabled={close.isPending}
                className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full"
                style={{ background: DS.soft, border: `1px solid ${DS.border}`, color: DS.body }} data-testid="button-close-review">
                <CheckCircle2 className="w-3.5 h-3.5" /> Clôturer (avis suffisant)
              </button>
            )}
          </ProCard>

          {/* Fil de réponses */}
          <p className="text-[11px] font-extrabold uppercase tracking-wider mb-2 px-1" style={{ color: DS.muted }}>
            Avis des confrères ({replies.length})
          </p>
          {replies.length === 0 ? (
            <ProCard className="p-6 text-center mb-4"><p className="text-sm" style={{ color: DS.body }}>Aucune réponse pour l'instant.</p></ProCard>
          ) : (
            <div className="space-y-2 mb-4">
              {replies.map((rep) => (
                <div key={rep.id} className={`p-3.5 rounded-2xl ${rep.mine ? "ml-6" : "mr-6"}`}
                  style={{ background: rep.mine ? "rgba(124,58,237,0.06)" : "#fff", border: `1px solid ${rep.mine ? "rgba(124,58,237,0.2)" : DS.border}` }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-extrabold" style={{ color: rep.mine ? NAVY : INK }}>{rep.authorName}</p>
                    <p className="text-[9px]" style={{ color: DS.muted }}>{new Date(rep.createdAt).toLocaleDateString("fr-FR")}</p>
                  </div>
                  <p className="text-sm" style={{ color: DS.body }}>{rep.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Zone de réponse */}
          {review.status !== "closed" && (
            <ProCard className="p-3">
              <div className="flex items-end gap-2">
                <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={2}
                  placeholder={review.mine ? "Ajouter une précision…" : "Donner votre avis clinique…"}
                  data-testid="input-peer-reply"
                  className="flex-1 px-3 py-2 rounded-xl text-sm outline-none resize-none" style={{ background: DS.soft, border: `1px solid ${DS.border}`, color: INK }} />
                <button onClick={send} disabled={reply.isPending || !msg.trim()}
                  className="p-3 rounded-full text-white disabled:opacity-40 flex-shrink-0" style={{ background: NAVY }} data-testid="button-send-peer-reply">
                  {reply.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </ProCard>
          )}
        </>
      )}
    </ProLayout>
  );
}
