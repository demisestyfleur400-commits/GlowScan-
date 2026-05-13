import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2, LogIn, Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

const NAVY = "#1E40AF";
const INK = "#1E293B";

export default function ProConnexion() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

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
      await qc.invalidateQueries({ queryKey: ["/api/pro/account"] });
      await qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setLocation("/pro/dashboard");
    } catch (err: any) {
      toast({ title: "Connexion échouée", description: err.message, variant: "destructive" });
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

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <div className="text-center mb-7">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: NAVY }}
            >
              <LogIn className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Connexion Pro</h1>
            <p className="text-sm text-slate-500">Accédez à votre cabinet GlowScan</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 bg-white border border-slate-200 rounded-xl p-6 shadow-sm"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email professionnel</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-email"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-sm outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              data-testid="button-submit-login"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg text-white font-semibold text-sm shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
              style={{ background: NAVY }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-center text-xs text-slate-500 pt-2">
              Pas encore de compte ?{" "}
              <Link
                href="/pro/inscription"
                className="font-semibold hover:underline"
                style={{ color: NAVY }}
                data-testid="link-register"
              >
                Créer mon compte Pro
              </Link>
            </p>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
