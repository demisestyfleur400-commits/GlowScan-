import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { useProAccount } from "@/hooks/use-pro";

// ════════════════════════════════════════════════════════════════════════
// Bannière DERM — abonnement expiré.
// Objectif : ne JAMAIS laisser le dermatologue dans le flou. Quand l'essai/
// l'abonnement est terminé, on dit EXPLICITEMENT qu'il ne peut plus lancer
// d'analyses IA ni recevoir de patients, tant qu'il ne s'est pas réabonné.
// (Le backend bloque déjà par 402 ; ici c'est l'information visible.)
// ════════════════════════════════════════════════════════════════════════
export function SubscriptionExpiredBanner() {
  const { data } = useProAccount();
  // On n'affiche RIEN tant qu'on ne sait pas — évite un flash pendant le chargement.
  if (!data || !data.account) return null;
  // Admin (accès interne) ou abonnement/essai encore valide → pas de bannière.
  if (data.isAdmin || data.active) return null;

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: 16,
        padding: "14px 16px",
        marginBottom: 16,
      }}
    >
      <AlertTriangle style={{ width: 20, height: 20, color: "#dc2626", flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 800, color: "#991b1b", margin: "0 0 4px" }}>
          Abonnement terminé
        </p>
        <p style={{ fontSize: 12.5, color: "#7f1d1d", margin: "0 0 10px", lineHeight: 1.6 }}>
          Votre abonnement est arrivé à échéance. Tant qu'il n'est pas réactivé, vous ne pouvez plus
          <strong> lancer d'analyses IA</strong> ni <strong>recevoir de nouveaux patients</strong>.
          Vos dossiers existants restent en sécurité.
        </p>
        <Link
          href="/derm/cabinet"
          style={{
            display: "inline-block",
            background: "#dc2626",
            color: "#fff",
            borderRadius: 9999,
            padding: "9px 18px",
            fontSize: 12.5,
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Réactiver mon abonnement →
        </Link>
      </div>
    </div>
  );
}
