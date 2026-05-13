import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, ArrowRight, Phone, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Mode = "login" | "register";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  // Register progressive state
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState(""); // email OU téléphone
  const [regPwd, setRegPwd] = useState("");

  // ── LOGIN ──────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/login", {
        email: loginEmail.toLowerCase().trim(),
        password: loginPwd,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Connexion impossible",
        description: parseError(err) || "Email ou mot de passe incorrect",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // ── REGISTER (3 étapes) ────────────────────────────────
  function nextStep() {
    if (step === 1 && !firstName.trim()) {
      toast({ title: "Prénom requis", variant: "destructive" });
      return;
    }
    if (step === 2 && !contact.trim()) {
      toast({ title: "Email ou téléphone requis", variant: "destructive" });
      return;
    }
    setStep((s) => s + 1);
  }

  function prevStep() {
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (regPwd.length < 6) {
      toast({
        title: "Mot de passe trop court",
        description: "6 caractères minimum",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      // Détecter email vs téléphone
      const trimmed = contact.trim();
      const isEmail = trimmed.includes("@");
      const emailToSend = isEmail
        ? trimmed.toLowerCase()
        : `tel-${trimmed.replace(/\D/g, "")}@phone.glowscan.cm`;

      const fullName = lastName.trim()
        ? `${firstName.trim()} ${lastName.trim()}`
        : firstName.trim();

      await apiRequest("POST", "/api/auth/register", {
        firstName: fullName,
        email: emailToSend,
        password: regPwd,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: "Compte créé ✨",
        description: "Bienvenue sur GlowScan",
      });

      // Redirection vers l'accueil — l'onboarding s'y déclenche automatiquement
      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Inscription impossible",
        description: parseError(err) || "Erreur lors de l'inscription",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // ── UI ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen w-full bg-black text-white flex flex-col px-6 py-10 relative overflow-hidden">
      {/* Halo subtil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 60%)",
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between relative z-10 mb-8">
        <button
          onClick={() => (mode === "register" && step > 1 ? prevStep() : setLocation("/"))}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center active:scale-90 transition-all"
          data-testid="button-back-from-auth"
        >
          <ArrowLeft className="w-4 h-4 text-white" />
        </button>
        <div className="bg-white rounded-lg px-2 py-1 shadow-sm" data-testid="logo-glowscan">
          <img
            src="/logo-glowscan.jpeg"
            alt="GlowScan"
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="w-10 h-10" />
      </div>

      {/* Indicateur d'étape (register seulement) */}
      {mode === "register" && (
        <div className="flex justify-center gap-2 mb-10 relative z-10">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1 rounded-full transition-all duration-500 ${
                n === step ? "w-10 bg-white" : n < step ? "w-6 bg-white/60" : "w-6 bg-white/15"
              }`}
            />
          ))}
        </div>
      )}

      {/* ────── LOGIN ────── */}
      {mode === "login" && (
        <motion.form
          key="login"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          onSubmit={handleLogin}
          className="flex-1 flex flex-col justify-center relative z-10 space-y-6 max-w-sm mx-auto w-full"
        >
          <div className="text-center mb-2">
            <h1
              className="text-3xl font-light tracking-wide mb-2"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Content de te revoir
            </h1>
            <p className="text-white/60 text-sm">Connecte-toi pour continuer</p>
          </div>

          <Field
            icon={<Mail className="w-4 h-4" />}
            type="email"
            placeholder="Adresse email"
            value={loginEmail}
            onChange={setLoginEmail}
            testId="input-login-email"
            autoFocus
          />

          <PwdField
            value={loginPwd}
            onChange={setLoginPwd}
            show={showPwd}
            onToggle={() => setShowPwd((v) => !v)}
            testId="input-login-password"
            placeholder="Mot de passe"
          />

          <button
            type="submit"
            disabled={loading}
            data-testid="button-login-submit"
            className="w-full py-4 rounded-lg glow-bg-pink text-white font-bold text-base tracking-wide active:scale-[0.98] transition-transform disabled:opacity-50 mt-4 shadow-lg shadow-pink-500/30"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <p className="text-center text-sm text-white/60 pt-4">
            Je n'ai pas de compte —{" "}
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setStep(1);
              }}
              className="glow-text-pink font-bold underline-offset-4 hover:underline"
              data-testid="button-switch-to-register"
            >
              Créer mon compte
            </button>
          </p>
        </motion.form>
      )}

      {/* ────── REGISTER (3 étapes) ────── */}
      {mode === "register" && (
        <div className="flex-1 flex flex-col justify-center relative z-10 max-w-sm mx-auto w-full">
          <AnimatePresence mode="wait">
            {/* Étape 1 — Prénom + Nom */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <div className="text-center mb-2">
                  <h1
                    className="text-3xl font-light tracking-wide mb-2"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Comment t'appelles-tu ?
                  </h1>
                  <p className="text-white/60 text-sm">Dis-nous ton nom et prénom</p>
                </div>

                <Field
                  icon={<User className="w-4 h-4" />}
                  type="text"
                  placeholder="Prénom"
                  value={firstName}
                  onChange={setFirstName}
                  testId="input-firstname"
                  autoFocus
                />
                <Field
                  icon={<User className="w-4 h-4" />}
                  type="text"
                  placeholder="Nom (optionnel)"
                  value={lastName}
                  onChange={setLastName}
                  testId="input-lastname"
                />

                <PrimaryButton onClick={nextStep} testId="button-step1-next">
                  Suivant <ArrowRight className="w-4 h-4 ml-1 inline" />
                </PrimaryButton>
              </motion.div>
            )}

            {/* Étape 2 — Email ou téléphone */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35 }}
                className="space-y-6"
              >
                <div className="text-center mb-2">
                  <h1
                    className="text-3xl font-light tracking-wide mb-2"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Comment te contacter ?
                  </h1>
                  <p className="text-white/60 text-sm">
                    Email ou numéro de téléphone
                  </p>
                </div>

                <Field
                  icon={
                    contact.includes("@") ? (
                      <Mail className="w-4 h-4" />
                    ) : (
                      <Phone className="w-4 h-4" />
                    )
                  }
                  type="text"
                  placeholder="ton@email.com  ou  +237 6XX XXX XXX"
                  value={contact}
                  onChange={setContact}
                  testId="input-contact"
                  autoFocus
                />

                <PrimaryButton onClick={nextStep} testId="button-step2-next">
                  Suivant <ArrowRight className="w-4 h-4 ml-1 inline" />
                </PrimaryButton>
              </motion.div>
            )}

            {/* Étape 3 — Mot de passe */}
            {step === 3 && (
              <motion.form
                key="step3"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35 }}
                onSubmit={handleRegister}
                className="space-y-6"
              >
                <div className="text-center mb-2">
                  <h1
                    className="text-3xl font-light tracking-wide mb-2"
                    style={{ fontFamily: "'Outfit', sans-serif" }}
                  >
                    Crée ton mot de passe
                  </h1>
                  <p className="text-white/60 text-sm">6 caractères minimum</p>
                </div>

                <PwdField
                  value={regPwd}
                  onChange={setRegPwd}
                  show={showPwd}
                  onToggle={() => setShowPwd((v) => !v)}
                  testId="input-register-password"
                  placeholder="Mot de passe"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={loading}
                  data-testid="button-register-finish"
                  className="w-full py-4 rounded-full bg-white text-black font-semibold text-base tracking-wide active:scale-[0.98] transition-transform disabled:opacity-50"
                  style={{ fontFamily: "'Outfit', sans-serif" }}
                >
                  {loading ? (
                    "Création..."
                  ) : (
                    <>
                      Terminer <Check className="w-4 h-4 ml-1 inline" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-sm text-white/60 pt-8">
            J'ai déjà un compte —{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setStep(1);
              }}
              className="text-white font-semibold underline-offset-4 hover:underline"
              data-testid="button-switch-to-login"
            >
              Se connecter
            </button>
          </p>
        </div>
      )}

      {/* Footer minimaliste */}
      <p
        className="text-center text-[10px] text-white/30 mt-8 tracking-widest uppercase relative z-10"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      >
        Fondateur · Démise Essawe
      </p>
    </div>
  );
}

// ── Composants réutilisables ─────────────────────────────
function Field({
  icon,
  type,
  placeholder,
  value,
  onChange,
  testId,
  autoFocus,
}: {
  icon: React.ReactNode;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  testId: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">{icon}</div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        data-testid={testId}
        className="w-full pl-11 pr-4 py-4 bg-white/5 border border-white/15 rounded-2xl text-base text-white placeholder-white/35 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      />
    </div>
  );
}

function PwdField({
  value,
  onChange,
  show,
  onToggle,
  testId,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  testId: string;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required
        data-testid={testId}
        className="w-full pl-11 pr-12 py-4 bg-white/5 border border-white/15 rounded-2xl text-base text-white placeholder-white/35 focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
        style={{ fontFamily: "'Outfit', sans-serif" }}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  testId,
}: {
  children: React.ReactNode;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="w-full py-4 rounded-full bg-white text-black font-semibold text-base tracking-wide active:scale-[0.98] transition-transform"
      style={{ fontFamily: "'Outfit', sans-serif" }}
    >
      {children}
    </button>
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
