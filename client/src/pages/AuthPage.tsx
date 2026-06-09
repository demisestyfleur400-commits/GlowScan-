import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, ArrowLeft, Phone, ShieldAlert, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Mode = "register" | "login";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>("register");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  // Register fields
  const [firstName, setFirstName] = useState("");
  const [contact, setContact] = useState("");
  const [regPwd, setRegPwd] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

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

  // ── REGISTER (1 step) ──────────────────────────────────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
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
      toast({
        title: "Inscription impossible",
        description: parseError(err) || "Ce compte existe peut-être déjà.",
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
      <div className="flex items-center justify-between relative z-10 mb-10 max-w-sm mx-auto w-full">
        <button
          onClick={() => setLocation("/")}
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
          style={{ background: "#13101f", border: "1px solid rgba(167,139,250,0.2)" }}
          data-testid="logo-glowscan"
        >
          <img src="/logo-glowscan.jpeg" alt="GlowScan" className="h-7 w-auto object-contain" />
        </div>

        <div className="w-10 h-10" />
      </div>

      {/* ────── REGISTER FORM ────── */}
      {mode === "register" && (
        <motion.form
          key="register"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          onSubmit={handleRegister}
          className="flex-1 flex flex-col justify-center relative z-10 space-y-4 max-w-sm mx-auto w-full"
        >
          {/* Title */}
          <div className="text-center mb-2">
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 text-[10px] font-bold tracking-wide"
              style={{
                background: "rgba(167,139,250,0.1)",
                border: "1px solid rgba(167,139,250,0.2)",
                color: "#c4b5fd",
              }}
            >
              <Sparkles className="w-3 h-3" />
              Gratuit · 30 secondes
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "#f3f0ff" }}>
              Crée ton profil peau
            </h1>
            <p className="text-xs font-medium mt-1" style={{ color: "rgba(200,185,255,0.55)" }}>
              Un compte pour sauvegarder toutes tes analyses
            </p>
          </div>

          <Field
            icon={<User className="w-4 h-4" />}
            type="text"
            placeholder="Ton prénom"
            value={firstName}
            onChange={setFirstName}
            testId="input-firstname"
            autoFocus
          />

          <Field
            icon={contact.includes("@") ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            type="text"
            placeholder="Email ou numéro (+237...)"
            value={contact}
            onChange={setContact}
            testId="input-contact"
          />

          <PwdField
            value={regPwd}
            onChange={setRegPwd}
            show={showPwd}
            onToggle={() => setShowPwd((v) => !v)}
            testId="input-register-password"
            placeholder="Mot de passe (6 caractères min)"
          />

          <button
            type="submit"
            disabled={loading}
            data-testid="button-register-finish"
            className="w-full py-4 text-sm font-extrabold mt-2 transition-all active:scale-[0.98] disabled:opacity-50 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #E91E8C, #f43f5e)",
              borderRadius: "14px",
              color: "#fff",
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-1/2"
              style={{
                background: "linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)",
                borderRadius: "14px 14px 0 0",
              }}
            />
            <span className="relative z-10">
              {loading ? "Création du compte..." : "Obtenir mon bilan gratuit →"}
            </span>
          </button>

          <p className="text-center text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>
            Gratuit · Données privées · Sans engagement
          </p>

          <p className="text-center text-xs font-medium pt-1" style={{ color: "rgba(200,185,255,0.65)" }}>
            Déjà inscrit·e ?{" "}
            <button
              type="button"
              onClick={() => setMode("login")}
              className="font-bold"
              style={{ color: "#a78bfa" }}
              data-testid="button-switch-to-login"
            >
              Se connecter
            </button>
          </p>
        </motion.form>
      )}

      {/* ────── LOGIN FORM ────── */}
      {mode === "login" && (
        <motion.form
          key="login"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          onSubmit={handleLogin}
          className="flex-1 flex flex-col justify-center relative z-10 space-y-4 max-w-sm mx-auto w-full"
        >
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold" style={{ color: "#f3f0ff" }}>
              Connexion
            </h1>
            <p className="text-xs font-medium mt-1" style={{ color: "rgba(200,185,255,0.55)" }}>
              Retrouve ton historique de diagnostics
            </p>
          </div>

          <Field
            icon={loginEmail.includes("@") ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            type="text"
            placeholder="Email ou numéro (+237...)"
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
            className="w-full py-4 text-sm font-bold mt-2 transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "#7c3aed",
              borderRadius: "14px",
              color: "#fff",
            }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <p className="text-center text-xs font-medium pt-1" style={{ color: "rgba(200,185,255,0.65)" }}>
            Première visite ?{" "}
            <button
              type="button"
              onClick={() => setMode("register")}
              className="font-bold"
              style={{ color: "#a78bfa" }}
              data-testid="button-switch-to-register"
            >
              Créer un profil gratuit
            </button>
          </p>
        </motion.form>
      )}

      {/* Footer */}
      <div
        className="text-center mt-auto pt-8 relative z-10 flex justify-center items-center gap-1.5 text-[10px] font-medium"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        <ShieldAlert className="w-3 h-3" style={{ color: "rgba(167,139,250,0.5)" }} />
        <span>Données chiffrées · Jamais revendues</span>
      </div>
    </div>
  );
}

// ── INTERNAL COMPONENTS ────────────────────────────────────────────────────
function Field({
  icon, type, placeholder, value, onChange, testId, autoFocus,
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
      <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(167,139,250,0.5)" }}>
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
  value, onChange, show, onToggle, testId, placeholder, autoFocus,
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
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(167,139,250,0.5)" }} />
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
