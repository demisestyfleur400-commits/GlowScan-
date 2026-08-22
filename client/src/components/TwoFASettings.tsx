import { useEffect, useState } from "react";
import { ShieldCheck, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Vérification en 2 étapes — OPTIONNELLE côté grand public (B2C).
export function TwoFASettings() {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [step, setStep] = useState<"idle" | "confirm" | "disable">("idle");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState("");
  const [newCodes, setNewCodes] = useState<string[]>([]);

  const refresh = () => {
    fetch("/api/auth/2fa/status", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) { setEnabled(!!d.enabled); setRemaining(typeof d.backupCodesRemaining === "number" ? d.backupCodesRemaining : null); } else setEnabled(false); })
      .catch(() => setEnabled(false));
  };
  useEffect(refresh, []);

  const request = async () => {
    setBusy(true);
    try {
      const r = await apiRequest("POST", "/api/auth/2fa/email/request", {});
      const d = await r.json();
      setHint(d.emailHint || ""); setStep("confirm");
      toast({ title: "Code envoyé 📧", description: d.devFallback ? "Mode dev : voir les logs." : `Envoyé sur ${d.emailHint}.` });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message || "Un email valide est requis", variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    setBusy(true);
    try {
      const r = await apiRequest("POST", "/api/auth/2fa/email/confirm", { code });
      const d = await r.json();
      setEnabled(true); setStep("idle"); setCode("");
      if (Array.isArray(d.backupCodes) && d.backupCodes.length) setNewCodes(d.backupCodes);
      refresh();
      toast({ title: "2FA activée ✅", description: "Un code vous sera demandé à chaque connexion." });
    } catch (e: any) { toast({ title: "Code incorrect", description: e?.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const disable = async () => {
    setBusy(true);
    try {
      await apiRequest("POST", "/api/auth/2fa/email/disable", { password: pwd });
      setEnabled(false); setStep("idle"); setPwd("");
      toast({ title: "2FA désactivée" });
    } catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };
  const regen = async () => {
    if (!window.confirm("Générer de nouveaux codes ? Les anciens ne fonctionneront plus.")) return;
    setBusy(true);
    try { const r = await apiRequest("POST", "/api/auth/2fa/backup-codes/generate", {}); const d = await r.json(); setNewCodes(d.codes || []); refresh(); }
    catch (e: any) { toast({ title: "Erreur", description: e?.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const card: React.CSSProperties = { background: "#fff", border: "1px solid #e6ece8", borderRadius: 18, padding: 20, marginTop: 16 };
  const soft: React.CSSProperties = { background: "#f4f7f5", border: "1px solid #dbe5df" };
  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <ShieldCheck className="w-4 h-4" style={{ color: "#2f9e6e" }} />
        <h3 style={{ fontSize: 15, fontWeight: 800, color: "#1f2a26", margin: 0 }}>Vérification en 2 étapes</h3>
      </div>
      <p style={{ fontSize: 12.5, color: "#4a5a52", margin: "0 0 14px" }}>
        Optionnel — un code par email à chaque connexion, pour mieux protéger votre compte et votre historique.
      </p>

      {enabled === null ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#2f9e6e" }} /> : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, fontWeight: 800, fontSize: 14, color: enabled ? "#2f9e6e" : "#8a978f" }}>
            {enabled ? <><CheckCircle2 className="w-4 h-4" /> Activée</> : <><Lock className="w-4 h-4" /> Désactivée</>}
          </div>

          {step === "idle" && (enabled ? (
            <button onClick={() => setStep("disable")} style={{ ...soft, width: "100%", padding: "11px", borderRadius: 12, fontWeight: 800, fontSize: 13, color: "#d64550", cursor: "pointer" }}>Désactiver</button>
          ) : (
            <button onClick={request} disabled={busy} style={{ width: "100%", padding: "11px", borderRadius: 12, background: "#2f9e6e", color: "#fff", fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", opacity: busy ? .6 : 1 }}>
              {busy ? "…" : "Activer la 2FA par email"}
            </button>
          ))}

          {step === "confirm" && (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ fontSize: 12, color: "#4a5a52" }}>Code envoyé à {hint} :</p>
              <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} maxLength={6} inputMode="numeric" placeholder="000000" style={{ ...soft, padding: "11px", borderRadius: 12, textAlign: "center", fontWeight: 800, letterSpacing: 6, fontSize: 18, color: "#1f2a26" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={confirm} disabled={busy || code.length < 6} style={{ flex: 1, padding: "11px", borderRadius: 12, background: "#2f9e6e", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer", opacity: busy || code.length < 6 ? .5 : 1 }}>Confirmer</button>
                <button onClick={() => { setStep("idle"); setCode(""); }} style={{ ...soft, padding: "11px 16px", borderRadius: 12, fontWeight: 800, color: "#4a5a52", cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}
          {step === "disable" && (
            <div style={{ display: "grid", gap: 8 }}>
              <p style={{ fontSize: 12, color: "#4a5a52" }}>Confirmez avec votre mot de passe :</p>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="Mot de passe" style={{ ...soft, padding: "11px", borderRadius: 12, fontSize: 14, color: "#1f2a26" }} />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={disable} disabled={busy || !pwd} style={{ flex: 1, padding: "11px", borderRadius: 12, background: "#d64550", color: "#fff", fontWeight: 800, border: "none", cursor: "pointer", opacity: busy || !pwd ? .5 : 1 }}>Désactiver</button>
                <button onClick={() => { setStep("idle"); setPwd(""); }} style={{ ...soft, padding: "11px 16px", borderRadius: 12, fontWeight: 800, color: "#4a5a52", cursor: "pointer" }}>Annuler</button>
              </div>
            </div>
          )}

          {newCodes.length > 0 && (
            <div style={{ marginTop: 12, background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: "#92400E", margin: "0 0 8px" }}>🔑 Notez ces codes — ils ne seront plus affichés</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontFamily: "monospace" }}>
                {newCodes.map((c, i) => <div key={i} style={{ background: "#fff", border: "1px solid #FDE68A", borderRadius: 7, padding: "6px", textAlign: "center", fontWeight: 700, letterSpacing: 1, color: "#1f2a26" }}>{c}</div>)}
              </div>
              <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                <button onClick={() => { navigator.clipboard.writeText(newCodes.join("\n")); toast({ title: "Copié" }); }} style={{ fontSize: 12, fontWeight: 800, color: "#0369A1", background: "none", border: "none", cursor: "pointer" }}>Copier</button>
                <button onClick={() => setNewCodes([])} style={{ fontSize: 12, fontWeight: 800, color: "#92400E", background: "none", border: "none", cursor: "pointer" }}>J'ai noté</button>
              </div>
            </div>
          )}

          {enabled && newCodes.length === 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 11 }}>
              <span style={{ color: remaining !== null && remaining <= 2 ? "#d64550" : "#8a978f" }}>Codes de secours : <strong>{remaining ?? "…"}</strong></span>
              <button onClick={regen} disabled={busy} style={{ fontSize: 11, fontWeight: 800, color: "#0369A1", background: "none", border: "none", cursor: "pointer" }}>Régénérer</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
