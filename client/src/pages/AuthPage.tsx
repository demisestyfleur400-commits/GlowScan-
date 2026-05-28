import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, ArrowRight, Phone, Check, ShieldAlert } from "lucide-react";
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
  const [contact, setContact] = useState("");
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
        title: "Identification impossible",
        description: parseError(err) || "Email ou mot de passe non répertorié.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  // ── REGISTER (3 steps) ─────────────────────────────────
  function nextStep() {
    if (step === 1 && !firstName.trim()) {
      toast({ title: "Identification requise", description: "Le prénom est obligatoire.", variant: "destructive" });
      return;
    }
    if (step === 2 && !contact.trim()) {
      toast({ title: "Canal requis", description: "Veuillez fournir un email ou un numéro valide.", variant: "destructive" });
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
        title: "Sécurité insuffisante",
        description: "Le mot de passe doit contenir 6 caractères minimum.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
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
        title: "Compte sécurisé",
        description: "Initialisation du profil d'analyse effectuée.",
      });

      setLocation("/");
    } catch (err: any) {
      toast({
        title: "Inscription refusée",
        description: parseError(err) || "Une erreur est survenue lors de l'enregistrement.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col px-6 py-10 relative overflow-hidden"
      style={{
        background: "#0d0a0e",
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
        color: "#f3f0ff",
      }}
    >
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent)" }}
        />
        <div
          className="absolute bottom-[-5%] right-[-10%] w-[300px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.10), transparent)" }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between relative z-10 mb-8 max-w-sm mx-auto w-full">
        <button
          onClick={() => (mode === "register" && step > 1 ? prevStep() : setLocation("/"))}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(200,185,255,0.65)",
          }}
          data-testid="button-back-from-auth"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div
          className="rounded-xl p-2"
          style={{
            background: "#13101f",
            border: "1px solid rgba(167,139,250,0.2)",
          }}
          data-testid="logo-glowscan"
        >
          <img
            src="/logo-glowscan.jpeg"
            alt="GlowScan"
            className="h-7 w-auto object-contain"
          />
        </div>

        <div className="w-10 h-10" />
      </div>

      {/* Step indicator (register only) */}
      {mode === "register" && (
        <div className="flex justify-center gap-2 mb-8 relative z-10">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: n === step ? "2rem" : "1.25rem",
                background:
                  n === step
                    ? "#7c3aed"
                    : n < step
                    ? "rgba(167,139,250,0.5)"
                    : "rgba(255,255,255,0.08)",
              }}
            />
          ))}
        </div>
      )}

      {/* ────── LOGIN FORM ────── */}
      {mode === "login" && (
        <motion.form
          key="login"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          onSubmit={handleLogin}
          className="flex-1 flex flex-col justify-center relative z-10 space-y-5 max-w-sm mx-auto w-full"
        >
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold" style={{ color: "#f3f0ff" }}>
              Connexion
            </h1>
            <p className="text-xs font-medium mt-1" style={{ color: "rgba(200,185,255,0.65)" }}>
              Chargez votre historique de diagnostics
            </p>
          </div>

          <Field
            icon={<Mail className="w-4 h-4" />}
            type="email"
            placeholder="Adresse e-mail"
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
            className="w-full py-3.5 text-sm font-bold mt-2 transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "#7c3aed",
              borderRadius: "9999px",
              color: "#fff",
            }}
          >
            {loading ? "Vérification..." : "Ouvrir la session"}
          </button>

          <p className="text-center text-xs font-medium pt-2" style={{ color: "rgba(200,185,255,0.65)" }}>
            Première analyse ?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setStep(1);
              }}
              className="font-bold transition-opacity hover:opacity-80"
              style={{ color: "#a78bfa" }}
              data-testid="button-switch-to-register"
            >
              Créer un profil
            </button>
          </p>
        </motion.form>
      )}

      {/* ────── REGISTER FORM (progressive) ────── */}
      {mode === "register" && (
        <div className="flex-1 flex flex-col justify-center relative z-10 max-w-sm mx-auto w-full">
          <AnimatePresence mode="wait">
            {/* Step 1 — Identity */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold" style={{ color: "#f3f0ff" }}>
                    Votre identité
                  </h1>
                  <p className="text-xs font-medium mt-1" style={{ color: "rgba(200,185,255,0.65)" }}>
                    Saisissez vos informations de profil
                  </p>
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
                  placeholder="Nom de famille (optionnel)"
                  value={lastName}
                  onChange={setLastName}
                  testId="input-lastname"
                />

                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{
                    background: "#7c3aed",
                    borderRadius: "9999px",
                    color: "#fff",
                  }}
                  data-testid="button-step1-next"
                >
                  Continuer <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

            {/* Step 2 — Contact */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold" style={{ color: "#f3f0ff" }}>
                    Point de contact
                  </h1>
                  <p className="text-xs font-medium mt-1" style={{ color: "rgba(200,185,255,0.65)" }}>
                    Votre email ou numéro de téléphone
                  </p>
                </div>

                <Field
                  icon={contact.includes("@") ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  type="text"
                  placeholder="adresse@email.com ou +237..."
                  value={contact}
                  onChange={setContact}
                  testId="input-contact"
                  autoFocus
                />

                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{
                    background: "#7c3aed",
                    borderRadius: "9999px",
                    color: "#fff",
                  }}
                  data-testid="button-step2-next"
                >
                  Valider le contact <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}

            {/* Step 3 — Password */}
            {step === 3 && (
              <motion.form
                key="step3"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleRegister}
                className="space-y-5"
              >
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold" style={{ color: "#f3f0ff" }}>
                    Mot de passe
                  </h1>
                  <p className="text-xs font-medium mt-1" style={{ color: "rgba(200,185,255,0.65)" }}>
                    Choisissez un code secret (6 caractères minimum)
                  </p>
                </div>

                <PwdField
                  value={regPwd}
                  onChange={setRegPwd}
                  show={showPwd}
                  onToggle={() => setShowPwd((v) => !v)}
                  testId="input-register-password"
                  placeholder="Nouveau mot de passe"
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
                  style={{
                    background: "#7c3aed",
                    borderRadius: "9999px",
                    color: "#fff",
                  }}
                  data-testid="button-register-finish"
                >
                  {loading ? (
                    "Initialisation..."
                  ) : (
                    <>
                      Créer mon dossier <Check className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-xs font-medium pt-6" style={{ color: "rgba(200,185,255,0.65)" }}>
            Déjà inscrite ?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setStep(1);
              }}
              className="font-bold transition-opacity hover:opacity-80"
              style={{ color: "#a78bfa" }}
              data-testid="button-switch-to-login"
            >
              Se connecter
            </button>
          </p>
        </div>
      )}

      {/* Footer */}
      <div
        className="text-center mt-auto pt-8 relative z-10 flex justify-center items-center gap-1.5 text-[10px] font-medium"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        <ShieldAlert className="w-3 h-3" style={{ color: "rgba(167,139,250,0.5)" }} />
        <span>Données chiffrées de bout en bout</span>
      </div>
    </div>
  );
}

