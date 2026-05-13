import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, User, Phone, MapPin, FileText, Check, Package } from "lucide-react";
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
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  const [orderNum, setOrderNum] = useState("");

  const canSubmit = name.trim() && phone.trim() && address.trim();

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

    const notesLine = notes.trim() ? `\n\n📝 *Notes :* ${notes.trim()}` : "";

    const message =
      `📦 *NOUVELLE COMMANDE GLOWSCAN*\n\n` +
      `*N° :* ${oNum}\n\n` +
      `*CLIENT :*\n👤 ${name}\n📞 ${phone}\n📍 ${address}` +
      `${scanLine}\n\n` +
      `*PRODUITS :*\n${itemsList}` +
      `${totalLine}` +
      `${notesLine}\n\n` +
      `💳 Paiement à la livraison`;

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
      setAddress("");
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
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

          {/* Sheet */}
          <motion.div
            className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-pink-600" />
                <p className="text-base font-black text-gray-900">{title || "Commander"}</p>
              </div>
              <button onClick={handleClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-90 transition-all">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            <div className="px-5 py-4 max-h-[80vh] overflow-y-auto">
              {sent ? (
                /* Confirmation */
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-8 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-gray-900">Commande envoyée !</p>
                    <p className="text-sm text-gray-500 mt-1">N° <span className="font-bold text-pink-600">{orderNum}</span></p>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Votre commande a été transmise. Vous serez contacté(e) pour confirmer la livraison.
                  </p>
                  <button
                    onClick={handleClose}
                    className="w-full py-3 bg-pink-600 text-white text-sm font-bold rounded-2xl active:scale-[0.98] transition-all"
                  >
                    Fermer
                  </button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {/* Récap produits */}
                  <div className="bg-gray-50 rounded-2xl p-3 space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Votre commande</p>
                    {items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{item.productName}</p>
                          <p className="text-[10px] text-gray-400">{item.brand}{item.quantity && item.quantity > 1 ? ` · ×${item.quantity}` : ""}</p>
                        </div>
                        {item.price && (
                          <span className="text-sm font-extrabold text-pink-600 ml-2 flex-shrink-0">
                            {formatPrice(item.price * (item.quantity || 1))}
                          </span>
                        )}
                      </div>
                    ))}
                    {items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0) > 0 && (
                      <div className="pt-2 border-t border-gray-200 flex justify-between">
                        <span className="text-sm font-bold text-gray-700">Total</span>
                        <span className="text-sm font-black text-gray-900">
                          {formatPrice(items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Formulaire client */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Vos informations</p>

                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Nom complet *"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                        data-testid="input-order-name"
                      />
                    </div>

                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        placeholder="Numéro de téléphone *"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100"
                        data-testid="input-order-phone"
                      />
                    </div>

                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <textarea
                        placeholder="Adresse de livraison *"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        rows={2}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 resize-none"
                        data-testid="input-order-address"
                      />
                    </div>

                    <div className="relative">
                      <FileText className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                      <textarea
                        placeholder="Notes (optionnel) — couleur, taille, précision..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-100 resize-none"
                        data-testid="input-order-notes"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 text-center">
                    💳 Paiement à la livraison · Livraison à domicile
                  </p>

                  <button
                    onClick={handleSend}
                    disabled={!canSubmit}
                    data-testid="button-confirm-order"
                    className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.98] ${
                      canSubmit
                        ? "bg-[#25D366] text-white shadow-lg shadow-green-200/50"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <MessageCircle className="w-4 h-4 fill-current" />
                    Confirmer via WhatsApp
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
