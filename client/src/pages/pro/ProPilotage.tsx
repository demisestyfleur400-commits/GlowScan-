import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ProLayout";
import { DermBrand } from "@/components/pro/DermAuthShell";
import { PilotageView, type ProgramDashboard } from "@/components/pro/PilotageView";
import { InviteRelays, CsvInvite } from "@/components/relay/InviteRelays";
import { ProgramSetup, ProgramBudget, ProgramAgents, ProgramReferrals } from "@/components/pro/ProgramSpace";
import { useAuth } from "@/hooks/use-auth";
import { useProAccount } from "@/hooks/use-pro";
import { asProProfile, proHomeOf } from "@shared/proProfile";

// ════════════════════════════════════════════════════════════════════════
// Pilotage d'un programme — compte ONG (/derm/pilotage). Données anonymisées.
// Étape 14a : création du programme (O1), agents (O2), budget d'avis (O3).
// Le rapport au bailleur est relu et envoyé par GlowScan.
// ════════════════════════════════════════════════════════════════════════

export default function ProPilotage() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const { data: accData, isLoading } = useProAccount();
  const acc: any = accData?.account;
  const isNgo = asProProfile(acc?.profile) === "ngo";
  const [range, setRange] = useState("1m");
  const [programId, setProgramId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (isLoading) return;
    if (!acc) setLocation(accData?.user?.role === "secretary" ? proHomeOf(null, "secretary") : "/derm/connexion");
    else if (!isNgo) setLocation(proHomeOf(acc.profile, "doctor"));
  }, [isLoading, acc, accData, isNgo, setLocation]);

  const { data: me } = useQuery<{ programs: { id: number; name: string; status: string }[] }>({ queryKey: ["/api/program/me"], enabled: isNgo });
  const pid = programId ?? me?.programs?.[0]?.id ?? null;
  const current = me?.programs.find((p) => p.id === pid) || null;
  const { data: dash, isError } = useQuery<ProgramDashboard>({
    queryKey: [`/api/program/dashboard?programId=${pid}&range=${range}`],
    enabled: isNgo && pid != null && current?.status !== "draft",
  });

  if (isLoading || !isNgo || !me) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-organic-bg font-body text-organic-text">
      <header className="mx-auto box-border flex w-full max-w-[1160px] items-center justify-between gap-3 px-4 py-3.5 md:px-organic-8">
        <span className="flex items-center gap-3">
          <DermBrand />
          <span className="hidden text-[10px] font-bold uppercase tracking-[.14em] text-organic-accent-2-700 sm:inline">Pilotage</span>
        </span>
        <Button variant="ghost" size="sm" onClick={() => logout()} aria-label="Déconnexion">
          <LogOut size={16} /><span className="hidden sm:inline">Déconnexion</span>
        </Button>
      </header>
      <main className="mx-auto box-border flex w-full max-w-[1160px] flex-col gap-organic-4 px-4 pb-16 md:px-organic-8">
        <div className="flex flex-wrap items-center gap-1.5">
          {me.programs.map((p) => (
            <button key={p.id} type="button" onClick={() => { setProgramId(p.id); setCreating(false); }}
              className={`cursor-pointer rounded-pill border px-3.5 py-1.5 font-body text-[13px] font-semibold ${!creating && pid === p.id ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`}>
              {p.name}{p.status === "draft" ? " · brouillon" : p.status === "closed" ? " · clôturé" : ""}
            </button>
          ))}
          <Button variant="secondary" size="sm" onClick={() => setCreating(true)} data-testid="program-new">+ Nouveau programme</Button>
        </div>
        {creating || me.programs.length === 0 ? (
          <ProgramSetup programId={null} onSaved={(id) => { setProgramId(id); qc.invalidateQueries({ queryKey: ["/api/program/me"] }); }} />
        ) : current?.status === "draft" && pid ? (
          <>
            <ProgramSetup programId={pid} onSaved={() => qc.invalidateQueries({ queryKey: ["/api/program/me"] })} />
            <ProgramBudget programId={pid} />
          </>
        ) : isError ? (
          <div className="rounded-card bg-organic-surface p-organic-6 text-[14px]">Tableau de bord indisponible pour le moment.</div>
        ) : !dash ? (
          <div className="rounded-card bg-organic-surface p-organic-6 text-[14px] text-organic-neutral-700">Chargement…</div>
        ) : (
          <>
            <PilotageView d={dash} range={range} onRange={setRange} />
            {pid && (
              <>
                <section className="grid items-start gap-organic-4 lg:grid-cols-2">
                  <ProgramBudget programId={pid} />
                  <InviteRelays programId={pid} />
                </section>
                <section className="grid items-start gap-organic-4 lg:grid-cols-2">
                  <ProgramAgents programId={pid} />
                  <ProgramReferrals programId={pid} />
                </section>
                <CsvInvite programId={pid} />
              </>
            )}
            <div className="flex flex-col gap-1 rounded-card bg-organic-surface p-organic-6">
              <span className="font-heading text-[20px]">Rapport au bailleur</span>
              <span className="text-[13px] text-organic-neutral-800">Chaque mois, GlowScan relit puis envoie le rapport (chiffres clés, districts, progression des agents qui l'acceptent) à l'email du bailleur.</span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
