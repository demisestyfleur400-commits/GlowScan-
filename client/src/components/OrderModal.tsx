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
  /** Référence sourcing interne — visible UNIQUEMENT dans le message WhatsApp propriétaire */
  sourceRef?: string;
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
  const [city, setCity] = useState("Douala");
  const [neighborhood, setNeighborhood] = useState("");
  const [notes, setNotes] = useState("");
  const [sent, setSent] = useState(false);
  const [orderNum, setOrderNum] = useState("");

  const canSubmit = name.trim() && phone.trim() && city.trim() && neighborhood.trim();

  const handleSend = () => {
    if (!canSubmit) return;

    const oNum = generateOrderNumber();
    setOrderNum(oNum);

    const itemsList = items.map(item => {
      const qty = item.quantity && item.quantity > 1 ? ` ×${item.quantity}` : "";
      const priceStr = item.price ? ` — ${formatPrice(item.price * (item.quantity || 1))}` : "";
      const refLine = item.sourceRef ? `\n   → Sourcing: ${item.sourceRef}` : "";
      return `• ${item.productName}${qty}${priceStr} (${item.brand})${refLine}`;
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

  const inputBase: React.CSSProperties = {
    width: "100%",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 12,
    color: "#f3f0ff",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
    padding: "12px 16px",
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.72)",
              backdropFilter: "blur(8px)",
            }}
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 448,
              background: "#13101f",
              borderRadius: "28px 28px 0 0",
              overflow: "hidden",
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              border: "1px solid rgba(167,139,250,0.18)",
              borderBottom: "none",
            }}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            {/* Drag handle */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12 }}>
              <div style={{
                width: 40,
                height: 4,
                borderRadius: 9999,
                background: "rgba(255,255,255,0.15)",
              }} />
            </div>

            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 24px 14px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(167,139,250,0.1)",
                  border: "1px solid rgba(167,139,250,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <Package size={16} color="#a78bfa" strokeWidth={1.5} />
                </div>
                <div>
                  <p style={{
                    fontSize: 13,
                    fontWeight: 800,
                    color: "#f3f0ff",
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  }}>
                    {title || "Finaliser la commande"}
                  </p>
                  <p style={{
                    fontSize: 11,
                    color: "rgba(200,185,255,0.65)",
                    marginTop: 1,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  }}>
                    Paiement à la livraison · F CFA
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <X size={14} color="rgba(255,255,255,0.5)" strokeWidth={1.5} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ padding: "32px 0", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
                >
                  <div style={{
                    width: 64,
                    height: 64,
                    borderRadius: 9999,
                    background: "rgba(16,185,129,0.08)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}>
                    <Check size={28} color="#6ee7b7" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: "#f3f0ff",
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    }}>
                      En route vers WhatsApp...
                    </p>
                    <p style={{ fontSize: 12, color: "rgba(200,185,255,0.65)", marginTop: 4 }}>
                      Suivi provisoire :{" "}
                      <span style={{ fontWeight: 800, color: "#a78bfa" }}>{orderNum}</span>
                    </p>
                  </div>
                  <p style={{
                    fontSize: 12,
                    color: "rgba(200,185,255,0.65)",
                    lineHeight: 1.6,
                    maxWidth: 280,
                    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  }}>
                    Appuie sur envoyer dans WhatsApp pour valider ton panier auprès du service client GlowScan.
                  </p>
                  <button
                    onClick={handleClose}
                    style={{
                      width: "100%",
                      padding: "14px 0",
                      background: "#7c3aed",
                      border: "none",
                      borderRadius: 9999,
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: "pointer",
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    }}
                  >
                    Revenir à mon diagnostic
                  </button>
                </motion.div>
              ) : (
                <>
                  {/* Cart summary */}
                  <div style={{
                    background: "rgba(167,139,250,0.06)",
                    border: "1px solid rgba(167,139,250,0.18)",
                    borderRadius: 24,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}>
                    <p style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgba(200,185,255,0.65)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    }}>
                      Détails du panier
                    </p>
                    {items.map((item, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: "#f3f0ff",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                          }}>
                            {item.productName}
                          </p>
                          <p style={{ fontSize: 11, color: "rgba(200,185,255,0.65)" }}>
                            {item.brand}{item.quantity && item.quantity > 1 ? ` · Qté: ${item.quantity}` : ""}
                          </p>
                        </div>
                        {item.price && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#f3f0ff", flexShrink: 0 }}>
                            {formatPrice(item.price * (item.quantity || 1))}
                          </span>
                        )}
                      </div>
                    ))}
                    {items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0) > 0 && (
                      <div style={{
                        paddingTop: 10,
                        borderTop: "1px solid rgba(167,139,250,0.15)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}>
                        <span style={{ fontSize: 12, color: "rgba(200,185,255,0.65)", fontWeight: 600 }}>
                          Net à payer à la livraison
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#a78bfa" }}>
                          {formatPrice(items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Form */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "rgba(200,185,255,0.65)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                    }}>
                      Coordonnées de livraison
                    </p>

                    <div style={{ position: "relative" }}>
                      <User size={15} color="rgba(167,139,250,0.6)" strokeWidth={1.5} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                      <input
                        type="text"
                        placeholder="Ton nom complet *"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{ ...inputBase, paddingLeft: 40 }}
                        data-testid="input-order-name"
                      />
                    </div>

                    <div style={{ position: "relative" }}>
                      <Phone size={15} color="rgba(167,139,250,0.6)" strokeWidth={1.5} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} />
                      <input
                        type="tel"
                        placeholder="Numéro de téléphone (WhatsApp ou MoMo) *"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        style={{ ...inputBase, paddingLeft: 40 }}
                        data-testid="input-order-phone"
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
                      <select
                        value={city}
                        onChange={e => setCity(e.target.value)}
                        style={{ ...inputBase, padding: "12px 10px", cursor: "pointer" }}
                      >
                        <option value="Douala">Douala</option>
                        <option value="Yaoundé">Yaoundé</option>
                        <option value="Kribi">Kribi</option>
                        <option value="Bafoussam">Bafoussam</option>
                        <option value="Buea">Buea</option>
                        <option value="Garoua">Garoua</option>
                      </select>

                      <div style={{ position: "relative" }}>
                        <MapPin size={15} color="rgba(167,139,250,0.6)" strokeWidth={1.5} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                        <input
                          type="text"
                          placeholder="Quartier ou point de repère *"
                          value={neighborhood}
                          onChange={e => setNeighborhood(e.target.value)}
                          style={{ ...inputBase, paddingLeft: 36 }}
                        />
                      </div>
                    </div>

                    <div style={{ position: "relative" }}>
                      <FileText size={15} color="rgba(167,139,250,0.6)" strokeWidth={1.5} style={{ position: "absolute", left: 14, top: 14 }} />
                      <textarea
                        placeholder="Précisions pour le livreur (Optionnel) — ex: Barrière blanche, à côté de la pharmacie..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        style={{
                          ...inputBase,
                          paddingLeft: 40,
                          paddingTop: 12,
                          resize: "none",
                        }}
                        data-testid="input-order-notes"
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={handleSend}
                      disabled={!canSubmit}
                      data-testid="button-confirm-order"
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        padding: "16px 0",
                        borderRadius: 12,
                        background: canSubmit
                          ? "linear-gradient(135deg,#E91E8C,#f43f5e)"
                          : "rgba(255,255,255,0.06)",
                        border: "none",
                        color: canSubmit ? "#fff" : "rgba(255,255,255,0.35)",
                        fontSize: 13,
                        fontWeight: 800,
                        cursor: canSubmit ? "pointer" : "not-allowed",
                        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                        transition: "opacity 0.15s",
                        opacity: canSubmit ? 1 : 0.7,
                      }}
                    >
                      <MessageCircle size={16} strokeWidth={1.5} />
                      Envoyer ma commande sur WhatsApp
                    </button>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <Sparkles size={12} color="#a78bfa" strokeWidth={1.5} />
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                        Des frais de livraison locaux s'appliquent selon la zone.
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
