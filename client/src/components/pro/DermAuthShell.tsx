import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

// Cadre commun des pages d'accès GlowScan Derm (maquette « Derm Connexion ») :
// en-tête avec retour vers la landing, texte d'accueil à gauche, carte à droite.

export function DermBrand({ size = 32 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/glowscan-mark.png" alt="GlowScan" width={size} height={size} className="rounded-full object-cover" />
      <span className="whitespace-nowrap font-heading text-[18px]">
        GlowScan <span className="text-organic-accent-2-700">Derm</span>
      </span>
    </span>
  );
}

export function DermAuthShell({ side, children }: {
  side: { title: string; text: string; points: string[] };
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-organic-bg font-body text-organic-text">
      <header className="mx-auto box-border flex w-full max-w-[1160px] items-center gap-3 px-[clamp(16px,4vw,40px)] py-3.5">
        <Link href="/derm" className="flex items-center gap-2.5 text-organic-text no-underline" data-testid="link-back">
          <span className="flex rounded-full px-2.5 py-1.5"><ArrowLeft size={18} strokeWidth={2} /></span>
          <DermBrand />
        </Link>
      </header>

      <main className="flex flex-1 flex-wrap items-center justify-center gap-[clamp(32px,6vw,80px)] px-[clamp(16px,4vw,40px)] py-[clamp(24px,5vw,64px)]">
        <div className="flex min-w-0 flex-[0_1_420px] flex-col gap-3.5">
          <h1 className="m-0 text-[clamp(34px,4.4vw,52px)] leading-[1.08] [text-wrap:balance]">{side.title}</h1>
          <p className="m-0 text-[16px] leading-relaxed text-organic-neutral-800">{side.text}</p>
          <div className="mt-1.5 flex flex-col gap-2">
            {side.points.map((t) => (
              <span key={t} className="flex gap-2.5 text-[14px] font-semibold">
                <span className="font-bold text-organic-accent-2-700">✓</span>{t}
              </span>
            ))}
          </div>
        </div>
        <div className="w-full min-w-0 flex-[0_1_440px]">{children}</div>
      </main>
    </div>
  );
}

/** Carte Organic (.card) utilisée par les formulaires d'accès. */
export function AuthCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-4 rounded-card bg-organic-surface p-[clamp(24px,4vw,40px)] ${className}`}>
      {children}
    </div>
  );
}

export function AuthField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] text-organic-neutral-700">{label}</span>
      {children}
    </label>
  );
}

/** Champ Organic (pilule) sur fond de carte : fond « bg » pour rester lisible. */
export const authInput = "h-11 bg-organic-bg text-[15px]";

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" className="rounded-pill bg-organic-accent-100 px-4 py-2.5 text-[13px] font-semibold text-organic-accent-900">
      {children}
    </div>
  );
}
