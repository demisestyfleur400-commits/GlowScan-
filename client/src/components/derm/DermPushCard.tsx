import { useState } from "react";
import { Bell } from "lucide-react";
import { useDermPush } from "@/hooks/use-derm-push";
import { D } from "./tokens";
import { Btn } from "./ui";

// Notifications du dermatologue. Deux formes :
//  - "banner" : vue d'ensemble, tant que ce poste n'est pas abonné (masquable 7 jours) ;
//  - "settings" : Paramètres, toujours visible (état + activer + tester).
const HIDE_KEY = "derm_push_banner_hidden_until";

export function DermPushCard({ variant }: { variant: "banner" | "settings" }) {
  const { state, busy, enable, test } = useDermPush();
  const [msg, setMsg] = useState<string | null>(null);
  const [hidden, setHidden] = useState(() => { try { return Number(localStorage.getItem(HIDE_KEY) || 0) > Date.now(); } catch { return false; } });

  const onEnable = async () => { const err = await enable(); setMsg(err || "Notifications activées : une notification de test vient d'être envoyée sur cet ordinateur."); };
  const onTest = async () => setMsg((await test()) ? "Notification de test envoyée. Elle doit apparaître dans un instant." : "Envoi impossible pour le moment. Réessayez.");

  if (state === "loading") return null;
  if (variant === "banner" && (state !== "available" || hidden)) return null;

  const body = {
    enabled: "Activées sur cet ordinateur : vous êtes prévenu d'un patient en attente, d'un message, d'un paiement ou d'un compte rendu à envoyer.",
    available: "Soyez prévenu sur cet ordinateur dès qu'un patient vous attend, vous écrit ou paie, même quand GlowScan Derm est fermé.",
    denied: "Bloquées pour ce site. Cliquez sur le cadenas à gauche de l'adresse, puis Notifications → Autoriser, et revenez ici.",
    "ios-install": "Sur iPhone ou iPad, installez d'abord GlowScan Derm sur l'écran d'accueil (Partager → « Sur l'écran d'accueil »), puis activez ici.",
    unsupported: "Ce navigateur ne gère pas les notifications. Utilisez Google Chrome ou Microsoft Edge.",
  }[state];

  return (
    <div data-testid={`derm-push-${variant}`} className="flex flex-wrap items-center"
      style={{ gap: 14, padding: "14px 16px", borderRadius: 12, marginBottom: variant === "banner" ? 16 : 0,
        background: variant === "banner" ? "#eef6f1" : "#fff", border: `1px solid ${variant === "banner" ? "#b9d8c6" : D.border}` }}>
      <span className="grid flex-none place-items-center" style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(42,107,79,.12)", color: "#2a6b4f" }}><Bell size={18} /></span>
      <div style={{ flex: "1 1 280px", minWidth: 0 }}>
        <b style={{ fontSize: 14, fontWeight: 600, color: D.text }}>Notifications {state === "enabled" ? "activées" : "sur cet ordinateur"}</b>
        <div style={{ fontSize: 12.5, color: D.muted, marginTop: 2, lineHeight: 1.5 }}>{msg || body}</div>
      </div>
      {state === "available" && <Btn kind="primary" onClick={onEnable} disabled={busy} data-testid="derm-push-enable">{busy ? "Activation…" : "Activer les notifications"}</Btn>}
      {state === "enabled" && variant === "settings" && <Btn kind="secondary" onClick={onTest} data-testid="derm-push-test">Envoyer une notification de test</Btn>}
      {variant === "banner" && (
        <Btn kind="link" onClick={() => { try { localStorage.setItem(HIDE_KEY, String(Date.now() + 7 * 864e5)); } catch {} setHidden(true); }} style={{ fontSize: 12 }}>Plus tard</Btn>
      )}
    </div>
  );
}
