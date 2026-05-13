import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Stethoscope, ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const NAVY = "#1E40AF";
const INK = "#1E293B";

export default function ProInscription() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cabinetName, setCabinetName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          consent: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur lors de l'inscription");
      toast({ title: `Bienvenue Dr ${fullName}`, description: "Votre essai gratuit de 14 jours commence maintenant." });
      await qc.invalidateQueries({ queryKey: ["/api/pro/account"] });
      await qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/pro/dashboard");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#F8FAFC", color: INK, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link href="/pro" data-testid="link-back" className="p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: NAVY }}>
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold">GlowScan <span style={{ color: NAVY }}>Pro</span></p>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-md mx-auto">
          <div className="text-center mb-7">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: NAVY }}
            >
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Créer mon compte Pro</h1>
            <p className="text-sm text-slate-500">14 jours d'essai gratuit · sans carte bancaire</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
          >
            <Field label="Nom complet *" placeholder="Dr Marie Mbarga" value={fullName} onChange={setFullName} required testid="input-fullname" />
            <Field label="Email professionnel *" type="email" placeholder="cabinet@exemple.com" value={email} onChange={setEmail} required testid="input-email" />
            <Field label="Mot de passe *" type="password" placeholder="Min. 6 caractères" value={password} onChange={setPassword} required minLength={6} testid="input-password" />

            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 mb-3">Cabinet (optionnel)</p>
              <div className="space-y-3">
                <Field label="Nom du cabinet" placeholder="Cabinet Bonanjo" value={cabinetName} onChange={setCabinetName} testid="input-cabinet" />
                <Field label="Téléphone WhatsApp" placeholder="237 6XX XX XX XX" value={phone} onChange={setPhone} testid="input-phone" />
                <Field label="Ville" placeholder="Douala" value={city} onChange={setCity} testid="input-city" />
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-blue-700"
                data-testid="checkbox-consent"
              />
              <span className="text-xs text-slate-600 leading-relaxed">
                <ShieldCheck className="inline w-3.5 h-3.5 mr-1" style={{ color: NAVY }} />
                J'accepte que les photos et données médicales de mes patients soient utilisées de manière anonymisée pour améliorer le modèle IA de GlowScan, conformément au RGPD. Je suis le responsable du traitement vis-à-vis de mes patients.
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !fullName || !email || !password || !consent}
              data-testid="button-submit-register"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold text-sm shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
              style={{ background: NAVY }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Démarrer mon essai gratuit
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-center text-xs text-slate-500 pt-1">
              Déjà inscrit ?{" "}
              <Link href="/pro/connexion" className="font-semibold hover:underline" style={{ color: NAVY }} data-testid="link-login">
                Se connecter
              </Link>
            </p>
          </form>
        </motion.div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required, minLength, testid }: any) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        data-testid={testid}
        className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 transition-all"
      />
    </div>
  );
}
