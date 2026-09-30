import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ProLayout";
import { DermBrand } from "@/components/pro/DermAuthShell";
import { PilotageView, type ProgramDashboard } from "@/components/pro/PilotageView";
import { InviteRelays, CsvInvite } from "@/components/relay/InviteRelays";
import { useAuth } from "@/hooks/use-auth";
import { useProAccount } from "@/hooks/use-pro";
import { asProProfile, proHomeOf } from "@shared/proProfile";

// ════════════════════════════════════════════════════════════════════════
// Pilotage d'un programme — compte ONG (/derm/pilotage). Lecture seule,
// données anonymisées. Le rapport au bailleur est relu et envoyé par GlowScan.
// ════════════════════════════════════════════════════════════════════════

export default function ProPilotage() {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const { data: accData, isLoading } = useProAccount();
  const acc: any = accData?.account;
  const isNgo = asProProfile(acc?.profile) === "ngo";
  const [range, setRange] = useState("1m");
  const [programId, setProgramId] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!acc) setLocation(accData?.user?.role === "secretary" ? proHomeOf(null, "secretary") : "/derm/connexion");
    else if (!isNgo) setLocation(proHomeOf(acc.profile, "doctor"));
  }, [isLoading, acc, accData, isNgo, setLocation]);

  const { data: me } = useQuery<{ programs: { id: number; name: string }[] }>({ queryKey: ["/api/program/me"], enabled: isNgo });
  const pid = programId ?? me?.programs?.[0]?.id ?? null;
  const { data: dash, isError } = useQuery<ProgramDashboard>({
    queryKey: [`/api/program/dashboard?programId=${pid}&range=${range}`],
    enabled: isNgo && pid != null,
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
        {me.programs.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {me.programs.map((p) => (
              <button key={p.id} type="button" onClick={() => setProgramId(p.id)}
                className={`cursor-pointer rounded-pill border px-3.5 py-1.5 font-body text-[13px] font-semibold ${pid === p.id ? "border-organic-accent bg-organic-accent text-organic-bg" : "border-organic-divider bg-transparent text-organic-text"}`}>
                {p.name}
              </button>
            ))}
          </div>
        )}
        {me.programs.length === 0 ? (
          <div className="flex flex-col gap-2 rounded-card bg-organic-surface p-organic-8">
            <span className="font-heading text-[22px]">Aucun programme rattaché</span>
            <p className="m-0 text-[14px] text-organic-neutral-800">GlowScan rattache votre compte à votre programme. Contactez-nous sur WhatsApp au +237 674 377 959.</p>
          </div>
        ) : isError ? (
          <div className="rounded-card bg-organic-surface p-organic-6 text-[14px]">Tableau de bord indisponible pour le moment.</div>
        ) : !dash ? (
          <div className="rounded-card bg-organic-surface p-organic-6 text-[14px] text-organic-neutral-700">Chargement…</div>
        ) : (
          <>
            <PilotageView d={dash} range={range} onRange={setRange} />
            {pid && (
              <section className="grid items-start gap-organic-4 lg:grid-cols-2">
                <InviteRelays programId={pid} />
                <CsvInvite programId={pid} />
              </section>
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
