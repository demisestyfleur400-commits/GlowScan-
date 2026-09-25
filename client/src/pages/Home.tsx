import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useScans } from "@/hooks/use-scans";
import { useProAccount } from "@/hooks/use-pro";
import { trackPageVisit } from "@/lib/analytics";
import Landing from "@/pages/Landing";
import { HomeAccueil } from "@/pages/HomeAccueil";

// ─────────────────────────────────────────────────────────────────────────
//  « / » : landing pour les visiteurs, Accueil patient (refonte Organic) pour
//  les comptes connectés, tableau de bord DERM pour les médecins.
// ─────────────────────────────────────────────────────────────────────────
export default function Home() {
  const { user, isLoading } = useAuth();
  const { data: scans } = useScans();
  const [, setLocation] = useLocation();

  const { data: proData } = useProAccount();
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("as") === "user") return;
    if (proData?.account) setLocation("/derm/dashboard");
  }, [user, proData, setLocation]);

  useEffect(() => { trackPageVisit("/"); }, []);

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-organic-bg">
        <Loader2 className="h-6 w-6 animate-spin text-organic-accent" strokeWidth={1.75} aria-label="Chargement" />
      </div>
    );
  }

  if (!user) return <Landing />;

  const firstName = (user.firstName || user.lastName || user.email || "").split(/[\s@]/)[0];
  const lastScan: any = Array.isArray(scans) && scans.length > 0 ? scans[0] : null;

  return <HomeAccueil firstName={firstName} lastScan={lastScan} go={setLocation} />;
}
