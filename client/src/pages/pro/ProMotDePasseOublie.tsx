import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, KeyRound, Stethoscope, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DS = {
  bg: "#F6FAFD",
  surface: "#FFFFFF",
  violet: "#7c3aed",
  violetMid: "#0369A1",
  textPrimary: "#0F172A",
  textBody: "#475569",
  textMuted: "#64748B",
  inputBorder: "rgba(167,139,250,0.2)",
  cardBorder: "#E2E8F0",
  cardVioletBorder: "rgba(167,139,250,0.18)",
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
};

export default function ProMotDePasseOublie() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [contact, setContact] = useState("");
  const [maskedContact, setMaskedContact] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contact: contact.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      setMaskedContact(data.maskedContact || contact.trim());
      // Fallback : si pas de SMS, le backend renvoie le code directement
      setDevCode(data.code || null);
      if (data.code) setCode(data.code);
      setStep(2);
      toast({
        title: data.viaSms ? "Code envoyé par SMS" : "Code généré",
        description: data.viaSms ? `Vérifiez vos messages (${data.maskedContact}).` : "Saisissez le code affiché ci-dessous.",
      });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Mot de passe trop court", description: "8 caractères minimum.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: code.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      toast({ title: "Mot de passe réinitialisé ✅", description: "Connectez-vous avec votre nouveau mot de passe." });
      setLocation("/derm/connexion");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 12,
    background: DS.bg,
    border: `1px solid ${DS.inputBorder}`,
    color: DS.textPrimary,
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: DS.font,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: DS.bg, color: DS.textPrimary, fontFamily: DS.font }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${DS.cardBorder}`, background: DS.surface }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/derm/connexion" data-testid="link-back" style={{ padding: 8, borderRadius: 10, color: DS.textBody, display: "flex", alignItems: "center", textDecoration: "none" }}>
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "rgba(167,139,250,0.15)", border: `1px solid ${DS.cardVioletBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Stethoscope style={{ width: 16, height: 16, color: DS.violetMid }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: DS.textPrimary }}>
              GlowScan <span style={{ color: DS.violetMid }}>DERM</span>
            </span>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 16px" }}>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: "rgba(167,139,250,0.15)", border: `1px solid ${DS.cardVioletBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <KeyRound style={{ width: 22, height: 22, color: DS.violetMid }} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: DS.textPrimary, margin: "0 0 6px" }}>
              {step === 1 ? "Mot de passe oublié" : "Nouveau mot de passe"}
            </h1>
            <p style={{ fontSize: 14, color: DS.textBody, margin: 0 }}>
              {step === 1 ? "Recevez un code par SMS pour réinitialiser" : `Code envoyé à ${maskedContact}`}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={requestCode} style={{ background: DS.surface, border: `1px solid ${DS.cardBorder}`, borderRadius: 24, padding: "28px 24px" }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: DS.textBody, marginBottom: 8 }}>
                Email ou numéro de téléphone
              </label>
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                data-testid="input-contact"
                placeholder="cabinet@exemple.com ou 237 6XX…"
                style={inputStyle}
              />
              <button type="submit" disabled={loading} data-testid="button-request-code" style={btnStyle(loading)}>
                {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <>Recevoir le code <ArrowRight style={{ width: 16, height: 16 }} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={resetPassword} style={{ background: DS.surface, border: `1px solid ${DS.cardBorder}`, borderRadius: 24, padding: "28px 24px" }}>
              {devCode && (
                <div style={{ marginBottom: 16, padding: 12, borderRadius: 12, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <p style={{ fontSize: 11, color: "#fbbf24", margin: 0 }}>
                    SMS indisponible — votre code : <strong style={{ fontSize: 15 }}>{devCode}</strong>
                  </p>
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: DS.textBody, marginBottom: 8 }}>Code à 6 chiffres</label>
                <input type="text" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} required data-testid="input-code" placeholder="123456" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: DS.textBody, marginBottom: 8 }}>Nouveau mot de passe</label>
                <div style={{ position: "relative" }}>
                  <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} data-testid="input-new-password" placeholder="Min. 8 caractères" style={{ ...inputStyle, paddingRight: 42 }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label="Afficher/masquer" style={eyeStyle}>
                    {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: DS.textBody, marginBottom: 8 }}>Confirmer le mot de passe</label>
                <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required data-testid="input-confirm-password" placeholder="Retapez le mot de passe" style={inputStyle} />
              </div>
              <button type="submit" disabled={loading} data-testid="button-reset-password" style={btnStyle(loading)}>
                {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <><CheckCircle2 style={{ width: 16, height: 16 }} /> Réinitialiser</>}
              </button>
            </form>
          )}

          <p style={{ textAlign: "center", fontSize: 13, color: DS.textMuted, marginTop: 16 }}>
            <Link href="/derm/connexion" style={{ color: DS.violetMid, fontWeight: 700, textDecoration: "none" }}>
              Retour à la connexion
            </Link>
          </p>
        </motion.div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #94A3B8; }
      `}</style>
    </div>
  );
}

function btnStyle(loading: boolean): React.CSSProperties {
  return {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: "13px 24px", borderRadius: 9999, background: "#7c3aed", color: "#fff",
    fontWeight: 800, fontSize: 14, border: "none", cursor: loading ? "not-allowed" : "pointer",
    opacity: loading ? 0.6 : 1, marginTop: 4,
    fontFamily: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
  };
}

const eyeStyle: React.CSSProperties = {
  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
  background: "none", border: "none", cursor: "pointer", color: "#94A3B8",
  display: "flex", alignItems: "center", padding: 4,
};
