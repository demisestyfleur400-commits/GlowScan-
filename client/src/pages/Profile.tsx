import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { setUserConsent } from "@/components/ConsentBanner";
import { TwoFASettings } from "@/components/TwoFASettings";
import { formatF } from "@shared/delivery";
import { cn } from "@/lib/utils";

// ════════════════════════════════════════════════════════════════════════
// Profil (refonte Organic) — maquette « GlowScan App » › Profil.
// Consentements séparés (soins verrouillé, recherche, rappels WhatsApp),
// rappels de suivi (réactivables par le patient seul), journal « Qui a
// consulté mon dossier », commandes, export et suppression des données.
// ════════════════════════════════════════════════════════════════════════

type Consents = {
  care: true; research: boolean; reminders: boolean; remindersStoppedAt: string | null; phone: string | null;
  followups: { enabled: boolean; stoppedAt: string | null };
};
type AccessEntry = { at: string; role: string; name: string | null };
type OrderRow = { orderNumber: string; totalPrice: number; status: string; createdAt: string; payMethod?: string | null };

const ORDER_LABEL: Record<string, string> = { received: "Reçue", paid_verified: "Paiement vérifié", shipping: "En livraison", delivered: "Livrée" };
const ROLE_LABEL: Record<string, string> = { derm: "Dermatologue", secretary: "Secrétariat du cabinet", relay: "Relais de santé" };
const fmtDate = (d: string, withTime = false) => new Date(d).toLocaleDateString("fr-FR", withTime ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } : { day: "numeric", month: "long" });
const drName = (n: string) => (/^(dr|pr)\.?\s/i.test(n) ? n : `Dr ${n}`);

function Switch({ on, locked, onClick, label }: { on: boolean; locked?: boolean; onClick?: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={locked} onClick={onClick}
      className="flex h-7 w-12 flex-none items-center rounded-pill border-0 p-1 disabled:cursor-not-allowed"
      style={{ justifyContent: on ? "flex-end" : "flex-start", background: on ? "var(--color-accent-2-600)" : "var(--color-neutral-400)" }}>
      <span className="flex h-5 w-5 items-center justify-center rounded-pill bg-organic-neutral-100">{locked && <Lock size={11} strokeWidth={2} className="text-organic-neutral-700" />}</span>
    </button>
  );
}

