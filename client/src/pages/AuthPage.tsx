import { useState } from "react";
import { useLocation } from "wouter";
import { useSEO } from "@/hooks/useSEO";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Phone, ShieldAlert, Sparkles, MessageCircle, KeyRound, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Mode = "register" | "login" | "forgot" | "reset";

export default function AuthPage() {
  useSEO({
    title: "Connexion & Inscription | GlowScan",
    description: "Créez votre compte GlowScan gratuitement pour accéder à votre historique de scans, votre routine personnalisée et vos conseils beauté.",
    canonical: "https://glow-scan.com/auth",
    noIndex: true, // Pages auth pas indexées
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("register");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Register fields
  const [firstName, setFirstName] = useState("");
  const [contact, setContact] = useState("");
  const [regPwd, setRegPwd] = useState("");
  const [accountExistsHint, setAccountExistsHint] = useState(false);

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  // Forgot fields
  const [forgotContact, setForgotContact] = useState("");
  const [forgotResult, setForgotResult] = useState<{
    maskedContact: string;
    viaSms: boolean;
    code?: string;
  } | null>(null);

  // Reset fields
  const [resetCode, setResetCode] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [resetDone, setResetDone] = useState(false);

  // ── LOGIN ──────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const trimmed = loginEmail.trim();
      const isPhone = !trimmed.includes("@");
      const emailToSend = isPhone
        ? `tel-${trimmed.replace(/\D/g, "")}@phone.glowscan.cm`
        : trimmed.toLowerCase();
      await apiRequest("POST", "/api/auth/login", {
        email: emailToSend,
        password: loginPwd,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Email ou mot de passe incorrect",
        description: parseError(err) || "Vérifie tes identifiants et réessaie.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // ── REGISTER ──────────────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setAccountExistsHint(false);
    if (!firstName.trim()) {
      toast({ title: "Prénom requis", description: "Entre ton prénom pour continuer.", variant: "destructive" });
      return;
    }
    if (!contact.trim()) {
      toast({ title: "Email ou numéro requis", description: "Entre ton email ou ton numéro de téléphone.", variant: "destructive" });
      return;
    }
    if (regPwd.length < 6) {
      toast({ title: "Mot de passe trop court", description: "6 caractères minimum.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const trimmed = contact.trim();
      const isEmail = trimmed.includes("@");
      const emailToSend = isEmail
        ? trimmed.toLowerCase()
        : `tel-${trimmed.replace(/\D/g, "")}@phone.glowscan.cm`;

      await apiRequest("POST", "/api/auth/register", {
        firstName: firstName.trim(),
        email: emailToSend,
        password: regPwd,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      try {
        if (typeof (window as any).fbq === "function") {
          (window as any).fbq("track", "CompleteRegistration", { content_name: "GlowScan" });
        }
      } catch {}
      setLocation("/");
    } catch (err: any) {
      const msg = parseError(err) || "";
      // Compte déjà existant → guider vers connexion/reset
      if (msg.toLowerCase().includes("déjà") || msg.toLowerCase().includes("exist")) {
        setAccountExistsHint(true);
        // Pré-remplir le login avec le contact saisi
        setLoginEmail(contact);
      } else {
        toast({
          title: "Inscription impossible",
          description: msg || "Une erreur est survenue.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }

  // ── FORGOT ─────────────────────────────────────────────
  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotContact.trim()) return;
    setLoading(true);
    try {
      const data = await apiRequest("POST", "/api/auth/forgot-password", {
        contact: forgotContact.trim(),
      });
      const json = data as any;
      setForgotResult({
        maskedContact: json.maskedContact,
        phone: json.phone,
        resetCode: json.resetCode,
      });
    } catch (err: any) {
      toast({ title: "Erreur", description: parseError(err) || "Erreur serveur", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function goToReset() {
    setMode("reset");
  }

  // ── RESET ──────────────────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!resetCode.trim() || newPwd.length < 6) return;
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", {
        code: resetCode.trim(),
        newPassword: newPwd,
      });
      setResetDone(true);
    } catch (err: any) {
      toast({ title: "Erreur", description: parseError(err) || "Code invalide ou expiré.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // ── Helpers ────────────────────────────────────────────
  const goLogin = () => {
    setAccountExistsHint(false);
    setMode("login");
  };
  const goForgot = (prefill?: string) => {
    if (prefill) setForgotContact(prefill);
    setForgotResult(null);
    setMode("forgot");
  };

  return (
    <div
      className="min-h-screen w-full flex flex-col px-6 py-10 relative overflow-hidden"
      style={{
        background: "#fbfdfb",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        color: "#1f2a26",
      }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(47,158,110,0.15), transparent)" }} />
        <div className="absolute bottom-[-5%] right-[-10%] w-[300px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(47,158,110,0.10), transparent)" }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between relative z-10 mb-10 max-w-sm mx-auto w-full">
        <button
          onClick={() => mode === "register" || mode === "login" ? setLocation("/") : setMode("login")}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.07)", color: "#4a5a52" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="rounded-xl p-2" style={{ background: "#ffffff", border: "1px solid rgba(47,158,110,0.2)" }}>
          <img src="/logo-glowscan.jpeg" alt="GlowScan" className="h-7 w-auto object-contain" />
        </div>
        <div className="w-10 h-10" />
      </div>

      <AnimatePresence mode="wait">

        {/* ────── REGISTER ────── */}
        {mode === "register" && (
          <motion.form key="register" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            onSubmit={handleRegister}
            className="flex-1 flex flex-col justify-center relative z-10 space-y-4 max-w-sm mx-auto w-full"
          >
            <div className="text-center mb-2">
              <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 text-[10px] font-bold tracking-wide"
                style={{ background: "rgba(47,158,110,0.1)", border: "1px solid rgba(47,158,110,0.2)", color: "#c4b5fd" }}>
                <Sparkles className="w-3 h-3" />
                Gratuit · 30 secondes
              </div>
              <h1 className="text-2xl font-bold" style={{ color: "#1f2a26" }}>Crée ton profil peau</h1>
              <p className="text-xs font-medium mt-1" style={{ color: "#4a5a52" }}>
                Un compte pour sauvegarder toutes tes analyses
              </p>
            </div>

            <Field icon={<User className="w-4 h-4" />} type="text" placeholder="Ton prénom" value={firstName} onChange={setFirstName} testId="input-firstname" autoFocus />
            <Field icon={contact.includes("@") ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />} type="text" placeholder="Email ou numéro (+237...)" value={contact} onChange={setContact} testId="input-contact" />
            <PwdField value={regPwd} onChange={setRegPwd} show={showPwd} onToggle={() => setShowPwd(v => !v)} testId="input-register-password" placeholder="Mot de passe (6 caractères min)" />

            {/* Compte déjà existant */}
            {accountExistsHint && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl p-4 space-y-3"
                style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)" }}
              >
                <p className="text-xs font-bold" style={{ color: "#fbbf24" }}>
                  ⚠️ Ce compte existe déjà
                </p>
                <p className="text-[11px]" style={{ color: "#4a5a52" }}>
                  Un compte avec <strong>{contact}</strong> est déjà enregistré.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={goLogin}
                    className="flex-1 py-2.5 rounded-xl text-xs font-extrabold"
                    style={{ background: "#2f9e6e", color: "#fff" }}>
                    Se connecter
                  </button>
                  <button type="button" onClick={() => goForgot(contact)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-extrabold"
                    style={{ background: "rgba(0,0,0,0.07)", border: "1px solid rgba(0,0,0,0.1)", color: "#4a5a52" }}>
                    Mot de passe oublié ?
                  </button>
                </div>
              </motion.div>
            )}

            {!accountExistsHint && (
              <button type="submit" disabled={loading} data-testid="button-register-finish"
                className="w-full py-4 text-sm font-extrabold mt-2 transition-all active:scale-[0.98] disabled:opacity-50 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #2f9e6e, #f43f5e)", borderRadius: "14px", color: "#fff" }}>
                <div className="absolute top-0 left-0 right-0 h-1/2"
                  style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.1), transparent)", borderRadius: "14px 14px 0 0" }} />
                <span className="relative z-10">{loading ? "Création du compte..." : "Obtenir mon bilan gratuit →"}</span>
              </button>
            )}

            <p className="text-center text-[10px] font-medium" style={{ color: "rgba(0,0,0,0.25)" }}>
              Gratuit · Données privées · Sans engagement
            </p>
            <p className="text-center text-xs font-medium pt-1" style={{ color: "#4a5a52" }}>
              Déjà inscrit·e ?{" "}
              <button type="button" onClick={goLogin} className="font-bold" style={{ color: "#a78bfa" }}>
                Se connecter
              </button>
            </p>
          </motion.form>
        )}

        {/* ────── LOGIN ────── */}
        {mode === "login" && (
          <motion.form key="login" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            onSubmit={handleLogin}
            className="flex-1 flex flex-col justify-center relative z-10 space-y-4 max-w-sm mx-auto w-full"
          >
            <div className="text-center mb-2">
              <h1 className="text-2xl font-bold" style={{ color: "#1f2a26" }}>Connexion</h1>
              <p className="text-xs font-medium mt-1" style={{ color: "#4a5a52" }}>
                Retrouve ton historique de diagnostics
              </p>
            </div>

            <Field icon={loginEmail.includes("@") ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />} type="text" placeholder="Email ou numéro (+237...)" value={loginEmail} onChange={setLoginEmail} testId="input-login-email" autoFocus />
            <PwdField value={loginPwd} onChange={setLoginPwd} show={showPwd} onToggle={() => setShowPwd(v => !v)} testId="input-login-password" placeholder="Mot de passe" />

            {/* Mot de passe oublié */}
            <div className="flex justify-end -mt-1">
              <button type="button" onClick={() => goForgot(loginEmail)}
                className="text-[11px] font-semibold"
                style={{ color: "#a78bfa" }}>
                Mot de passe oublié ?
              </button>
            </div>

            <button type="submit" disabled={loading} data-testid="button-login-submit"
              className="w-full py-4 text-sm font-bold mt-1 transition-all active:scale-[0.98] disabled:opacity-50"
              style={{ background: "#2f9e6e", borderRadius: "14px", color: "#fff" }}>
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            <p className="text-center text-xs font-medium pt-1" style={{ color: "#4a5a52" }}>
              Première visite ?{" "}
              <button type="button" onClick={() => setMode("register")} className="font-bold" style={{ color: "#a78bfa" }}>
                Créer un profil gratuit
              </button>
            </p>
          </motion.form>
        )}

        {/* ────── FORGOT ────── */}
        {mode === "forgot" && (
          <motion.div key="forgot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col justify-center relative z-10 space-y-4 max-w-sm mx-auto w-full"
          >
            {!forgotResult ? (
              <form onSubmit={handleForgot} className="space-y-4">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)" }}>
                    <MessageCircle className="w-7 h-7" style={{ color: "#25d366" }} />
                  </div>
                  <h1 className="text-2xl font-bold" style={{ color: "#1f2a26" }}>Mot de passe oublié</h1>
                  <p className="text-xs font-medium mt-1" style={{ color: "#4a5a52" }}>
                    On t'envoie un code par SMS
                  </p>
                </div>

                <Field
                  icon={forgotContact.includes("@") ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  type="text"
                  placeholder="Ton email ou numéro (+237...)"
                  value={forgotContact}
                  onChange={setForgotContact}
                  testId="input-forgot-contact"
                  autoFocus
                />
                <button type="submit" disabled={loading || !forgotContact.trim()}
                  className="w-full py-4 text-sm font-extrabold transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #25d366, #128c7e)", borderRadius: "14px", color: "#fff" }}>
                  {loading ? "Envoi en cours..." : "Recevoir mon code par SMS →"}
                </button>
                <p className="text-center text-xs" style={{ color: "#4a5a52" }}>
                  <button type="button" onClick={goLogin} style={{ color: "#a78bfa" }}>← Retour à la connexion</button>
                </p>
              </form>
            ) : (
              /* Code généré (mode dev) ou SMS en attente Twilio */
              <div className="space-y-5">
                {forgotResult.viaSms ? (
                  /* SMS envoyé via Twilio (production) */
                  <>
                    <div className="text-center space-y-5">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                          style={{ background: "rgba(37,211,102,0.1)", border: "1px solid rgba(37,211,102,0.2)" }}>
                          <CheckCircle2 className="w-8 h-8" style={{ color: "#25d366" }} />
                        </div>
                        <h2 className="text-xl font-bold" style={{ color: "#1f2a26" }}>SMS envoyé ✅</h2>
                        <p className="text-xs mt-2" style={{ color: "#4a5a52" }}>
                          Un code a été envoyé à <strong>{forgotResult.maskedContact}</strong>
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: "#4a5a52" }}>
                          Valide 15 minutes — Vérifie tes SMS
                        </p>
                      </div>
                      <button onClick={() => setMode("reset")}
                        className="w-full py-4 text-sm font-extrabold"
                        style={{ background: "#2f9e6e", borderRadius: "14px", color: "#fff" }}>
                        J'ai reçu le code → Continuer →
                      </button>
                    </div>
                  </>
                ) : (
                  /* Mode dev/fallback : code affiché à l'écran */
                  <>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                        style={{ background: "rgba(47,158,110,0.1)", border: "1px solid rgba(47,158,110,0.2)" }}>
                        <KeyRound className="w-8 h-8" style={{ color: "#a78bfa" }} />
                      </div>
                      <h2 className="text-xl font-bold" style={{ color: "#1f2a26" }}>Ton code de réinitialisation</h2>
                      <p className="text-xs mt-1" style={{ color: "#4a5a52" }}>
                        Compte : <strong>{forgotResult.maskedContact}</strong>
                      </p>
                    </div>
                    <div className="rounded-2xl p-6 text-center"
                      style={{ background: "rgba(47,158,110,0.12)", border: "2px solid rgba(47,158,110,0.4)" }}>
                      <p className="text-xs font-bold mb-2" style={{ color: "#4a5a52" }}>📋 TON CODE À 6 CHIFFRES</p>
                      <p className="text-5xl font-black tracking-widest my-3" style={{ color: "#1f2a26", fontFamily: "monospace", letterSpacing: "8px" }}>
                        {forgotResult.code}
                      </p>
                      <p className="text-[11px]" style={{ color: "#4a5a52" }}>⏰ Valide 15 minutes</p>
                    </div>
                    <button onClick={() => {
                      if (forgotResult.code) {
                        setResetCode(forgotResult.code);
                        setMode("reset");
                      }
                    }}
                      disabled={!forgotResult.code}
                      className="w-full py-4 text-sm font-extrabold disabled:opacity-50"
                      style={{ background: "#2f9e6e", borderRadius: "14px", color: "#fff" }}>
                      ✅ J'ai noté le code →
                    </button>
                  </>
                )}
                <button onClick={() => { setForgotResult(null); setForgotContact(""); }}
                  className="w-full py-2 text-xs font-bold"
                  style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: "12px", color: "#4a5a52" }}>
                  Pas reçu? Renvoyer le code
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ────── RESET ────── */}
        {mode === "reset" && (
          <motion.div key="reset" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col justify-center relative z-10 space-y-4 max-w-sm mx-auto w-full"
          >
            {resetDone ? (
              <div className="text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
                  <CheckCircle2 className="w-8 h-8" style={{ color: "#10b981" }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: "#1f2a26" }}>Mot de passe mis à jour !</h2>
                  <p className="text-xs mt-1" style={{ color: "#4a5a52" }}>
                    Tu peux maintenant te connecter avec ton nouveau mot de passe.
                  </p>
                </div>
                <button onClick={goLogin}
                  className="w-full py-4 text-sm font-extrabold"
                  style={{ background: "#2f9e6e", borderRadius: "14px", color: "#fff" }}>
                  Se connecter →
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div className="text-center mb-2">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(47,158,110,0.1)", border: "1px solid rgba(47,158,110,0.2)" }}>
                    <KeyRound className="w-7 h-7" style={{ color: "#a78bfa" }} />
                  </div>
                  <h1 className="text-2xl font-bold" style={{ color: "#1f2a26" }}>Nouveau mot de passe</h1>
                  <p className="text-xs font-medium mt-1" style={{ color: "#4a5a52" }}>
                    Saisis le code reçu et choisis un nouveau mot de passe
                  </p>
                </div>

                <Field icon={<KeyRound className="w-4 h-4" />} type="text" placeholder="Code à 6 chiffres" value={resetCode} onChange={setResetCode} testId="input-reset-code" autoFocus />
                <PwdField value={newPwd} onChange={setNewPwd} show={showPwd} onToggle={() => setShowPwd(v => !v)} testId="input-new-password" placeholder="Nouveau mot de passe (6 min)" />

                <button type="submit" disabled={loading || resetCode.length < 6 || newPwd.length < 6}
                  className="w-full py-4 text-sm font-extrabold transition-all active:scale-[0.98] disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #2f9e6e, #5b21b6)", borderRadius: "14px", color: "#fff" }}>
                  {loading ? "Mise à jour..." : "Enregistrer le nouveau mot de passe →"}
                </button>

                <p className="text-center text-xs" style={{ color: "#4a5a52" }}>
                  Pas reçu le code ?{" "}
                  <button type="button" onClick={() => goForgot(forgotContact)} style={{ color: "#a78bfa" }}>Renvoyer</button>
                </p>
              </form>
            )}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Footer */}
      <div className="text-center mt-auto pt-8 relative z-10 flex justify-center items-center gap-1.5 text-[10px] font-medium"
        style={{ color: "rgba(0,0,0,0.25)" }}>
        <ShieldAlert className="w-3 h-3" style={{ color: "rgba(47,158,110,0.5)" }} />
        <span>Données chiffrées · Jamais revendues</span>
      </div>
    </div>
  );
}

// ── INTERNAL COMPONENTS ────────────────────────────────────────────────────
function Field({ icon, type, placeholder, value, onChange, testId, autoFocus }: {
  icon: React.ReactNode; type: string; placeholder: string;
  value: string; onChange: (v: string) => void; testId: string; autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(47,158,110,0.5)" }}>
        {icon}
      </div>
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus} data-testid={testId}
        className="w-full pl-11 pr-4 py-4 text-xs font-medium outline-none transition-all"
        style={{ background: "#ffffff", border: "1px solid rgba(47,158,110,0.2)", borderRadius: "12px", color: "#1f2a26" }}
        onFocus={e => (e.target.style.borderColor = "rgba(47,158,110,0.5)")}
        onBlur={e => (e.target.style.borderColor = "rgba(47,158,110,0.2)")}
      />
    </div>
  );
}

function PwdField({ value, onChange, show, onToggle, testId, placeholder, autoFocus }: {
  value: string; onChange: (v: string) => void; show: boolean;
  onToggle: () => void; testId: string; placeholder: string; autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(47,158,110,0.5)" }} />
      <input
        type={show ? "text" : "password"} placeholder={placeholder} value={value}
        onChange={e => onChange(e.target.value)}
        autoFocus={autoFocus} required data-testid={testId}
        className="w-full pl-11 pr-12 py-4 text-xs font-medium outline-none transition-all"
        style={{ background: "#ffffff", border: "1px solid rgba(47,158,110,0.2)", borderRadius: "12px", color: "#1f2a26" }}
        onFocus={e => (e.target.style.borderColor = "rgba(47,158,110,0.5)")}
        onBlur={e => (e.target.style.borderColor = "rgba(47,158,110,0.2)")}
      />
      <button type="button" onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: "rgba(47,158,110,0.5)" }}>
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function parseError(err: any): string | null {
  try {
    const raw = err?.message || "";
    const jsonPart = raw.replace(/^\d+:\s*/, "");
    const parsed = JSON.parse(jsonPart);
    return parsed?.message || (typeof parsed === "string" ? parsed : null);
  } catch {
    return null;
  }
}
