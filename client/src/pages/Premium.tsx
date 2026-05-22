import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Star, CheckCircle2, Clock, ArrowLeft, Phone, Sparkles, Shield, Zap, FileText, ChevronRight, Copy, Check } from "lucide-react";
//import founderConf from "@assets/IMG_9168_1775960551739.png";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const MTN_NUMBER = "674377959";
const ORANGE_NUMBER = "690501392";
const OWNER_WA = "237674377959";

const FEATURES_FREE = [
  { icon: "✅", text: "1 analyse IA par mois" },
  { icon: "📊", text: "Métriques cutanées complètes" },
  { icon: "🧠", text: "Analyse expert personnalisée" },
  { icon: "📈", text: "Historique de tes scans" },
  { icon: "🏆", text: "Défis entre amis" },
];

const FEATURES_PREMIUM = [
  { icon: "♾️", text: "Analyses illimitées chaque mois" },
  { icon: "🧴", text: "Routine matin & soir personnalisée" },
  { icon: "🛒", text: "Produits recommandés + commande directe" },
  { icon: "📄", text: "Rapport PDF exportable" },
  { icon: "⚡", text: "SkinBot IA illimité" },
  { icon: "🎁", text: "+100 pts fidélité offerts à l'activation" },
];

type Step = "offer" | "payment" | "confirm" | "pending";

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
  const [selectedPlan, setSelectedPlan] = useState<"weekly" | "monthly">("monthly");
  const planPrice = selectedPlan === "weekly" ? 500 : 2000;
  const planLabel = selectedPlan === "weekly" ? "500 FCFA / semaine" : "2 000 FCFA / mois";

  // Vérifier si une demande est déjà en attente
  const { data: statusData } = useQuery<{ request: { reference: string; status: string } | null }>({
    queryKey: ["/api/premium/status"],
    enabled: !!user && !isPremium,
  });

  const paymentNumber = method === "mtn_momo" ? MTN_NUMBER : ORANGE_NUMBER;

  const handleSubmitRequest = async () => {
    if (!phone.trim() || phone.trim().length < 8) {
      toast({ title: "Numéro invalide", description: "Saisis ton numéro de téléphone Mobile Money", variant: "destructive" });
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
      // Événement Meta Pixel — initiation de paiement Premium
      if (typeof (window as any).fbq === "function") {
        (window as any).fbq("track", "InitiateCheckout", {
          value: 1000,
          currency: "XAF",
          content_name: "GlowScan Premium",
          content_ids: ["premium_monthly"],
        });
      }
      setStep("confirm");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message || "Réessaie dans un instant", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyRef = (ref: string) => {
    navigator.clipboard?.writeText(ref);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Si déjà premium ──
  if (isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-pink-100 flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-2xl bg-pink-100 border border-pink-200 flex items-center justify-center mb-4">
          <Crown className="w-8 h-8 text-pink-500" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">Tu es déjà Premium !</h1>
        <p className="text-gray-500 text-sm text-center mb-6">Profite de toutes les fonctionnalités sans limite.</p>
        <button onClick={() => setLocation("/")} className="bg-pink-500 text-white font-bold px-6 py-3 rounded-2xl">
          Retour à l'accueil
        </button>
      </div>
    );
  }

  // ── Si demande déjà en attente ──
  if (statusData?.request?.status === "pending" && step === "offer") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="p-4 flex items-center gap-3 bg-white border-b border-gray-100">
          <button onClick={() => setLocation(-1 as any)} className="p-2 rounded-xl hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-base font-black text-gray-900">Premium GlowScan</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 rounded-2xl bg-pink-100 border border-pink-200 flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-pink-500" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2 text-center">Demande en attente</h2>
          <p className="text-sm text-gray-500 text-center mb-4">
            Ta demande avec la référence <span className="font-black text-pink-600">{statusData.request.reference}</span> est en cours de vérification.
          </p>
          <p className="text-xs text-gray-400 text-center">L'activation se fait généralement dans les 24h après réception du paiement.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => step === "offer" ? setLocation(-1 as any) : setStep("offer")} className="p-2 rounded-xl hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="text-base font-black text-gray-900">Premium GlowScan</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        <AnimatePresence mode="wait">

          {/* ══════════ ÉTAPE 1 : OFFRE ══════════ */}
          {step === "offer" && (
            <motion.div key="offer" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-4">

              {/* Hero */}
              <div className="relative rounded-3xl overflow-hidden" style={{ background: "linear-gradient(135deg, #92400e 0%, #b8860b 40%, #d4a017 70%, #c9a84c 100%)" }}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, white 0%, transparent 50%)" }} />
                <div className="relative p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3 border border-white/30">
                    <Crown className="w-7 h-7 text-white" />
                  </div>
                  <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    GlowScan Premium
                  </h2>
                  <p className="text-white/80 text-sm mb-4">Prends soin de ta peau sans limite</p>
                  {/* Sélecteur de plan */}
                  <div className="flex gap-2 justify-center mb-3">
                    {([{ key: "weekly", label: "500 FCFA / sem." }, { key: "monthly", label: "2 000 FCFA / mois" }] as const).map(p => (
                      <button key={p.key} onClick={() => setSelectedPlan(p.key)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${selectedPlan === p.key ? "bg-white text-pink-700 border-white" : "bg-white/10 text-white/70 border-white/20"}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-2xl px-6 py-3 inline-block border border-white/30">
                    <p className="text-3xl font-black text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>{planLabel}</p>
                    <p className="text-white/70 text-xs">annulable à tout moment</p>
                  </div>
                </div>
              </div>

              {/* Comparaison */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Ce que tu obtiens</p>

                <div className="mb-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-pink-600 mb-2">✓ Gratuit — déjà inclus</p>
                  <div className="space-y-1.5">
                    {FEATURES_FREE.map(f => (
                      <div key={f.text} className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="text-sm">{f.icon}</span>
                        <span>{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-dashed border-pink-200 pt-4">
                  <p className="text-[11px] font-black uppercase tracking-wider text-pink-600 mb-2">⭐ Premium — nouvelles fonctionnalités</p>
                  <div className="space-y-2">
                    {FEATURES_PREMIUM.map(f => (
                      <div key={f.text} className="flex items-center gap-2">
                        <span className="text-sm">{f.icon}</span>
                        <span className="text-sm font-semibold text-gray-800">{f.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mot du fondateur */}
              <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
                <div className="relative h-52 overflow-hidden">
                  <img src={founderConf} alt="Démise Essawe" className="w-full h-full object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-4">
                    <p className="text-white text-sm font-black">Démise Essawe</p>
                    <p className="text-white/70 text-[10px]">Fondateur de GlowScan · Douala</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-pink-600 mb-2">👤 Mot du fondateur</p>
                  <p className="text-sm text-gray-600 italic leading-relaxed">
                    "J'ai créé GlowScan parce que les peaux africaines méritaient enfin une IA qui les comprend vraiment. Premium, c'est l'outil complet pour prendre soin de toi chaque jour, sans limite."
                  </p>
                </div>
              </div>

              {/* Garanties */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <Shield className="w-4 h-4 text-pink-500" />, label: "Paiement sécurisé" },
                  { icon: <Zap className="w-4 h-4 text-pink-500" />, label: "Activation rapide" },
                  { icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />, label: "Annulable" },
                ].map(({ icon, label }) => (
                  <div key={label} className="bg-white rounded-2xl p-3 text-center shadow-sm border border-gray-100">
                    <div className="flex justify-center mb-1">{icon}</div>
                    <p className="text-[10px] font-bold text-gray-600 leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              {!user ? (
                <a href="/auth" className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white shadow-lg active:scale-[0.98] transition-all"
                  style={{ background: "linear-gradient(135deg, #b8860b 0%, #d4a017 100%)", boxShadow: "0 8px 24px rgba(184,134,11,0.35)", fontFamily: "'Outfit', sans-serif" }}>
                  <Crown className="w-5 h-5" />
                  Créer mon compte pour continuer
                </a>
              ) : (
                <button
                  onClick={() => setStep("payment")}
                  data-testid="button-go-to-payment"
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white shadow-lg active:scale-[0.98] transition-all"
                  style={{ background: "linear-gradient(135deg, #b8860b 0%, #d4a017 100%)", boxShadow: "0 8px 24px rgba(184,134,11,0.35)", fontFamily: "'Outfit', sans-serif" }}
                >
                  <Crown className="w-5 h-5" />
                  Passer à Premium — {planLabel}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          )}

          {/* ══════════ ÉTAPE 2 : PAIEMENT ══════════ */}
          {step === "payment" && (
            <motion.div key="payment" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-4">

              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                <h2 className="text-base font-black text-gray-900 mb-1">Choisis ton mode de paiement</h2>
                <p className="text-xs text-gray-400 mb-5">Mobile Money — paiement local, sécurisé</p>

                {/* Méthode */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {([
                    { id: "mtn_momo", label: "MTN MoMo", color: "bg-yellow-400", emoji: "🟡" },
                    { id: "orange_money", label: "Orange Money", color: "bg-orange-400", emoji: "🟠" },
                  ] as const).map(m => (
                    <button
                      key={m.id}
                      onClick={() => setMethod(m.id)}
                      data-testid={`button-method-${m.id}`}
                      className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                        method === m.id ? "border-pink-500 bg-pink-50" : "border-gray-200 bg-gray-50"
                      }`}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="text-xs font-black text-gray-800">{m.label}</span>
                      {method === m.id && <CheckCircle2 className="w-4 h-4 text-pink-500" />}
                    </button>
                  ))}
                </div>

                {/* Instructions de paiement */}
                <div className="bg-pink-50 rounded-2xl p-4 border border-pink-200 mb-5">
                  <p className="text-xs font-black text-pink-700 mb-2">
                    📲 Envoie exactement <span className="text-pink-600">{planPrice} FCFA</span> au :
                  </p>
                  <div className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-pink-200">
                    <span className="text-lg font-black text-gray-900" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {paymentNumber}
                    </span>
                    <span className="text-xs font-bold text-pink-600 bg-pink-100 px-2 py-1 rounded-lg">
                      {method === "mtn_momo" ? "MTN MoMo" : "Orange Money"}
                    </span>
                  </div>
                  <p className="text-[10px] text-pink-700 mt-2">
                    ⚠️ Ne mets aucun message dans le paiement Mobile Money — saisis juste ton numéro ci-dessous.
                  </p>
                </div>

                {/* Numéro de paiement */}
                <div className="mb-5">
                  <label className="text-xs font-black text-gray-700 mb-2 block">
                    Ton numéro {method === "mtn_momo" ? "MTN" : "Orange"} utilisé pour le paiement
                  </label>
                  <div className="flex items-center gap-2 border-2 border-gray-200 rounded-2xl px-4 py-3 focus-within:border-pink-500 transition-colors">
                    <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <input
                      type="tel"
                      placeholder="ex: 675 000 000"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      data-testid="input-payment-phone"
                      className="flex-1 text-sm font-bold text-gray-900 outline-none bg-transparent placeholder-gray-300"
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Ce numéro nous permet de vérifier ton paiement</p>
                </div>

                <button
                  onClick={handleSubmitRequest}
                  disabled={loading || !phone.trim()}
                  data-testid="button-submit-payment"
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white active:scale-[0.98] transition-all disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #b8860b 0%, #d4a017 100%)", boxShadow: "0 8px 24px rgba(184,134,11,0.35)", fontFamily: "'Outfit', sans-serif" }}
                >
                  {loading ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      J'ai effectué le paiement
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* ══════════ ÉTAPE 3 : CONFIRMATION ══════════ */}
          {step === "confirm" && requestData && (() => {
            // Événement Meta Pixel — souscription Premium déclarée
            if (typeof (window as any).fbq === "function" && !sessionStorage.getItem("gs_pixel_purchase_fired")) {
              (window as any).fbq("track", "Purchase", {
                value: 1000,
                currency: "XAF",
                contents: [{ id: "1000", quantity: 1 }],
                content_ids: "XAF",
              });
              sessionStorage.setItem("gs_pixel_purchase_fired", "1");
            }
            return null;
          })()}
          {step === "confirm" && requestData && (
            <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-4 space-y-4">

              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-xl font-black text-gray-900 mb-2">Demande enregistrée !</h2>
                <p className="text-sm text-gray-500 mb-5">
                  Ton paiement est en cours de vérification. L'activation se fait généralement dans les <span className="font-bold text-gray-700">24 heures</span>.
                </p>

                {/* Référence */}
                <div className="bg-pink-50 rounded-2xl p-4 border border-pink-200 mb-5">
                  <p className="text-xs text-pink-700 font-bold mb-2">Ta référence de paiement</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-pink-700" style={{ fontFamily: "'Outfit', sans-serif" }}>
                      {requestData.reference}
                    </span>
                    <button
                      onClick={() => copyRef(requestData.reference)}
                      className="p-2 rounded-xl bg-pink-100 border border-pink-200 active:scale-95 transition-all"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-pink-600" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-pink-600 mt-1">Garde cette référence en cas de besoin</p>
                </div>

                {/* Envoyer preuve sur WhatsApp */}
                {requestData.ownerWaUrl && (
                  <a
                    href={requestData.ownerWaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="button-confirm-whatsapp"
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-sm text-white mb-3 active:scale-[0.98] transition-all"
                    style={{ background: "#25D366", boxShadow: "0 6px 20px rgba(37,211,102,0.35)", fontFamily: "'Outfit', sans-serif" }}
                  >
                    <span className="text-lg">💬</span>
                    Envoyer la confirmation WhatsApp
                  </a>
                )}

                <button onClick={() => setLocation("/")} className="w-full py-3 rounded-2xl text-sm font-bold text-gray-500 bg-gray-100 active:scale-[0.98] transition-all">
                  Retour à l'accueil
                </button>
              </div>

              <div className="bg-pink-50 rounded-2xl p-4 border border-pink-100">
                <p className="text-xs text-pink-700 font-bold mb-1">📌 Que se passe-t-il ensuite ?</p>
                <ol className="text-xs text-pink-600 space-y-1 list-decimal list-inside">
                  <li>Notre équipe vérifie ton paiement Mobile Money</li>
                  <li>Ton compte est activé en Premium sous 24h</li>
                  <li>Tu reçois +100 pts fidélité offerts</li>
                  <li>Tu accèdes immédiatement à ta routine et tes produits</li>
                </ol>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