export default function Profile() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user, isLoading: authLoading, logout } = useAuth();
  const { isPremium } = useSubscription();
  const { data: consents, isError: consentsError } = useQuery<Consents>({ queryKey: ["/api/me/consents"], enabled: !!user, retry: false });
  const { data: access } = useQuery<{ entries: AccessEntry[] }>({ queryKey: ["/api/me/access-log"], enabled: !!user });
  const { data: orders } = useQuery<OrderRow[]>({ queryKey: ["/api/orders"], enabled: !!user, retry: false });
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState("");

  useEffect(() => { if (!authLoading && !user) setLocation("/auth"); }, [authLoading, user, setLocation]);
  // Ancien lien profond ?scan=<id> : l'historique vit désormais dans Ma peau.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("scan");
    if (id) setLocation(`/ma-peau?scan=${id}`);
  }, [setLocation]);

  const save = async (key: "research" | "reminders", value: boolean) => {
    setBusy(key);
    try {
      const r = await fetch("/api/me/consents", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ [key]: value }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message);
      // Le choix « recherche » vaut aussi pour les prochaines analyses de cet appareil.
      if (key === "research") setUserConsent(value ? "accepted" : "declined", user?.id);
      qc.invalidateQueries({ queryKey: ["/api/me/consents"] });
    } catch (e: any) {
      toast({ title: "Réglage non enregistré", description: e?.message || "Réessayez dans un instant.", variant: "destructive" });
    } finally { setBusy(null); }
  };

  const resumeFollowups = async () => {
    setBusy("followups");
    try {
      const r = await fetch("/api/me/followups/resume", { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error();
      qc.invalidateQueries({ queryKey: ["/api/me/consents"] });
      toast({ title: "Rappels de suivi réactivés" });
    } catch { toast({ title: "Réactivation impossible", description: "Réessayez dans un instant.", variant: "destructive" }); }
    finally { setBusy(null); }
  };

  const exportData = async () => {
    setBusy("export");
    try {
      const r = await fetch("/api/user/me/export", { credentials: "include" });
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `glowscan-mes-donnees-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast({ title: "Export impossible", description: "Réessayez ou contactez le support.", variant: "destructive" }); }
    finally { setBusy(null); }
  };

  const deleteAccount = async () => {
    if (confirmDelete !== "SUPPRIMER") return;
    setBusy("delete");
    try {
      const r = await fetch("/api/user/me", { method: "DELETE", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: "SUPPRIMER" }) });
      if (!r.ok) throw new Error();
      toast({ title: "Compte supprimé", description: "Toutes vos données ont été effacées." });
      setTimeout(() => { window.location.href = "/"; }, 1200);
    } catch { toast({ title: "Suppression impossible", description: "Réessayez ou contactez le support.", variant: "destructive" }); setBusy(null); }
  };

  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "";
  const card = "flex flex-col gap-3 rounded-lg bg-organic-surface p-4";
  const row = "flex items-center gap-3";

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <main className="mx-auto flex max-w-[480px] flex-col gap-4 px-5 pb-6 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 flex-none items-center justify-center rounded-pill bg-organic-accent-200 text-[20px] font-bold text-organic-accent-800">{(name || "U").charAt(0).toUpperCase()}</span>
          <span className="flex flex-col">
            <h1 className="m-0 text-[26px]">{name}</h1>
            {user?.email && !String(user.email).endsWith("@phone.glowscan.cm") && <span className="text-[12px] text-organic-neutral-700">{user.email}</span>}
          </span>
        </div>

        <button type="button" onClick={() => setLocation("/premium")} className="flex items-center gap-3 rounded-lg border-0 bg-organic-surface p-4 text-left text-organic-text">
          <span className="flex flex-1 flex-col">
            <span className="text-[12px] text-organic-neutral-700">Formule</span>
            <span className="text-[16px] font-bold">{isPremium ? "Premium" : "Gratuit"}</span>
            <span className="text-[12px] text-organic-neutral-700">{isPremium ? "Analyses et scans produit illimités, Assistant" : "1 analyse et 3 scans produit par semaine"}</span>
          </span>
          <span className="rounded-pill bg-organic-accent-100 px-2.5 py-[3px] text-[11px] text-organic-accent-800">{isPremium ? "Gérer" : "Passer Premium"}</span>
        </button>

        {/* Consentements séparés */}
        <div className={card}>
          <span className="text-[13px] font-bold">Mes consentements</span>
          {consentsError && <span className="text-[12px] text-organic-accent-700">Réglages indisponibles pour le moment.</span>}
          <div className={row}>
            <span className="flex flex-1 flex-col"><span className="text-[14px] font-semibold">Partager avec mes médecins</span><span className="text-[12px] text-organic-neutral-700">Nécessaire pour consulter</span></span>
            <Switch on locked label="Partager avec mes médecins (obligatoire)" />
          </div>
          <div className={row}>
            <span className="flex flex-1 flex-col"><span className="text-[14px] font-semibold">Aider la recherche</span><span className="text-[12px] text-organic-neutral-700">Photos anonymisées pour l'atlas des peaux africaines</span></span>
            <Switch on={!!consents?.research} label="Aider la recherche" onClick={() => consents && busy !== "research" && save("research", !consents.research)} />
          </div>
          <div className={row}>
            <span className="flex flex-1 flex-col">
              <span className="text-[14px] font-semibold">Rappels WhatsApp</span>
              <span className="text-[12px] text-organic-neutral-700">{consents?.phone ? `Au ${consents.phone} · routine, nouvelle analyse` : "Ajoutez un numéro WhatsApp lors d'une analyse"}</span>
            </span>
            <Switch on={!!consents?.reminders} locked={!consents?.phone} label="Rappels WhatsApp" onClick={() => consents && busy !== "reminders" && save("reminders", !consents.reminders)} />
          </div>
        </div>

        {/* Rappels de suivi du médecin : seul le patient peut les réactiver */}
        {consents && !consents.followups.enabled && (
          <div className={card}>
            <span className="text-[14px] font-semibold">Rappels de suivi désactivés</span>
            <span className="text-[12px] text-organic-neutral-700">
              Vous avez répondu ARRÊT SUIVI{consents.followups.stoppedAt ? ` le ${fmtDate(consents.followups.stoppedAt)}` : ""}. Votre médecin ne peut plus vous envoyer de rappel de photo de contrôle.
            </span>
            <button type="button" onClick={resumeFollowups} disabled={busy === "followups"} className="self-start rounded-pill border-0 bg-organic-accent px-4 py-2.5 text-[14px] font-bold text-organic-neutral-100 disabled:opacity-45">
              Réactiver mes rappels de suivi
            </button>
          </div>
        )}

        {/* Journal d'accès */}
        <div className={card}>
          <span className="text-[13px] font-bold">Qui a consulté mon dossier</span>
          {(access?.entries ?? []).length === 0
            ? <span className="text-[12px] text-organic-neutral-700">Personne n'a encore ouvert votre dossier.</span>
            : access!.entries.slice(0, 10).map((e, i) => (
              <div key={i} className="flex justify-between gap-2 text-[13px]">
                <span>{e.name ? (e.role === "derm" ? drName(e.name) : e.name) : ROLE_LABEL[e.role] || "Professionnel de santé"}</span>
                <span className="text-organic-neutral-700">{fmtDate(e.at, true)}</span>
              </div>
            ))}
        </div>

        {/* Commandes */}
        {Array.isArray(orders) && orders.length > 0 && (
          <div className={card}>
            <span className="text-[13px] font-bold">Mes commandes</span>
            {orders.slice(0, 5).map((o) => (
              <div key={o.orderNumber} className="flex items-center justify-between gap-2 text-[13px]">
                <span className="flex flex-col"><b>{o.orderNumber}</b><span className="text-[12px] text-organic-neutral-700">{fmtDate(o.createdAt)} · {formatF(o.totalPrice)}</span></span>
                <span className={cn("rounded-pill px-2.5 py-[3px] text-[11px]", o.status === "delivered" ? "bg-organic-accent-2-100 text-organic-accent-2-800" : "bg-organic-accent-100 text-organic-accent-800")}>
                  {o.payMethod === "cash" && o.status === "paid_verified" ? "Confirmée" : ORDER_LABEL[o.status] || o.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Sécurité : double authentification par code email (facultative en B2C) */}
        <div className={card}>
          <span className="text-[13px] font-bold">Sécurité</span>
          <TwoFASettings />
        </div>

        {/* Mes données */}
        <div className={card}>
          <span className="text-[13px] font-bold">Mes données</span>
          <button type="button" onClick={exportData} disabled={busy === "export"} className="self-start rounded-pill border border-organic-divider bg-transparent px-4 py-2.5 text-[14px] font-bold disabled:opacity-45">
            Télécharger toutes mes données
          </button>
          <div className="flex flex-col gap-2 border-t border-organic-divider pt-3">
            <span className="text-[12px] text-organic-neutral-700">Supprimer mon compte efface définitivement vos analyses, photos et consultations. Tapez SUPPRIMER pour confirmer.</span>
            <div className="flex gap-2">
              <input value={confirmDelete} onChange={(e) => setConfirmDelete(e.target.value)} aria-label="Confirmation de suppression"
                className="h-10 flex-1 rounded-pill border border-organic-divider bg-organic-bg px-3.5 text-[14px] focus-visible:border-organic-accent focus-visible:outline-none" />
              <button type="button" onClick={deleteAccount} disabled={confirmDelete !== "SUPPRIMER" || busy === "delete"}
                className="rounded-pill border-0 bg-organic-accent-700 px-4 text-[14px] font-bold text-organic-neutral-100 disabled:opacity-45">Supprimer mon compte</button>
            </div>
          </div>
        </div>

        <button type="button" onClick={() => { try { logout(); } catch { /* ignoré */ } setLocation("/auth"); }}
          className="rounded-pill border border-organic-divider bg-transparent p-3 text-[14px] font-bold">Se déconnecter</button>
      </main>
    </div>
  );
}
