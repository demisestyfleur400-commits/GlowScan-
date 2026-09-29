import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useProAccount } from "@/hooks/use-pro";
import { DermBrand } from "@/components/pro/DermAuthShell";
import { asProProfile, proHomeOf } from "@shared/proProfile";

// ════════════════════════════════════════════════════════════════════════
// Page d'arrivée provisoire des profils Relais (/derm/relais) et ONG
// (/derm/pilotage). Leurs espaces arrivent aux étapes 5 (télé-expertise,
// réseau, formation) et 6 (pilotage ONG) : en attendant, on confirme que le
// compte existe, sans rien promettre de chiffré.
// ════════════════════════════════════════════════════════════════════════

const COPY = {
  relay: {
    title: "Votre compte relais est créé.",
    text: "L'espace relais (envoi de cas, retours du dermatologue, suivi de votre parcours) ouvre prochainement. Nous vous prévenons par email dès qu'il est disponible.",
  },
  ngo: {
    title: "Votre compte programme est créé.",
    text: "Le suivi du programme (cas traités, agents formés, rapport mensuel) ouvre prochainement. Nous vous prévenons par email dès qu'il est disponible.",
  },
} as const;

export default function ProEnPreparation({ kind }: { kind: "relay" | "ngo" }) {
  const [, setLocation] = useLocation();
  const { logout } = useAuth();
  const { data: accData, isLoading } = useProAccount();

  // Non connecté → connexion ; autre profil → sa propre page d'arrivée.
  useEffect(() => {
    if (isLoading) return;
    if (!accData?.account) {
      setLocation(accData?.user?.role === "secretary" ? proHomeOf(null, "secretary") : "/derm/connexion");
      return;
    }
    const p = asProProfile((accData.account as any).profile);
    if (p !== kind) setLocation(proHomeOf(p, "doctor"));
  }, [accData, isLoading, kind, setLocation]);

  const c = COPY[kind];
  return (
    <div className="flex min-h-screen flex-col bg-organic-bg font-body text-organic-text">
      <header className="mx-auto box-border flex w-full max-w-[1160px] items-center justify-between gap-3 px-[clamp(16px,4vw,40px)] py-3.5">
        <DermBrand />
        <Button variant="ghost" size="sm" onClick={() => logout()}>Déconnexion</Button>
      </header>
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col justify-center gap-4 px-5 py-10">
        <h1 className="m-0 text-[clamp(28px,4vw,40px)] leading-tight">{c.title}</h1>
        <p className="m-0 text-[16px] leading-relaxed text-organic-neutral-800">{c.text}</p>
        <a href="https://wa.me/237674377959" className="self-start text-[14px] font-bold text-organic-accent-700">Support WhatsApp</a>
      </main>
    </div>
  );
}
