import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, CheckCircle2, Clock, ArrowLeft, Phone, Shield, Zap, ChevronRight, Copy, Check, ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MTN_NUMBER = "674377959";
const ORANGE_NUMBER = "690501392";

// Ce que le plan gratuit inclut DÉJÀ (analyses illimitées !)
const FEATURES_FREE = [
  { text: "Analyses IA faciales illimitées gratuites" },
  { text: "Diagnostic complet : Glow Score + cartographie" },
  { text: "Historique de tes scans sauvegardé" },
];

// Ce que le premium débloque EN PLUS
const FEATURES_PREMIUM = [
  { text: "Scan Produit IA — analyser n'importe quel cosmétique" },
  { text: "Routine Tracker matin & soir avec rappels chrono" },
  { text: "Suivi de progression cutanée semaine par semaine" },
  { text: "Recommandations produits ultra-personnalisées" },
  { text: "Crédit de +100 points de fidélité immédiat" },
];

type Step = "offer" | "payment" | "confirm";

const DS = '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif';

export default function Premium() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>("offer");
  const [method, setMethod] = useState<"mtn_momo" | "orange_money">("mtn_momo");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [requestData, setRequestData] = useState<{ reference: string; ownerWaUrl?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const planPrice = 2000;

  const { data: statusData } = useQuery<{ request: { reference: string; status: string } | null }>({
    queryKey: ["/api/premium/status"],
    enabled: !!user && !isPremium,
  });

  const paymentNumber = method === "mtn_momo" ? MTN_NUMBER : ORANGE_NUMBER;

  const handleSubmitRequest = async () => {
    if (!phone.trim() || phone.trim().length < 8) {
      toast({
        title: "Numéro incorrect",
        description: "Veuillez entrer un numéro Mobile Money valide à 9 chiffres.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/premium/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ method, phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setRequestData({ reference: data.request.reference, ownerWaUrl: data.ownerWaUrl });

      if (typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "InitiateCheckout", {
          value: planPrice,
          currency: "XAF",
          content_name: "GlowScan Premium Lifetime",
          content_ids: ["premium_lifetime"],
        });
      }
      setStep("confirm");
    } catch (err: any) {
      toast({ title: "Échec de l'enregistrement", description: err.message || "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyRef = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Already premium ──
  if (isPremium) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
        style={{ background: "#0d0a0e", fontFamily: DS }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)" }}
        >
          <Crown className="w-6 h-6" style={{ color: "#a78bfa" }} />
        </div>
        <h1 className="text-xl font-extrabold tracking-tight mb-2" style={{ color: "#f3f0ff", fontWeight: 800 }}>
          Licence active
        </h1>
        <p className="text-xs max-w-xs mx-auto mb-6" style={{ color: "rgba(200,185,255,0.65)" }}>
          Ton abonnement GlowScan Premium est actif. Profite de toutes les fonctionnalités sans limite.
        </p>
        <Button onClick={() => setLocation("/")} variant="premium" className="w-full max-w-xs">
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  // ── Pending verification ──
  if (statusData?.request?.status === "pending" && step === "offer") {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#0d0a0e", fontFamily: DS }}>
        <div
          className="p-4 flex items-center gap-3 sticky top-0 z-10"
          style={{ background: "rgba(13,10,14,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}
        >
          <button
            onClick={() => setLocation(-1 as any)}
            className="p-2 transition-colors"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", color: "rgba(255,255,255,0.6)" }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold tracking-widest" style={{ color: "#f3f0ff" }}>Vérification de licence</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div
            className="w-12 h-12 flex items-center justify-center mb-4"
            style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: "12px" }}
          >
            <Clock className="w-5 h-5 animate-pulse" style={{ color: "#fbbf24" }} />
          </div>
          <h2 className="text-base font-extrabold tracking-tight mb-1" style={{ color: "#f3f0ff", fontWeight: 800 }}>
            Transaction en cours
          </h2>
          <p className="text-xs max-w-xs mx-auto mb-4 leading-relaxed" style={{ color: "rgba(200,185,255,0.65)" }}>
            Ta demande avec la référence{" "}
            <span
              className="font-bold"
              style={{ color: "#f3f0ff", background: "rgba(255,255,255,0.07)", padding: "0 6px", borderRadius: "8px" }}
            >
              {statusData.request.reference}
            </span>{" "}
            est en cours de validation par nos équipes.
          </p>
          <p className="text-[10px] font-medium max-w-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
            L'activation définitive s'effectue généralement dans un délai inférieur à 24 heures.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0d0a0e", fontFamily: DS }}>
      {/* Glow orb */}
      <div
        style={{
          position: "fixed",
          top: "-100px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "700px",
          height: "700px",
          background: "radial-gradient(circle, rgba(124,58,237,0.15), transparent)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <div
        className="px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10"
        style={{ background: "rgba(13,10,14,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(20px)" }}
      >
        <button
          onClick={() => (step === "offer" ? setLocation(-1 as any) : setStep("offer"))}
          className="p-2 transition-all"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", color: "rgba(255,255,255,0.6)" }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-bold tracking-widest" style={{ color: "#f3f0ff" }}>GlowScan — passer premium</span>
      </div>

      <div className="relative flex-1 overflow-y-auto pb-12" style={{ zIndex: 1 }}>
        <AnimatePresence mode="wait">

          {/* ══ STEP 1: OFFER ══ */}
          {step === "offer" && (
            <motion.div
              key="offer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 space-y-4 max-w-md mx-auto w-full"
            >
              {/* Hero card */}
              <div
                className="relative overflow-hidden text-center p-6"
                style={{
                  background: "rgba(233,30,140,0.1)",
                  border: "2px solid rgba(233,30,140,0.4)",
                  borderRadius: "24px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "220px",
                    height: "220px",
                    background: "radial-gradient(circle, rgba(233,30,140,0.12), transparent)",
                    pointerEvents: "none",
                  }}
                />
                <div className="relative">
                  <div
                    className="inline-flex items-center gap-1.5 px-3 py-1 mb-4"
                    style={{ background: "rgba(233,30,140,0.15)", border: "1px solid rgba(233,30,140,0.3)", borderRadius: "9999px" }}
                  >
                    <span className="text-[10px] font-bold tracking-widest" style={{ color: "#f9a8d4" }}>Offre de lancement</span>
                  </div>
                  <h2
                    className="text-xl font-extrabold tracking-tight mb-1"
                    style={{ color: "#f3f0ff", fontWeight: 800 }}
                  >
                    Activer mon abonnement
                  </h2>
                  <p className="text-xs mb-6" style={{ color: "rgba(200,185,255,0.65)" }}>
                    Débloque le Scan Produit IA et le Routine Tracker — conçus pour transformer ta peau.
                  </p>
                  <div
                    className="px-5 py-3.5 w-full"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px" }}
                  >
                    <p className="text-2xl font-extrabold tracking-tight" style={{ color: "#f3f0ff", fontWeight: 800 }}>
                      2 000 FCFA / mois
                    </p>
                    <p className="text-[10px] font-medium mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Aucun abonnement caché · Paiement unique
                    </p>
                  </div>
                </div>
              </div>

              {/* Features comparison */}
              <div
                className="p-5 space-y-4"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "24px" }}
              >
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest block mb-2.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Plan Gratuit — déjà disponible
                  </span>
                  <div className="space-y-2">
                    {FEATURES_FREE.map(f => (
                      <div key={f.text} className="flex items-start gap-2.5 text-xs font-medium" style={{ color: "rgba(200,185,255,0.55)" }}>
                        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "#6ee7b7" }} />
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <span className="text-[9px] font-bold uppercase tracking-widest block mb-2.5" style={{ color: "#c4b5fd" }}>
                    Fonctionnalités premium débloquées
                  </span>
                  <div className="space-y-2.5">
                    {FEATURES_PREMIUM.map(f => (
                      <div key={f.text} className="flex items-start gap-2.5 text-xs font-bold" style={{ color: "#f3f0ff" }}>
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#a78bfa" }} />
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Founder quote */}
              <div
                className="p-5 flex items-start gap-4"
                style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.18)", borderRadius: "24px" }}
              >
                <div
                  className="w-10 h-10 flex items-center justify-center shrink-0 text-sm font-extrabold"
                  style={{ background: "#7c3aed", borderRadius: "12px", color: "#fff", fontWeight: 800 }}
                >
                  DE
                </div>
                <div>
                  <span className="text-[9px] font-bold uppercase tracking-widest block" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Note d'ingénierie
                  </span>
                  <p className="text-xs font-medium leading-relaxed mt-1" style={{ color: "rgba(200,185,255,0.65)" }}>
                    "Nous développons des modèles algorithmiques entraînés spécifiquement sur les variations mélaniques et climatiques d'Afrique centrale. L'abonnement mensuel nous permet de financer la puissance de calcul et d'améliorer continuellement l'IA pour notre communauté."
                  </p>
                  <span className="text-[10px] font-bold block mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                    — Demise Essawe, Fondateur GlowScan
                  </span>
                </div>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Shield className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />, label: "Protocole MoMo/OM chiffré" },
                  { icon: <Zap className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />, label: "Activation serveur rapide" },
                ].map(({ icon, label }) => (
                  <div
                    key={label}
                    className="p-3 flex items-center gap-2.5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "16px" }}
                  >
                    {icon}
                    <p className="text-[10px] font-bold leading-tight" style={{ color: "rgba(200,185,255,0.65)" }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Primary CTA */}
              {!user ? (
                <button
                  onClick={() => setLocation("/auth")}
                  className="w-full py-4 text-sm font-extrabold transition-all active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg,#E91E8C,#f43f5e)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  Créer un compte pour s'enregistrer
                </button>
              ) : (
                <button
                  onClick={() => setStep("payment")}
                  className="w-full py-4 text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{
                    background: "linear-gradient(135deg,#E91E8C,#f43f5e)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  Obtenir mon accès permanent
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}

          {/* ══ STEP 2: PAYMENT ══ */}
          {step === "payment" && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 max-w-md mx-auto w-full"
            >
              <div
                className="p-5 space-y-5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "24px" }}
              >
                <div>
                  <h2 className="text-sm font-extrabold tracking-wide" style={{ color: "#f3f0ff", fontWeight: 800 }}>
                    Passerelle de dépôt manuel
                  </h2>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(200,185,255,0.65)" }}>
                    Traitement sécurisé via Mobile Money régional.
                  </p>
                </div>

                {/* Operator selector */}
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { id: "mtn_momo", label: "MTN MoMo", badge: "🟡" },
                    { id: "orange_money", label: "Orange Money", badge: "🟠" },
                  ] as const).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className="flex flex-col items-center gap-1.5 p-4 text-center transition-all"
                      style={
                        method === m.id
                          ? { background: "rgba(124,58,237,0.12)", border: "2px solid rgba(124,58,237,0.4)", borderRadius: "16px" }
                          : { background: "rgba(255,255,255,0.04)", border: "2px solid rgba(255,255,255,0.08)", borderRadius: "16px" }
                      }
                    >
                      <span className="text-lg">{m.badge}</span>
                      <span className="text-xs font-extrabold tracking-tight" style={{ color: "#f3f0ff", fontWeight: 800 }}>{m.label}</span>
                      {method === m.id && <CheckCircle2 className="w-3.5 h-3.5 mt-0.5" style={{ color: "#a78bfa" }} />}
                    </button>
                  ))}
                </div>

                {/* Payment instructions */}
                <div
                  className="p-4 space-y-2"
                  style={{ background: "#0e0b1a", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "12px" }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Instruction d'envoi :
                  </p>
                  <p className="text-xs font-medium" style={{ color: "rgba(200,185,255,0.65)" }}>
                    Effectue un transfert de exactement{" "}
                    <span className="font-extrabold" style={{ color: "#f3f0ff", fontWeight: 800 }}>{planPrice} FCFA</span>{" "}
                    au numéro ci-dessous :
                  </p>
                  <div
                    className="flex items-center justify-between px-3.5 py-2.5"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                  >
                    <span className="text-base font-extrabold tracking-wider" style={{ color: "#f3f0ff", fontWeight: 800 }}>
                      {paymentNumber}
                    </span>
                    <span
                      className="text-[9px] font-bold px-2 py-0.5"
                      style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)", borderRadius: "8px" }}
                    >
                      {method === "mtn_momo" ? "MTN" : "Orange"}
                    </span>
                  </div>
                  <p className="text-[9px] leading-normal pt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Note : n'ajoute aucun motif textuel lors de l'envoi pour accélérer le rapprochement automatique. Renseigne ton numéro de transaction ci-dessous après validation.
                  </p>
                </div>

                {/* Phone input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Numéro émetteur (celui qui a payé)
                  </label>
                  <div
                    className="flex items-center gap-2 px-3.5 py-3 transition-all"
                    style={{ background: "#13101f", border: "1px solid rgba(167,139,250,0.2)", borderRadius: "12px" }}
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.35)" }} />
                    <input
                      type="tel"
                      placeholder="Ex: 67X XX XX XX"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="flex-1 text-xs font-bold outline-none bg-transparent"
                      style={{ color: "#f3f0ff" }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmitRequest}
                  disabled={loading || !phone.trim()}
                  className="w-full py-4 text-sm font-extrabold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "linear-gradient(135deg,#E91E8C,#f43f5e)",
                    borderRadius: "12px",
                    color: "#fff",
                    fontWeight: 800,
                  }}
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    "Confirmer mon transfert"
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ══ STEP 3: CONFIRM ══ */}
          {step === "confirm" && requestData && (() => {
            if (typeof (window as any).fbq === "function" && !sessionStorage.getItem("gs_pixel_purchase_fired")) {
              (window as any).fbq("track", "Purchase", {
                value: planPrice,
                currency: "XAF",
                contents: [{ id: "premium_lifetime", quantity: 1 }],
                content_ids: "XAF",
              });
              sessionStorage.setItem("gs_pixel_purchase_fired", "1");
            }
            return null;
          })()}
          {step === "confirm" && requestData && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 max-w-md mx-auto w-full space-y-4"
            >
              {/* Confirmation card */}
              <div
                className="p-6 text-center space-y-4"
                style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "24px" }}
              >
                <div
                  className="w-12 h-12 flex items-center justify-center mx-auto"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "12px" }}
                >
                  <CheckCircle2 className="w-5 h-5" style={{ color: "#6ee7b7" }} />
                </div>

                <div>
                  <h2 className="text-base font-extrabold tracking-tight" style={{ color: "#f3f0ff", fontWeight: 800 }}>
                    Demande prise en charge
                  </h2>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(200,185,255,0.65)" }}>
                    Les logs de paiement ont été transmis au registre réseau. Validation finale sous 24 heures maximum.
                  </p>
                </div>

                {/* Reference display */}
                <div
                  className="p-4 text-center space-y-1 relative"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "16px" }}
                >
                  <span className="text-[9px] font-bold uppercase tracking-widest block" style={{ color: "rgba(255,255,255,0.35)" }}>
                    Référence système unique
                  </span>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-lg font-extrabold tracking-wider" style={{ color: "#f3f0ff", fontWeight: 800 }}>
                      {requestData.reference}
                    </span>
                    <button
                      onClick={() => copyRef(requestData.reference)}
                      className="p-1.5 transition-all active:scale-90"
                      style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px" }}
                    >
                      {copied
                        ? <Check className="w-3.5 h-3.5" style={{ color: "#6ee7b7" }} />
                        : <Copy className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
                      }
                    </button>
                  </div>
                </div>

                {/* WhatsApp CTA */}
                {requestData.ownerWaUrl && (
                  <a
                    href={requestData.ownerWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 font-extrabold text-xs tracking-widest transition-all active:scale-[0.98]"
                    style={{
                      background: "#10b981",
                      borderRadius: "12px",
                      color: "#fff",
                      fontWeight: 800,
                    }}
                  >
                    Envoyer le reçu sur WhatsApp
                  </a>
                )}

                <button
                  onClick={() => setLocation("/")}
                  className="w-full py-3 text-xs font-bold transition-all active:scale-[0.98]"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "9999px",
                    color: "#f3f0ff",
                    fontWeight: 700,
                  }}
                >
                  Retour à l'application
                </button>
              </div>

              {/* Validation protocol */}
              <div
                className="p-4 space-y-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "24px" }}
              >
                <div className="flex items-center gap-2" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Protocole de validation</span>
                </div>
                <ul className="text-[11px] font-medium space-y-1.5 list-disc list-inside" style={{ color: "rgba(200,185,255,0.65)" }}>
                  <li>Vérification du hachage de la transaction Mobile Money.</li>
                  <li>Déploiement des accès illimités sur ton ID utilisateur.</li>
                  <li>Crédit automatique des points de fidélité au premier scan.</li>
                </ul>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