// ── INTERNAL COMPONENTS ────────────────────────────────────────────────────
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
      <div
        className="absolute left-4 top-1/2 -translate-y-1/2"
        style={{ color: "rgba(167,139,250,0.5)" }}
      >
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        data-testid={testId}
        className="w-full pl-11 pr-4 py-4 text-xs font-medium outline-none transition-all"
        style={{
          background: "#13101f",
          border: "1px solid rgba(167,139,250,0.2)",
          borderRadius: "12px",
          color: "#f3f0ff",
        }}
        onFocus={e => (e.target.style.borderColor = "rgba(167,139,250,0.5)")}
        onBlur={e => (e.target.style.borderColor = "rgba(167,139,250,0.2)")}
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
      <Lock
        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
        style={{ color: "rgba(167,139,250,0.5)" }}
      />
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required
        data-testid={testId}
        className="w-full pl-11 pr-12 py-4 text-xs font-medium outline-none transition-all"
        style={{
          background: "#13101f",
          border: "1px solid rgba(167,139,250,0.2)",
          borderRadius: "12px",
          color: "#f3f0ff",
        }}
        onFocus={e => (e.target.style.borderColor = "rgba(167,139,250,0.5)")}
        onBlur={e => (e.target.style.borderColor = "rgba(167,139,250,0.2)")}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
        style={{ color: "rgba(167,139,250,0.5)" }}
      >
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
