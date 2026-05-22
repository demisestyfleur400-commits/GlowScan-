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

const FEATURES_FREE = [
  { text: "1 analyse faciale IA par mois" },
  { text: "Métriques cutanées de base" },
  { text: "Historique de tes scans sauvegardé" },
];

const FEATURES_PREMIUM = [
  { text: "Analyses IA illimitées 24h/24" },
  { text: "Génération de routines d'ordonnance matin & soir" },
  { text: "Recommandations de molécules et produits ciblés" },
  { text: "Rapport d'évolution PDF exportable pour spécialiste" },
  { text: "Accès illimité au modèle d'analyse SkinBot" },
  { text: "Crédit de +100 points de fidélité immédiat" },
];

type Step = "offer" | "payment" | "confirm";

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
  const planLabel = "2 000 FCFA — ACCÈS À VIE";

  // Statut de la requête
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
        variant: "destructive" 
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

      // Suivi Meta Pixel
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

  // ── ÉTAT : DÉJÀ PREMIUM ──
  if (isPremium) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/10">
          <Crown className="w-6 h-6 text-blue-400" />
        </div>
        <h1 className="text-xl font-black uppercase tracking-tight mb-2">Licence Active</h1>
        <p className="text-slate-400 text-xs max-w-xs mx-auto mb-6">Tu disposes d'un accès à vie complet aux infrastructures et analyses de GlowScan.</p>
        <Button onClick={() => setLocation("/")} variant="default" className="w-full max-w-xs">
          Retour au Tableau de Bord
        </Button>
      </div>
    );
  }

  // ── ÉTAT : EN ATTENTE DE VÉRIFICATION ──
  if (statusData?.request?.status === "pending" && step === "offer") {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="p-4 flex items-center gap-3 bg-white border-b border-slate-200">
          <button onClick={() => setLocation(-1 as any)} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </button>
          <span className="text-xs font-black uppercase tracking-widest text-slate-900">Vérification de licence</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
            <Clock className="w-5 h-5 text-amber-600 animate-pulse" />
          </div>
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight mb-1">Transaction en cours</h2>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4 leading-relaxed">
            Ta demande avec la référence <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{statusData.request.reference}</span> est en cours de validation par nos équipes.
          </p>
          <p className="text-[10px] font-medium text-slate-400 max-w-xs">L'activation définitive sur le réseau s'effectue généralement dans un délai inférieur à 24 heures.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Clinique */}
      <div className="bg-white border-b border-slate-200/60 px-4 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => step === "offer" ? setLocation(-1 as any) : setStep("offer")} className="p-2 rounded-xl hover:bg-slate-50 transition-all border border-transparent active:border-slate-200">
          <ArrowLeft className="w-4 h-4 text-slate-700" />
        </button>
        <span className="text-xs font-black uppercase tracking-widest text-slate-900">GlowScan Architecture</span>
      </div>

      <div className="flex-1 overflow-y-auto pb-12">
        <AnimatePresence mode="wait">

          {/* ══════════ ÉTAPE 1 : L'OFFRE UNIQUE ══════════ */}
          {step === "offer" && (
            <motion.div key="offer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 space-y-5 max-w-md mx-auto w-full">

              {/* Hero Card - Black Tech & Deep Blue Accent */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-900 bg-slate-950 text-white shadow-xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative p-6 text-center">
                  <Badge className="bg-blue-600 hover:bg-blue-600 text-white border-0 text-[9px] font-black tracking-widest py-1 mb-4 uppercase">
                    Offre de lancement
                  </Badge>
                  <h2 className="text-xl font-black uppercase tracking-tight mb-1">
                    Mise à niveau à vie
                  </h2>
                  <p className="text-slate-400 text-xs mb-6">Débloque la puissance maximale de l'analyse cutanée faciale.</p>
                  
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl px-5 py-3.5 inline-block w-full">
                    <p className="text-2xl font-black tracking-tight text-white">{planLabel}</p>
                    <p className="text-slate-500 text-[10px] font-medium mt-0.5">Aucun abonnement hidden · Paiement unique</p>
                  </div>
                </div>
              </div>

              {/* Matrice des fonctionnalités */}
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-xs space-y-4">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-2.5">Accès Standard (Limité)</span>
                  <div className="space-y-2">
                    {FEATURES_FREE.map(f => (
                      <div key={f.text} className="flex items-start gap-2.5 text-xs text-slate-500 font-medium">
                        <span className="text-slate-300 mt-0.5">✕</span>
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 block mb-2.5">Infrastructures Débloquées Premium</span>
                  <div className="space-y-2.5">
                    {FEATURES_PREMIUM.map(f => (
                      <div key={f.text} className="flex items-start gap-2.5 text-xs font-semibold text-slate-800">
                        <CheckCircle2 className="w-4 h-4 text-slate-950 shrink-0 mt-0.5" />
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section d'autorité technique */}
              <div className="bg-white rounded-2xl overflow-hidden border border-slate-200/60 shadow-xs p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 text-white font-black text-sm">
                  DE
                </div>
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Note d'ingénierie</span>
                  <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-1">
                    "Nous développons des modèles algorithmiques entraînés spécifiquement sur les variations mélaniques et climatiques d'Afrique centrale. L'accès à vie nous permet de financer la puissance de calcul nécessaire sans imposer de rentes récurrentes à notre communauté."
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 block mt-1.5">— Demise Essawe, Fondateur GlowScan</span>
                </div>
              </div>

              {/* Garanties */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Shield className="w-3.5 h-3.5 text-slate-900" />, label: "Protocole MOMO/OM Chiffré" },
                  { icon: <Zap className="w-3.5 h-3.5 text-slate-900" />, label: "Activation Serveur Rapide" },
                ].map(({ icon, label }) => (
                  <div key={label} className="bg-white rounded-xl p-3 border border-slate-200/60 flex items-center gap-2.5 shadow-2xs">
                    {icon}
                    <p className="text-[10px] font-bold text-slate-700 leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              {/* Action principal */}
              {!user ? (
                <Button onClick={() => setLocation("/auth")} variant="premium" className="w-full py-6 text-xs uppercase tracking-widest font-black">
                  Créer un compte pour s'enregistrer
                </Button>
              ) : (
                <Button onClick={() => setStep("payment")} variant="premium" className="w-full py-6 text-xs uppercase tracking-widest font-black group">
                  Obtenir mon accès permanent
                  <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              )}
            </motion.div>
          )}

          {/* ══════════ ÉTAPE 2 : LE PAIEMENT LOCAL ══════════ */}
          {step === "payment" && (
            <motion.div key="payment" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 max-w-md mx-auto w-full">
              <div className="bg-white rounded-2xl p-5 border border-slate-200/60 shadow-xs space-y-5">
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Passerelle de dépôt manuel</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Traitement sécurisé via Mobile Money régional.</p>
                </div>

                {/* Sélecteur d'opérateur */}
                <div className="grid grid-cols-2 gap-3">
                  {( [
                    { id: "mtn_momo", label: "MTN MoMo", badge: "🟡" },
                    { id: "orange_money", label: "Orange Money", badge: "🟠" },
                  ] as const).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 text-center transition-all ${
                        method === m.id ? "border-slate-950 bg-slate-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <span className="text-lg">{m.badge}</span>
                      <span className="text-xs font-black tracking-tight text-slate-900">{m.label}</span>
                      {method === m.id && <CheckCircle2 className="w-3.5 h-3.5 text-slate-950 mt-0.5" />}
                    </button>
                  ))}
                </div>

                {/* Encadré des coordonnées de transfert */}
                <div className="bg-slate-950 text-white rounded-xl p-4 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Instruction d'envoi requis :
                  </p>
                  <p className="text-xs font-semibold text-slate-200">
                    Effectue un transfert de exactement <span className="text-white font-black">{planPrice} FCFA</span> au numéro ci-dessous :
                  </p>
                  <div className="flex items-center justify-between bg-white/[0.04] border border-white/10 rounded-lg px-3.5 py-2.5 font-mono">
                    <span className="text-base font-black tracking-wider text-white">
                      {paymentNumber}
                    </span>
                    <span className="text-[9px] font-black bg-white/10 px-2 py-0.5 rounded uppercase text-slate-300">
                      {method === "mtn_momo" ? "MTN" : "Orange"}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 leading-normal pt-1">
                    ⚠️ Note : N'ajoute aucun motif textuel lors de l'envoi pour accélérer le rapprochement automatique. Renseigne ton numéro de transaction ci-dessous après validation.
                  </p>
                </div>

                {/* Saisie du numéro émetteur */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
                    Numéro de Téléphone Émetteur (Celui qui a payé)
                  </label>
                  <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3.5 py-3 bg-slate-50/50 focus-within:bg-white focus-within:border-slate-950 transition-all">
                    <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <input
                      type="tel"
                      placeholder="Ex: 67X XX XX XX"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="flex-1 text-xs font-bold text-slate-900 outline-none bg-transparent placeholder-slate-300"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSubmitRequest}
                  disabled={loading || !phone.trim()}
                  variant="premium"
                  className="w-full py-5 text-xs font-black uppercase tracking-widest"
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    "Confirmer mon transfert"
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ══════════ ÉTAPE 3 : CONFIRMATION ET RÉFÉRENCE ══════════ */}
          {step === "confirm" && requestData && (() => {
            // Déclenchement Pixel Achat Réussi
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
            <motion.div key="confirm" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-4 max-w-md mx-auto w-full space-y-4">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-xs text-center space-y-4">
                <div className="w-12 h-12 rounded-xl bg-slate-950 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                
                <div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Demande Prise en Charge</h2>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Les logs de paiement ont été transmis au registre réseau. Validation finale sous 24 heures maximum.
                  </p>
                </div>

                {/* Affichage Référence */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center space-y-1 relative group">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Référence Système Unique</span>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-lg font-mono font-black text-slate-900 tracking-wider">
                      {requestData.reference}
                    </span>
                    <button
                      onClick={() => copyRef(requestData.reference)}
                      className="p-1.5 rounded-lg border border-slate-200 bg-white active:scale-90 transition-all hover:bg-slate-50"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                    </button>
                  </div>
                </div>

                {/* Routage WhatsApp Externe Direct */}
                {requestData.ownerWaUrl && (
                  <a
                    href={requestData.ownerWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-md transition-all active:scale-[0.98]"
                  >
                    💬 Envoyer le reçu sur WhatsApp
                  </a>
                )}

                <Button onClick={() => setLocation("/")} variant="outline" className="w-full">
                  Retour à l'application
                </Button>
              </div>

              {/* Terminal Logs d'activation */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/60 space-y-2">
                <div className="flex items-center gap-2 text-slate-400">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Protocole de validation</span>
                </div>
                <ul className="text-[11px] font-medium text-slate-600 space-y-1.5 list-disc list-inside">
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
