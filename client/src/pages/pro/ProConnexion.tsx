import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, LogIn, Stethoscope, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const DS = {
  bg: "#F6FAFD",
  surface: "#FFFFFF",
  violet: "#7c3aed",
  violetMid: "#0369A1",
  violetLight: "#0891B2",
  textPrimary: "#0F172A",
  textBody: "#475569",
  textMuted: "#64748B",
  inputBorder: "rgba(167,139,250,0.2)",
  cardBorder: "#E2E8F0",
  cardVioletBorder: "rgba(167,139,250,0.18)",
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
};

export default function ProConnexion() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // ── 2FA email ──
  const [twofa, setTwofa] = useState(false);
  const [code, setCode] = useState("");
  const [emailHint, setEmailHint] = useState("");

  const goAfterLogin = async (role?: string) => {
    await qc.invalidateQueries({ queryKey: ["/api/pro/account"] });
    await qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    setLocation(role === "secretary" ? "/derm/patients" : "/derm/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/pro/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur");
      // Étape 2FA requise : on n'est pas encore connecté.
      if (data.requires2fa) {
        setEmailHint(data.emailHint || email);
        setTwofa(true);
        toast({
          title: "Code envoyé 📧",
          description: data.devFallback
            ? "Mode dev : le code est dans les logs serveur (RESEND_API_KEY absente)."
            : `Entrez le code reçu sur ${data.emailHint || "votre email"}.`,
        });
        return;
      }
      await goAfterLogin(data.role);
    } catch (err: any) {
      toast({ title: "Connexion échouée", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/pro/login/2fa", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Code incorrect");
      await goAfterLogin(data.role);
    } catch (err: any) {
      toast({ title: "Vérification échouée", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const resend2fa = async () => {
    try {
      const res = await fetch("/api/pro/login/2fa/resend", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Nouveau code envoyé", description: data.devFallback ? "Mode dev : voir les logs serveur." : `Envoyé sur ${data.emailHint || "votre email"}.` });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: DS.bg,
        color: DS.textPrimary,
        fontFamily: DS.font,
      }}
    >
      {/* Header */}
      <header
        style={{
          borderBottom: `1px solid ${DS.cardBorder}`,
          background: DS.surface,
        }}
      >
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Link
            href="/derm"
            data-testid="link-back"
            style={{
              padding: 8,
              borderRadius: 10,
              color: DS.textBody,
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              transition: "background 0.15s",
            }}
          >
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: `rgba(167,139,250,0.15)`,
                border: `1px solid ${DS.cardVioletBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Stethoscope style={{ width: 16, height: 16, color: DS.violetMid }} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: DS.textPrimary }}>
              GlowScan <span style={{ color: DS.violetMid }}>DERM</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 16px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ width: "100%", maxWidth: 380 }}
        >
          {/* Icon + title */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: `rgba(167,139,250,0.15)`,
                border: `1px solid ${DS.cardVioletBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <LogIn style={{ width: 22, height: 22, color: DS.violetMid }} />
            </div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: DS.textPrimary,
                margin: "0 0 6px",
              }}
            >
              Connexion DERM
            </h1>
            <p style={{ fontSize: 14, color: DS.textBody, margin: 0 }}>
              Accédez à votre cabinet GlowScan
            </p>
          </div>

          {/* Étape 2FA — code email */}
          {twofa && (
            <form onSubmit={handleVerify2fa}
              style={{ background: DS.surface, border: `1px solid ${DS.cardBorder}`, borderRadius: 24, padding: "28px 24px" }}>
              <p style={{ fontSize: 15, fontWeight: 800, color: DS.textPrimary, margin: "0 0 6px" }}>Vérification en 2 étapes</p>
              <p style={{ fontSize: 13, color: DS.textBody, margin: "0 0 18px" }}>
                Nous avons envoyé un code à 6 chiffres à <strong style={{ color: DS.textPrimary }}>{emailHint}</strong>.
              </p>
              <input
                type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000" data-testid="input-2fa-code"
                style={{ width: "100%", padding: "13px 14px", borderRadius: 12, background: DS.bg, border: `1px solid ${DS.inputBorder}`,
                  color: DS.textPrimary, fontSize: 24, fontWeight: 800, letterSpacing: 8, textAlign: "center", marginBottom: 16 }}
              />
              <button type="submit" disabled={loading || code.length < 6} data-testid="button-verify-2fa"
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 24px",
                  borderRadius: 9999, background: DS.violet, color: "#fff", fontWeight: 800, fontSize: 14, border: "none",
                  cursor: loading || code.length < 6 ? "not-allowed" : "pointer", opacity: loading || code.length < 6 ? 0.6 : 1, fontFamily: DS.font }}>
                {loading ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <>Vérifier <ArrowRight style={{ width: 16, height: 16 }} /></>}
              </button>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                <button type="button" onClick={() => { setTwofa(false); setCode(""); }}
                  style={{ background: "none", border: "none", fontSize: 13, color: DS.textMuted, fontWeight: 700, cursor: "pointer" }}>
                  ← Retour
                </button>
                <button type="button" onClick={resend2fa}
                  style={{ background: "none", border: "none", fontSize: 13, color: DS.violetMid, fontWeight: 700, cursor: "pointer" }} data-testid="button-resend-2fa">
                  Renvoyer le code
                </button>
              </div>
            </form>
          )}

          {/* Form card */}
          {!twofa && (
          <form
            onSubmit={handleSubmit}
            style={{
              background: DS.surface,
              border: `1px solid ${DS.cardBorder}`,
              borderRadius: 24,
              padding: "28px 24px",
            }}
          >
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: DS.textBody,
                  marginBottom: 8,
                  letterSpacing: "0.02em",
                }}
              >
                Email professionnel
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
                style={{
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
                }}
                onFocus={(e) => (e.target.style.borderColor = DS.violetMid)}
                onBlur={(e) => (e.target.style.borderColor = DS.inputBorder)}
              />
            </div>

            <div style={{ marginBottom: 8 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  color: DS.textBody,
                  marginBottom: 8,
                  letterSpacing: "0.02em",
                }}
              >
                Mot de passe
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  data-testid="input-password"
                  style={{
                    width: "100%",
                    padding: "11px 42px 11px 14px",
                    borderRadius: 12,
                    background: DS.bg,
                    border: `1px solid ${DS.inputBorder}`,
                    color: DS.textPrimary,
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                    fontFamily: DS.font,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = DS.violetMid)}
                  onBlur={(e) => (e.target.style.borderColor = DS.inputBorder)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  data-testid="button-toggle-password"
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: DS.textMuted, display: "flex", alignItems: "center", padding: 4 }}
                >
                  {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right", marginBottom: 20 }}>
              <Link
                href="/derm/mot-de-passe-oublie"
                data-testid="link-forgot-password"
                style={{ fontSize: 12, color: DS.violetMid, fontWeight: 700, textDecoration: "none" }}
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="button-submit-login"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "13px 24px",
                borderRadius: 9999,
                background: DS.violet,
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                fontFamily: DS.font,
                transition: "opacity 0.15s",
              }}
            >
              {loading ? (
                <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
              ) : (
                <>
                  Se connecter
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </>
              )}
            </button>

            <p
              style={{
                textAlign: "center",
                fontSize: 13,
                color: DS.textMuted,
                marginTop: 16,
              }}
            >
              Pas encore de compte ?{" "}
              <Link
                href="/derm/inscription"
                data-testid="link-register"
                style={{ color: DS.violetMid, fontWeight: 700, textDecoration: "none" }}
              >
                Créer mon compte DERM
              </Link>
            </p>
          </form>
          )}
        </motion.div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #94A3B8; }
      `}</style>
    </div>
  );
}
