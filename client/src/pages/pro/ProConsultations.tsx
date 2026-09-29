import { useEffect, useState } from "react";
import { ProLayout } from "@/components/ProLayout";
import { useProAccount } from "@/hooks/use-pro";
import { ConsultationChat } from "@/components/ConsultationChat";

// ════════════════════════════════════════════════════════════════════════
// Consultations en ligne (refonte Organic) — maquette « Derm Portal »,
// écran Consultations. Ordinateur : liste à gauche, conversation à droite.
// Mobile (< 768 px) : la conversation s'ouvre en plein écran (README §4, point 14).
// Le compte rendu se valide, se signe (code à 4 chiffres) et s'envoie depuis
// la conversation (ConsultationChat).
// ════════════════════════════════════════════════════════════════════════

interface Consult {
  id: number; condition?: string; status?: string; paymentStatus?: string; unreadDoctor?: number;
  patientFirstName?: string; lastMessageAt?: string; createdAt?: string; isDemo?: boolean;
}

const TZ = "Africa/Douala";
function timeOf(d?: string) {
  if (!d) return "";
  const x = new Date(d);
  const today = x.toLocaleDateString("fr-CA", { timeZone: TZ }) === new Date().toLocaleDateString("fr-CA", { timeZone: TZ });
  return today
    ? x.toLocaleTimeString("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
    : x.toLocaleDateString("fr-FR", { timeZone: TZ, day: "numeric", month: "short" });
}

function useIsMobile() {
  const q = "(max-width: 767px)";
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return m;
}

export default function ProConsultations() {
  const { data: accData } = useProAccount();
  const isMobile = useIsMobile();
  const [list, setList] = useState<Consult[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    fetch("/api/pro/consultations", { credentials: "include" })
      .then((r) => r.json()).then((d) => setList(d.consultations || []))
      .catch(() => setList([])).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  // Recharge la liste au retour sur la page (retour depuis un PDF, un appel…).
  useEffect(() => {
    const onFocus = () => { if (document.visibilityState === "visible") load(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, []);

  // Lien profond (notification) : /derm/consultations?c=<id> ouvre directement le dossier.
  useEffect(() => {
    const cid = parseInt(new URLSearchParams(window.location.search).get("c") || "");
    if (cid && !Number.isNaN(cid)) setOpenId(cid);
  }, []);

  // Ordinateur : la première consultation s'affiche d'office.
  useEffect(() => {
    if (!isMobile && openId == null && list.length) setOpenId(list[0].id);
  }, [isMobile, list, openId]);

  const myUserId = (accData as any)?.user?.id || null;
  const open = (id: number) => { setOpenId(id); setList((l) => l.map((c) => (c.id === id ? { ...c, unreadDoctor: 0 } : c))); };

  if (isMobile && openId) {
    return (
      <div className="fixed inset-0 z-50 bg-organic-bg">
        <ConsultationChat key={openId} consultationId={openId} myUserId={myUserId} onBack={() => { setOpenId(null); load(); }} />
      </div>
    );
  }

  return (
    <ProLayout>
      <header className="flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">En ligne depuis GlowScan</span>
        <h1 className="m-0 text-[clamp(30px,4vw,42px)]">Consultations</h1>
      </header>

      {loading ? (
        <div className="rounded-card bg-organic-surface p-organic-6 text-[14px] text-organic-neutral-700">Chargement…</div>
      ) : list.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-card bg-organic-surface p-organic-8">
          <span className="font-heading text-[17px]">Aucune consultation pour l'instant</span>
          <p className="m-0 text-[13px] opacity-80">Activez « Accepter les consultations à distance » dans votre profil public pour en recevoir.</p>
        </div>
      ) : (
        <div className="grid items-start gap-organic-4 md:grid-cols-[minmax(240px,320px)_1fr]">
          <div className="flex flex-col gap-1" role="list">
            {list.map((c) => {
              const unread = c.unreadDoctor || 0;
              const on = c.id === openId;
              return (
                <button key={c.id} type="button" role="listitem" onClick={() => open(c.id)}
                  className={`flex w-full cursor-pointer items-center gap-3 rounded-pill border-0 py-2.5 pl-2.5 pr-4 text-left font-body text-organic-text ${on ? "bg-organic-surface" : "bg-transparent hover:bg-organic-neutral-200"}`}
                  data-testid={`consult-${c.id}`}>
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-organic-accent-200 text-[13px] font-bold text-organic-accent-800">
                    {(c.patientFirstName || "P").charAt(0).toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1.5 truncate text-[14px] font-bold">
                      {c.patientFirstName || "Patient"}
                      {c.isDemo && <span className="rounded-pill bg-organic-neutral-200 px-2 text-[10px] font-bold">Démo</span>}
                    </span>
                    <span className="truncate text-[12px] text-organic-neutral-700">{c.condition || "Consultation"}</span>
                  </span>
                  {unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-pill bg-organic-accent px-1.5 text-[11px] font-bold text-organic-bg">{unread}</span>}
                  <span className="flex-none text-[11px] text-organic-neutral-700">{timeOf(c.lastMessageAt || c.createdAt)}</span>
                </button>
              );
            })}
          </div>

          {openId != null && (
            <div className="hidden h-[calc(100vh-170px)] min-h-[520px] overflow-hidden rounded-card bg-organic-surface md:block">
              <ConsultationChat key={openId} consultationId={openId} myUserId={myUserId} />
            </div>
          )}
        </div>
      )}
    </ProLayout>
  );
}
