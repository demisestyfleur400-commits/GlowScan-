import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Stethoscope, ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Doit rester synchronisé avec DERM_TERMS_VERSION dans DermConditions.tsx
const DERM_TERMS_VERSION = "v1-2026-07";

const DS = {
  bg: "#0d0a0e",
  surface: "#13101f",
  violet: "#7c3aed",
  violetMid: "#a78bfa",
  violetLight: "#c4b5fd",
  textPrimary: "#f3f0ff",
  textBody: "rgba(200,185,255,0.75)",
  textMuted: "rgba(255,255,255,0.6)",
  inputBorder: "rgba(167,139,250,0.2)",
  cardBorder: "rgba(255,255,255,0.07)",
  cardVioletBg: "rgba(167,139,250,0.06)",
  cardVioletBorder: "rgba(167,139,250,0.18)",
  subtleBg: "rgba(255,255,255,0.04)",
  subtleBorder: "rgba(255,255,255,0.07)",
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
};

export default function ProInscription() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cabinetName, setCabinetName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Cameroun");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Force du mot de passe : longueur + variété de caractères
  const pwStrength = (() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { level: 1, label: "Faible", color: "#f43f5e" };
    if (score <= 3) return { level: 2, label: "Moyen", color: "#fbbf24" };
    return { level: 3, label: "Fort", color: "#10b981" };
  })();
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast({ title: "Mot de passe trop court", description: "8 caractères minimum pour des données médicales.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    if (!consent) {
      toast({ title: "Consentement requis", description: "Cochez la case RGPD pour continuer.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/pro/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullName,
          email,
          password,
          cabinetName: cabinetName || null,
          phone: phone || null,
          city: city || null,
          country: country || null,
          licenseNumber: licenseNumber || null,
          consent: true,
          consentVersion: DERM_TERMS_VERSION,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur lors de l'inscription");
      toast({ title: `Bienvenue Dr ${fullName} 👋`, description: "14 jours d'essai gratuit — découvrons GlowScan DERM ensemble." });
      await qc.invalidateQueries({ queryKey: ["/api/pro/account"] });
      await qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/derm/onboarding"); // → flow 3 étapes
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
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
                background: "rgba(167,139,250,0.15)",
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
      <main style={{ flex: 1, padding: "32px 16px" }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ maxWidth: 440, margin: "0 auto" }}
        >
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 16,
                background: "rgba(167,139,250,0.15)",
                border: `1px solid ${DS.cardVioletBorder}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Stethoscope style={{ width: 22, height: 22, color: DS.violetMid }} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: DS.textPrimary, margin: "0 0 6px" }}>
              Créer mon compte DERM
            </h1>
            <p style={{ fontSize: 14, color: DS.textBody, margin: 0 }}>
              14 jours d'essai gratuit · sans carte bancaire · 30 000 FCFA/mois ensuite
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              background: DS.surface,
              border: `1px solid ${DS.cardBorder}`,
              borderRadius: 24,
              padding: "28px 24px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Field label="Nom complet *" placeholder="Dr Marie Mbarga" value={fullName} onChange={setFullName} required testid="input-fullname" />
              <Field label="Email professionnel *" type="email" placeholder="cabinet@exemple.com" value={email} onChange={setEmail} required testid="input-email" />
              <div>
                <Field label="Mot de passe *" type="password" placeholder="Min. 8 caractères" value={password} onChange={setPassword} required minLength={8} testid="input-password" />
                {password.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[1, 2, 3].map((i) => (
                        <div key={i} style={{ flex: 1, height: 4, borderRadius: 9999, background: i <= pwStrength.level ? pwStrength.color : "rgba(255,255,255,0.1)", transition: "background 0.2s" }} />
                      ))}
                    </div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: pwStrength.color, marginTop: 4 }}>Force : {pwStrength.label}</p>
                  </div>
                )}
              </div>
              <div>
                <Field label="Confirmer le mot de passe *" type="password" placeholder="Retapez le mot de passe" value={confirmPassword} onChange={setConfirmPassword} required minLength={8} testid="input-confirm-password" />
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#f43f5e", marginTop: 6 }}>Les mots de passe ne correspondent pas</p>
                )}
              </div>
            </div>

            {/* Cabinet section */}
            <div
              style={{
                margin: "20px 0",
                padding: "16px",
                borderRadius: 16,
                background: DS.subtleBg,
                border: `1px solid ${DS.subtleBorder}`,
              }}
            >
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: DS.textMuted,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                Cabinet (optionnel)
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Nom du cabinet" placeholder="Cabinet Bonanjo" value={cabinetName} onChange={setCabinetName} testid="input-cabinet" />
                <Field label="Téléphone WhatsApp" placeholder="237 6XX XX XX XX" value={phone} onChange={setPhone} testid="input-phone" />
                <Field label="Ville" placeholder="Douala" value={city} onChange={setCity} testid="input-city" />
                <Field label="Pays" placeholder="Cameroun" value={country} onChange={setCountry} testid="input-country" />
                <Field label="Numéro d'ordre (ONMC)" placeholder="Ex : ONMC-2024-XXXX" value={licenseNumber} onChange={setLicenseNumber} testid="input-license" />
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "8px 10px", borderRadius: 10, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <ShieldCheck style={{ width: 13, height: 13, color: "#6ee7b7", marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: "#6ee7b7", lineHeight: 1.5 }}>
                    Votre statut de professionnel de santé sera vérifié sous 24 h. Cela renforce la confiance de vos patients.
                  </span>
                </div>
              </div>
            </div>

            {/* RGPD consent */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: 14,
                borderRadius: 12,
                background: "rgba(167,139,250,0.06)",
                border: `1px solid rgba(167,139,250,0.18)`,
                cursor: "pointer",
                marginBottom: 20,
              }}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                style={{ marginTop: 2, width: 16, height: 16, accentColor: DS.violet, flexShrink: 0 }}
                data-testid="checkbox-consent"
              />
              <span style={{ fontSize: 12, color: DS.textBody, lineHeight: 1.6 }}>
                <ShieldCheck
                  style={{ display: "inline", width: 13, height: 13, marginRight: 4, color: DS.violetMid, verticalAlign: "middle" }}
                />
                J'ai lu et j'accepte les{" "}
                <a
                  href="/derm/conditions"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{ color: DS.violetMid, fontWeight: 700, textDecoration: "underline" }}
                >
                  Conditions d'utilisation & la Politique de confidentialité
                </a>{" "}
                de GlowScan DERM. En tant que responsable du traitement de mes patients, je m'engage à recueillir leur consentement pour l'analyse et la réutilisation anonymisée de leurs données.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !fullName || !email || password.length < 8 || !passwordsMatch || !consent}
              data-testid="button-submit-register"
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
                cursor: loading || !fullName || !email || password.length < 8 || !passwordsMatch || !consent ? "not-allowed" : "pointer",
                opacity: loading || !fullName || !email || password.length < 8 || !passwordsMatch || !consent ? 0.5 : 1,
                fontFamily: DS.font,
                transition: "opacity 0.15s",
              }}
            >
              {loading ? (
                <Loader2 style={{ width: 18, height: 18, animation: "spin 1s linear infinite" }} />
              ) : (
                <>
                  <CheckCircle2 style={{ width: 16, height: 16 }} />
                  Démarrer mon essai gratuit
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </>
              )}
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: DS.textMuted, marginTop: 14 }}>
              Déjà inscrit ?{" "}
              <Link
                href="/derm/connexion"
                data-testid="link-login"
                style={{ color: DS.violetMid, fontWeight: 700, textDecoration: "none" }}
              >
                Se connecter
              </Link>
            </p>
          </form>
        </motion.div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: rgba(200,185,255,0.3); }
      `}</style>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, required, minLength, testid,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string;
  placeholder?: string; required?: boolean; minLength?: number; testid?: string;
}) {
  const inputBorder = "rgba(167,139,250,0.2)";
  const violetMid = "#a78bfa";
  const isPassword = type === "password";
  const [reveal, setReveal] = useState(false);
  const effectiveType = isPassword && reveal ? "text" : type;
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          color: "rgba(200,185,255,0.65)",
          marginBottom: 7,
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          type={effectiveType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          data-testid={testid}
          style={{
            width: "100%",
            padding: isPassword ? "11px 42px 11px 14px" : "11px 14px",
            borderRadius: 12,
            background: "#0d0a0e",
            border: `1px solid ${inputBorder}`,
            color: "#f3f0ff",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
          }}
          onFocus={(e) => (e.target.style.borderColor = violetMid)}
          onBlur={(e) => (e.target.style.borderColor = inputBorder)}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal(!reveal)}
            aria-label={reveal ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            data-testid="button-toggle-password"
            style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center", padding: 4 }}
          >
            {reveal ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
          </button>
        )}
      </div>
    </div>
  );
}
