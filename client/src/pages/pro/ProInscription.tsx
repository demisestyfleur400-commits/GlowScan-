import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

// Doit rester synchronisé avec DERM_TERMS_VERSION dans DermConditions.tsx
const DERM_TERMS_VERSION = "v1-2026-07";

// Palette dédiée (brief) : blanc + bleu #0891B2, CTA violet #7C3AED.
const C = {
  bg: "#FFFFFF",
  blue: "#0891B2",
  violet: "#7C3AED",
  ink: "#0F0A1E",
  body: "#475569",
  muted: "#8A93A5",
  border: "#E4E9F0",
  soft: "#F5F8FB",
  red: "#E11D48",
  green: "#10B981",
  font: `-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif`,
};
const WA = "237674377959";

export default function ProInscription() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [city, setCity] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; city?: string; consent?: string }>({});
  const [success, setSuccess] = useState(false);

  // 2FA email obligatoire après inscription
  const [twofa, setTwofa] = useState(false);
  const [code, setCode] = useState("");
  const [emailHint, setEmailHint] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [codesSaved, setCodesSaved] = useState(false);

  // Force du mot de passe — on N'AFFICHE que si FAIBLE (brief).
  const pwWeak = password.length > 0 && (password.length < 8 || (!/[A-Za-z]/.test(password) || !/\d/.test(password)) && password.length < 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!email.includes("@")) errs.email = "Entrez un email valide.";
    if (password.length < 8) errs.password = "Au moins 8 caractères.";
    if (!city.trim()) errs.city = "Indiquez votre ville.";
    if (!consent) errs.consent = "Vous devez accepter les conditions.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/pro/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          city: city.trim() || null,
          consent: true,
          consentVersion: DERM_TERMS_VERSION,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur lors de l'inscription");
      if (data.requires2fa) {
        setEmailHint(data.emailHint || email);
        setBackupCodes(Array.isArray(data.backupCodes) ? data.backupCodes : []);
        setTwofa(true);
        toast({ title: "Vérifiez votre email 📧", description: data.devFallback ? "Mode dev : code dans les logs serveur." : `Code envoyé à ${data.emailHint || email}.` });
        return;
      }
      finishSuccess();
    } catch (err: any) {
      const msg = String(err?.message || "");
      if (/déjà|exist/i.test(msg)) setErrors({ email: "Cet email a déjà un compte. Connectez-vous." });
      else toast({ title: "Erreur", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const finishSuccess = async () => {
    await qc.invalidateQueries({ queryKey: ["/api/pro/account"] });
    await qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    setSuccess(true);
    setTimeout(() => setLocation("/derm/dashboard"), 1000);
  };

  const verify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/pro/login/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Code incorrect");
      finishSuccess();
    } catch (err: any) {
      toast({ title: "Vérification échouée", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  };
  const resend2fa = async () => {
    try {
      const res = await fetch("/api/pro/login/2fa/resend", { method: "POST", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Nouveau code envoyé", description: data.devFallback ? "Voir les logs." : `Envoyé à ${data.emailHint || email}.` });
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
  };

  // ── styles ──
  const label: React.CSSProperties = { display: "block", fontSize: 12.5, fontWeight: 700, color: C.ink, marginBottom: 6 };
  const inputBase: React.CSSProperties = { width: "100%", padding: "13px 14px", borderRadius: 12, background: C.soft, border: `1px solid ${C.border}`, color: C.ink, fontSize: 15, outline: "none", fontFamily: C.font };
  const errStyle = (f: keyof typeof errors): React.CSSProperties => errors[f] ? { border: `1px solid ${C.red}`, background: "#FFF5F6" } : {};
  const errText = (f: keyof typeof errors) => errors[f] ? <p style={{ color: C.red, fontSize: 11.5, margin: "5px 2px 0", fontWeight: 600 }}>{errors[f]}</p> : null;
  const microGray: React.CSSProperties = { fontSize: 11, color: C.muted, textAlign: "center", lineHeight: 1.5, margin: 0 };

  return (
    <div style={{ minHeight: "100svh", background: C.bg, color: C.ink, fontFamily: C.font, display: "flex", flexDirection: "column" }}>
      <main style={{ flex: 1, width: "100%", maxWidth: 420, margin: "0 auto", padding: "22px 20px 28px", display: "flex", flexDirection: "column" }}>

        {/* HEADER */}
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
          <span style={{ fontSize: 18, color: C.blue }}>✦</span>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-.01em", color: C.ink }}>GlowScan <span style={{ color: C.blue }}>DERM</span></span>
        </div>

        {/* ── SUCCÈS ── */}
        <AnimatePresence>
          {success && (
            <motion.div key="ok" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", damping: 12 }}
                style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(16,185,129,.12)", border: `2px solid ${C.green}`, display: "grid", placeItems: "center" }}>
                <CheckCircle2 style={{ width: 34, height: 34, color: C.green }} />
              </motion.div>
              <p style={{ fontWeight: 800, fontSize: 17, color: C.ink }}>Compte créé 🎉</p>
              <p style={{ ...microGray, fontSize: 13 }}>Ouverture de votre tableau de bord…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ÉTAPE 2FA ── */}
        {!success && twofa && (
          <form onSubmit={verify2fa} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <ShieldCheck style={{ width: 18, height: 18, color: C.blue }} />
              <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: C.ink }}>Vérifiez votre email</h1>
            </div>
            <p style={{ fontSize: 13, color: C.body, margin: "0 0 16px" }}>
              Un code à 6 chiffres a été envoyé à <strong style={{ color: C.ink }}>{emailHint}</strong>. Il sécurise votre compte et sera demandé à chaque connexion.
            </p>

            {backupCodes.length > 0 && (
              <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12, padding: 13, marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: "#92400E", margin: "0 0 4px" }}>🔑 Vos codes de secours — notez-les maintenant</p>
                <p style={{ fontSize: 11, color: "#92400E", margin: "0 0 9px" }}>Si vous perdez l'accès à votre email, un de ces codes vous connecte. Ils ne seront plus jamais affichés.</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontFamily: "monospace", marginBottom: 9 }}>
                  {backupCodes.map((c, i) => <div key={i} style={{ background: "#fff", border: "1px solid #FDE68A", borderRadius: 7, padding: "6px", fontSize: 13, fontWeight: 700, letterSpacing: 1, textAlign: "center", color: C.ink }}>{c}</div>)}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button type="button" onClick={() => { navigator.clipboard.writeText(backupCodes.join("\n")); toast({ title: "Codes copiés" }); }} style={{ fontSize: 12, fontWeight: 700, color: C.blue, background: "none", border: "none", cursor: "pointer" }}>Copier</button>
                  <label style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#92400E", cursor: "pointer" }}>
                    <input type="checkbox" checked={codesSaved} onChange={(e) => setCodesSaved(e.target.checked)} /> Je les ai notés
                  </label>
                </div>
              </div>
            )}

            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000"
              style={{ ...inputBase, textAlign: "center", fontSize: 26, fontWeight: 800, letterSpacing: 8, marginBottom: 14 }} data-testid="input-signup-2fa" />
            <button type="submit" disabled={loading || code.length < 6 || (backupCodes.length > 0 && !codesSaved)}
              style={ctaStyle(loading || code.length < 6 || (backupCodes.length > 0 && !codesSaved))} data-testid="button-verify-signup-2fa">
              {loading ? <Loader2 style={{ width: 18, height: 18, animation: "gs-spin 1s linear infinite" }} /> : <>Vérifier et continuer <ArrowRight style={{ width: 17, height: 17 }} /></>}
            </button>
            <button type="button" onClick={resend2fa} style={{ background: "none", border: "none", color: C.blue, fontWeight: 700, fontSize: 12.5, cursor: "pointer", marginTop: 14 }}>Je n'ai rien reçu — renvoyer le code</button>
          </form>
        )}

        {/* ── FORMULAIRE (3 champs) ── */}
        {!success && !twofa && (
          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column" }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 6px", color: C.ink }}>Commencez en 2 minutes</h1>
            <p style={{ fontSize: 13.5, color: C.body, margin: "0 0 5px", fontWeight: 600 }}>14 jours gratuits · Sans carte bancaire · 10 000 FCFA/mois ensuite</p>
            <p style={{ ...microGray, fontSize: 12, marginBottom: 20 }}>Conçu pour fonctionner avec WhatsApp, Mobile Money et une connexion 3G. Sans paperasse.</p>

            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={label} htmlFor="reg-email">Email professionnel</label>
              <input id="reg-email" type="email" inputMode="email" autoComplete="email" autoFocus
                value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                placeholder="cabinet@exemple.com" style={{ ...inputBase, ...errStyle("email") }} data-testid="input-email" />
              {errText("email")}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 14 }}>
              <label style={label} htmlFor="reg-pwd">Mot de passe</label>
              <div style={{ position: "relative" }}>
                <input id="reg-pwd" type={showPwd ? "text" : "password"} autoComplete="new-password"
                  value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors({ ...errors, password: undefined }); }}
                  placeholder="Au moins 8 caractères" style={{ ...inputBase, paddingRight: 44, ...errStyle("password") }} data-testid="input-password" />
                <button type="button" onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? "Masquer" : "Afficher"}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 4 }}>
                  {showPwd ? <EyeOff style={{ width: 18, height: 18 }} /> : <Eye style={{ width: 18, height: 18 }} />}
                </button>
              </div>
              {errText("password")}
              {!errors.password && pwWeak && <p style={{ color: C.red, fontSize: 11.5, margin: "5px 2px 0", fontWeight: 600 }}>Mot de passe faible — allongez-le ou variez les caractères.</p>}
            </div>

            {/* Ville */}
            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="reg-city">Ville</label>
              <input id="reg-city" type="text" autoComplete="address-level2"
                value={city} onChange={(e) => { setCity(e.target.value); if (errors.city) setErrors({ ...errors, city: undefined }); }}
                placeholder="Douala, Yaoundé, Cotonou..." style={{ ...inputBase, ...errStyle("city") }} data-testid="input-city" />
              {errText("city")}
            </div>

            {/* Consent */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer", marginBottom: 4 }}>
              <input type="checkbox" checked={consent} onChange={(e) => { setConsent(e.target.checked); if (errors.consent) setErrors({ ...errors, consent: undefined }); }}
                style={{ width: 18, height: 18, marginTop: 1, accentColor: C.violet, flexShrink: 0 }} data-testid="checkbox-consent" />
              <span style={{ fontSize: 12.5, color: C.body, lineHeight: 1.45 }}>
                J'accepte les <Link href="/derm/conditions" style={{ color: C.blue, fontWeight: 700 }}>conditions d'utilisation</Link> et la politique de confidentialité.
              </span>
            </label>
            {errText("consent")}

            {/* Preuve sociale + garantie */}
            <p style={{ ...microGray, marginTop: 16 }}>Rejoignez 4 dermatologues actifs au Cameroun, Bénin et RDC 🇨🇲🇧🇯🇨🇩</p>
            <p style={{ ...microGray, marginTop: 6, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
              <CheckCircle2 style={{ width: 12, height: 12, color: C.green }} /> Annulez à tout moment. Aucun prélèvement automatique.
            </p>

            {/* CTA */}
            <button type="submit" disabled={loading} style={ctaStyle(loading)} data-testid="button-submit-register">
              {loading ? <Loader2 style={{ width: 18, height: 18, animation: "gs-spin 1s linear infinite" }} /> : <>Démarrer mon essai gratuit <ArrowRight style={{ width: 17, height: 17 }} /></>}
            </button>

            {/* Support + connexion */}
            <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer" style={{ ...microGray, marginTop: 14, textDecoration: "none" }}>
              Une question ? WhatsApp : +237 674 377 959
            </a>
            <p style={{ fontSize: 12.5, color: C.body, textAlign: "center", marginTop: 12 }}>
              Déjà inscrit ? <Link href="/derm/connexion" style={{ color: C.violet, fontWeight: 700 }} data-testid="link-login">Se connecter</Link>
            </p>
          </form>
        )}
      </main>
      <style>{`@keyframes gs-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  function ctaStyle(disabled: boolean): React.CSSProperties {
    return {
      width: "100%", height: 52, borderRadius: 12, border: "none",
      background: C.violet, color: "#fff", fontWeight: 800, fontSize: 15, fontFamily: C.font,
      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
      cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1,
      transition: "opacity .15s", boxShadow: "0 6px 18px rgba(124,58,237,.28)",
    };
  }
}
