import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, ArrowRight, Phone, Check, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";

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

  // ── REGISTER (3 étapes) ────────────────────────────────
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
    <div className="min-h-screen w-full text-white flex flex-col px-6 py-10 relative overflow-hidden" style={{ background: "#0D0A0E" }}>
      {/* Orbes d'ambiance */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(233,30,140,0.18) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-5%] right-[-10%] w-[300px] h-[300px] rounded-full" style={{ background: "radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)" }} />
      </div>

      {/* Header Médical Épuré */}
      <div className="flex items-center justify-between relative z-10 mb-8 max-w-sm mx-auto w-full">
        <button
          onClick={() => (mode === "register" && step > 1 ? prevStep() : setLocation("/"))}
          className="w-10 h-10 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-center active:scale-95 transition-all text-slate-400 hover:text-white"
          data-testid="button-back-from-auth"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        
        <div className="bg-white rounded-xl p-2 border border-slate-800 shadow-xl" data-testid="logo-glowscan">
          <img
            src="/logo-glowscan.jpeg"
            alt="GlowScan Core"
            className="h-7 w-auto object-contain"
          />
        </div>
        <div className="w-10 h-10" />
      </div>

      {/* Indicateur de Progression Clinique */}
      {mode === "register" && (
        <div className="flex justify-center gap-1.5 mb-8 relative z-10">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-0.5 rounded-full transition-all duration-500"
              style={{
                width: n === step ? "2rem" : "1.25rem",
                background: n === step
                  ? "linear-gradient(90deg, #E91E8C, #f43f5e)"
                  : n < step
                  ? "rgba(255,255,255,0.3)"
                  : "rgba(255,255,255,0.08)",
              }}
            />
          ))}
        </div>
      )}

      {/* ────── OPTION A : FORMULAIRE DE CONNEXION ────── */}
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
            <h1 className="text-2xl font-black uppercase tracking-tight text-white font-display">
              Identification Core
            </h1>
            <p className="text-slate-400 text-xs font-medium mt-1">Connectez-vous pour charger votre historique de diagnostics.</p>
          </div>

          <Field
            icon={<Mail className="w-4 h-4" />}
            type="email"
            placeholder="Adresse e-mail de session"
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
            placeholder="Clé de sécurité (Mot de passe)"
          />

          <Button
            type="submit"
            disabled={loading}
            data-testid="button-login-submit"
            variant="premium"
            className="w-full py-6 text-xs uppercase tracking-widest font-black mt-2"
          >
            {loading ? "Vérification..." : "Ouvrir la session"}
          </Button>

          <p className="text-center text-xs text-slate-400 font-medium pt-2">
            Première analyse ?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setStep(1);
              }}
              className="font-bold hover:underline"
              style={{ color: "#f9a8d4" }}
              data-testid="button-switch-to-register"
            >
              Créer un profil sécurisé
            </button>
          </p>
        </motion.form>
      )}

      {/* ────── OPTION B : FORMULAIRE D'INSCRIPTION (PROGRESSIF) ────── */}
      {mode === "register" && (
        <div className="flex-1 flex flex-col justify-center relative z-10 max-w-sm mx-auto w-full">
          <AnimatePresence mode="wait">
            {/* Étape 1 — Identité civile */}
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
                  <h1 className="text-2xl font-black uppercase tracking-tight text-white font-display">
                    Enregistrement
                  </h1>
                  <p className="text-slate-400 text-xs font-medium mt-1">Saisissez les informations de dossier d'analyse.</p>
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
                  placeholder="Nom de famille (Optionnel)"
                  value={lastName}
                  onChange={setLastName}
                  testId="input-lastname"
                />

                <Button onClick={nextStep} variant="premium" className="w-full py-6 text-xs uppercase tracking-widest font-black" data-testid="button-step1-next">
                  Continuer <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
                </Button>
              </motion.div>
            )}

            {/* Étape 2 — Canal de contact */}
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
                  <h1 className="text-2xl font-black uppercase tracking-tight text-white font-display">
                    Point de Contact
                  </h1>
                  <p className="text-slate-400 text-xs font-medium mt-1">
                    Spécifiez vos coordonnées d'accès pour les notifications de routine.
                  </p>
                </div>

                <Field
                  icon={contact.includes("@") ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  type="text"
                  placeholder="adresse@email.com ou numéro (+237)"
                  value={contact}
                  onChange={setContact}
                  testId="input-contact"
                  autoFocus
                />

                <Button onClick={nextStep} variant="premium" className="w-full py-6 text-xs uppercase tracking-widest font-black" data-testid="button-step2-next">
                  Valider le canal <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
                </Button>
              </motion.div>
            )}

            {/* Étape 3 — Mot de passe sécurisé */}
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
                  <h1 className="text-2xl font-black uppercase tracking-tight text-white font-display">
                    Chiffrement
                  </h1>
                  <p className="text-slate-400 text-xs font-medium mt-1">Configurez un code secret d'accès (6 signes min).</p>
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

                <Button
                  type="submit"
                  disabled={loading}
                  variant="premium"
                  className="w-full py-6 text-xs uppercase tracking-widest font-black"
                  data-testid="button-register-finish"
                >
                  {loading ? (
                    "Initialisation..."
                  ) : (
                    <>
                      Créer mon dossier <Check className="w-3.5 h-3.5 ml-1 inline" />
                    </>
                  )}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-slate-400 font-medium pt-6">
            Déjà inscrit ?{" "}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setStep(1);
              }}
              className="text-white font-bold hover:underline"
              data-testid="button-switch-to-login"
            >
              Se connecter
            </button>
          </p>
        </div>
      )}

      {/* Signature Institutionnelle */}
      <div className="text-center mt-auto pt-8 relative z-10 opacity-40 flex justify-center items-center gap-1.5 text-[9px] text-slate-500 font-black tracking-widest uppercase font-display">
        <ShieldAlert className="w-3 h-3" style={{ color: "#E91E8C" }} />
        <span>Données chiffrées de bout en bout</span>
      </div>
    </div>
  );
}

// ── COMPOSANTS INTERNES EN CAPSULES CLINIQUES ─────────────────────────────
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
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">{icon}</div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        data-testid={testId}
        className="w-full pl-11 pr-4 py-4 rounded-2xl text-xs font-bold text-white outline-none transition-all font-display"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        onFocus={e => (e.target.style.borderColor = "rgba(233,30,140,0.5)")}
        onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
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
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
      <input
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        required
        data-testid={testId}
        className="w-full pl-11 pr-12 py-4 rounded-2xl text-xs font-bold text-white outline-none transition-all font-display"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
        onFocus={e => (e.target.style.borderColor = "rgba(233,30,140,0.5)")}
        onBlur={e => (e.target.style.borderColor = "rgba(255,255,255,0.1)")}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
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
