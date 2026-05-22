import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, User, Phone, MapPin, FileText, Check, Package, Sparkles } from "lucide-react";
import { formatPrice } from "@shared/catalog";
import { trackWhatsappClick } from "@/lib/analytics";

// ── Numéro propriétaire GlowScan (TOUTES les commandes passent par là) ──
const OWNER_PHONE = "237674377959";

export interface OrderItem {
  productId: string;
  productName: string;
  brand: string;
  price?: number;
  quantity?: number;
}

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: OrderItem[];
  scanContext?: {
    skinType?: string;
    condition?: string;
    score?: number;
  };
  title?: string;
}

function generateOrderNumber() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "GS-";
  for (let i = 0; i < 6; i++) r += chars[Math.floor(Math.random() * chars.length)];
  return r;
}

export default function OrderModal({ isOpen, onClose, items, scanContext, title }: OrderModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("Douala"); // Pré-rempli par défaut pour aller vite
  const [neighborhood, setNeighborhood] = useState("");
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  const [orderNum, setOrderNum] = useState("");

  // Validation stricte adaptée à la réalité locale
  const canSubmit = name.trim() && phone.trim() && city.trim() && neighborhood.trim();

  const handleSend = () => {
    if (!canSubmit) return;

    const oNum = generateOrderNumber();
    setOrderNum(oNum);

    const itemsList = items.map(item => {
      const qty = item.quantity && item.quantity > 1 ? ` ×${item.quantity}` : "";
      const priceStr = item.price ? ` — ${formatPrice(item.price * (item.quantity || 1))}` : "";
      return `• ${item.productName}${qty}${priceStr} (${item.brand})`;
    }).join("\n");

    const total = items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
    const totalLine = total > 0 ? `\n\n💰 *Total : ${formatPrice(total)}*` : "";

    const scanLine = scanContext
      ? `\n📋 *Analyse GlowScan :* ${scanContext.condition || "—"} · Score ${scanContext.score ?? "—"}/100 · ${scanContext.skinType || "—"}`
      : "";

    const notesLine = notes.trim() ? `\n\n📝 *Précisions de livraison :* ${notes.trim()}` : "";

    const message =
      `📦 *NOUVELLE COMMANDE GLOWSCAN*\n\n` +
      `*N° :* ${oNum}\n\n` +
      `*INFOS CLIENT :*\n👤 Nom : ${name}\n📞 Tél : ${phone}\n📍 Ville : ${city}\n🏠 Quartier/Repère : ${neighborhood}` +
      `${scanLine}\n\n` +
      `*PRODUITS COMMANDÉS :*\n${itemsList}` +
      `${totalLine}` +
      `${notesLine}\n\n` +
      `💳 *Mode de paiement :* Cash à la livraison (MoMo / Orange Money / Espèces)`;

    const url = `https://wa.me/${OWNER_PHONE}?text=${encodeURIComponent(message)}`;

    items.forEach(item => {
      trackWhatsappClick(item.productId, item.productName, item.brand, `+${OWNER_PHONE}`);
    });

    window.open(url, "_blank");
    setSent(true);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setSent(false);
      setOrderNum("");
      setName("");
      setPhone("");
      setCity("Douala");
      setNeighborhood("");
      setNotes("");
    }, 300);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay arrière-plan */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

          {/* Feuille de formulaire */}
          <motion.div
            className="relative w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-pink-50 flex items-center justify-center">
                  <Package className="w-4 h-4 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-950 uppercase tracking-wide">{title || "Finaliser la commande"}</p>
                  <p className="text-[10px] text-gray-400 font-medium">Étape finale · Paiement sécurisé à la livraison</p>
                </div>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center active:scale-90 transition-all border border-gray-100">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Corps défilant */}
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-5 backend-scroll">
              {sent ? (
                /* Écran Succès */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto border border-emerald-100">
                    <Check className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">En route vers WhatsApp...</p>
                    <p className="text-xs text-gray-400 mt-1">Numéro de suivi provisoire : <span className="font-extrabold text-pink-600">{orderNum}</span></p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-xs mx-auto">
                    Appuie sur envoyer dans l'application WhatsApp pour valider ton panier auprès du service client GlowScan.
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full py-3.5 bg-gray-900 text-white text-xs font-black uppercase tracking-wider rounded-xl active:scale-[0.98] transition-all shadow-md"
                  >
                    Revenir à mon diagnostic
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-5">
                  {/* Récapitulatif produits */}
                  <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl p-4 border border-gray-100 space-y-2.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Détails du panier</p>
                    {items.map((item, i) => (
                      <div key={i} className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-gray-900 truncate">{item.productName}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{item.brand}{item.quantity && item.quantity > 1 ? ` · Qté: ${item.quantity}` : ""}</p>
                        </div>
                        {item.price && (
                          <span className="text-xs font-black text-gray-900 ml-2 flex-shrink-0">
                            {formatPrice(item.price * (item.quantity || 1))}
                          </span>
                        )}
                      </div>
                    ))}
                    {items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0) > 0 && (
                      <div className="pt-2.5 border-t border-gray-200/60 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-600">Net à payer à la livraison</span>
                        <span className="text-sm font-black text-pink-600">
                          {formatPrice(items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Formulaire client ciblé Cameroun */}
                  <div className="space-y-3.5">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Coordonnées de livraison</p>

                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Ton nom complet *"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500 focus:bg-white focus:ring-4 focus:ring-pink-50"
                        data-testid="input-order-name"
                      />
                    </div>

                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="Numéro de téléphone (WhatsApp ou MoMo) *"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500 focus:bg-white focus:ring-4 focus:ring-pink-50"
                        data-testid="input-order-phone"
                      />
                    </div>

                    {/* Grille Ville + Quartier pour s'adapter à la réalité locale */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="relative col-span-1">
                        <select
                          value={city}
                          onChange={e => setCity(e.target.value)}
                          className="w-full px-3 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:border-pink-500 focus:bg-white"
                        >
                          <option value="Douala">Douala</option>
                          <option value="Yaoundé">Yaoundé</option>
                          <option value="Kribi">Kribi</option>
                          <option value="Bafoussam">Bafoussam</option>
                          <option value="Buea">Buea</option>
                          <option value="Garoua">Garoua</option>
                        </select>
                      </div>
                      
                      <div className="relative col-span-2">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Quartier ou point de repère *"
                          value={neighborhood}
                          onChange={e => setNeighborhood(e.target.value)}
                          className="w-full pl-9 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500 focus:bg-white focus:ring-4 focus:ring-pink-50"
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <FileText className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <textarea
                        placeholder="Précisions pour le livreur (Optionnel) — ex: Barrière blanche, à côté de la pharmacie..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-pink-500 focus:bg-white focus:ring-4 focus:ring-pink-50 resize-none/60"
                        data-testid="input-order-notes"
                      />
                    </div>
                  </div>

                  {/* Bouton d'action à forte valeur ajoutée */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={handleSend}
                      disabled={!canSubmit}
                      data-testid="button-confirm-order"
                      className={`w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-[0.98] ${
                        canSubmit
                          ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-xl shadow-pink-600/20 hover:opacity-95"
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <MessageCircle className="w-4 h-4 fill-current" />
                      Envoyer ma commande sur WhatsApp
                    </button>
                    
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-400 font-medium">
                      <Sparkles className="w-3 h-3 text-pink-500" />
                      <span>Des frais de livraison locaux s'appliquent selon la zone.</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
