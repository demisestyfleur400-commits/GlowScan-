import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";

// ════════════════════════════════════════════════════════════════════════
// Barre du haut B2C (refonte Organic) : logo + accès au profil.
// La navigation passe par la barre d'onglets du bas (components/b2c/TabBar),
// qui porte aussi le badge des messages non lus. La déconnexion est dans le Profil.
// ════════════════════════════════════════════════════════════════════════

export function GsTopBar() {
  const { user } = useAuth();

  return (
    <nav className="sticky top-0 z-[200] w-full border-b border-organic-divider bg-organic-bg font-body">
      <div className="mx-auto flex h-[60px] max-w-[1280px] items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <img
            src="/glowscan-mark.png"
            alt="GlowScan"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/logo-glowscan-square.jpeg"; }}
            className="block h-[30px] w-[30px] rounded-pill object-contain"
          />
          <span className="font-heading text-[18px] text-organic-text">GlowScan</span>
        </Link>

        {user ? (
          <Link
            href="/profile"
            aria-label="Mon profil"
            className="flex h-9 w-9 items-center justify-center rounded-pill bg-organic-surface text-[13px] font-bold text-organic-text no-underline"
          >
            {(user.firstName || "U").charAt(0).toUpperCase()}
          </Link>
        ) : (
          <Link
            href="/auth"
            className="rounded-pill bg-organic-accent px-4 py-2 text-[13px] font-bold text-organic-neutral-100 no-underline hover:bg-organic-accent-600"
          >
            Connexion
          </Link>
        )}
      </div>
    </nav>
  );
}
