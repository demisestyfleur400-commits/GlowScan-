import { catalog } from "./catalog";

// ════════════════════════════════════════════════════════════════════════
// Commande de produits (refonte Organic) — tarifs validés, moyens de paiement,
// calcul du total. Utilisé par le serveur (total FIGÉ à l'envoi) et l'écran.
// ════════════════════════════════════════════════════════════════════════

/** Douala : livraison 1 000 F. Ailleurs : expédition 2 500 à 3 000 F. */
export const DELIVERY_FEES: Record<string, number> = {
  Douala: 1000,
  "Yaoundé": 2500,
  Kribi: 2500,
  Bafoussam: 2500,
  Buea: 2500,
  Garoua: 3000,
};
export const CITIES = Object.keys(DELIVERY_FEES);
export const isDouala = (city: string) => city === "Douala";
export const deliveryLabel = (city: string) => (isDouala(city) ? "Livraison · Douala" : `Expédition · ${city}`);

export type PayMethod = "orange" | "mtn" | "cash";
export const PAY_METHODS: Record<PayMethod, { tag: string; label: string; num: string; ussd: string; tagBg: string; tagFg: string }> = {
  orange: { tag: "OM", label: "Orange Money", num: "690 501 392", ussd: "#150#", tagBg: "#ff7900", tagFg: "#1a1a1a" },
  mtn: { tag: "MoMo", label: "MTN Mobile Money", num: "674 377 959", ussd: "*126#", tagBg: "#ffcb05", tagFg: "#1a1a1a" },
  cash: { tag: "Espèces", label: "À la livraison", num: "", ussd: "", tagBg: "var(--color-neutral-200)", tagFg: "var(--color-text)" },
};

/** Numéro WhatsApp GlowScan qui reçoit les commandes (logique existante). */
export const ORDER_WHATSAPP = "237674377959";

export const formatF = (n: number) => `${n.toLocaleString("fr-FR").replace(/ | /g, " ")} F`;

export type OrderLineIn = { id: string; qty: number };
export type OrderLine = { id: string; name: string; unit: number; qty: number; total: number };

/** Lignes et totaux calculés à partir du CATALOGUE (jamais des prix envoyés par le navigateur). */
export function computeOrder(lines: OrderLineIn[], city: string) {
  const items: OrderLine[] = [];
  for (const l of lines) {
    const p = catalog.find((c) => c.id === l.id);
    const qty = Math.max(1, Math.min(20, Math.floor(Number(l.qty) || 0)));
    if (!p || typeof p.price !== "number" || p.price <= 0) continue;
    items.push({ id: p.id, name: p.name, unit: p.price, qty, total: p.price * qty });
  }
  const subtotal = items.reduce((a, i) => a + i.total, 0);
  const fee = DELIVERY_FEES[city];
  return { items, subtotal, fee: fee ?? null, total: fee === undefined ? null : subtotal + fee };
}

export type OrderStatus = "received" | "paid_verified" | "shipping" | "delivered";
export const ORDER_STATUSES: OrderStatus[] = ["received", "paid_verified", "shipping", "delivered"];

/** Étapes de suivi affichées au patient (maquette : Reçue → Paiement vérifié / Confirmée → En livraison / Expédiée → Livrée). */
export function trackingSteps(payMethod: PayMethod, city: string) {
  const cash = payMethod === "cash";
  return [
    { key: "received", label: "Commande reçue", sub: "" },
    { key: "paid_verified", label: cash ? "Confirmée par GlowScan" : "Paiement vérifié", sub: cash ? "appel sous 2 h" : "sous 2 h" },
    { key: "shipping", label: isDouala(city) ? "En livraison" : "Expédiée", sub: isDouala(city) ? "demain" : "sous 48 à 72 h" },
    { key: "delivered", label: "Livrée", sub: cash ? "paiement à la réception" : "" },
  ] as { key: OrderStatus; label: string; sub: string }[];
}

/** Message WhatsApp pré-rempli (sans émoji). Le n° de commande sert de référence de paiement. */
export function buildOrderWhatsApp(o: {
  number: string; items: OrderLine[]; fee: number; total: number; city: string; quartier: string;
  notes?: string | null; name: string; phone: string; payMethod: PayMethod; glowScore?: number | null; skinType?: string | null;
}): string {
  const pm = PAY_METHODS[o.payMethod];
  return [
    `Commande GlowScan ${o.number}`,
    "",
    ...o.items.map((i) => `- ${i.name} x${i.qty} : ${formatF(i.total)}`),
    `${deliveryLabel(o.city)} : ${formatF(o.fee)}`,
    `Total : ${formatF(o.total)}`,
    "",
    `Paiement : ${pm.label}${o.payMethod === "cash" ? "" : ` (référence ${o.number}, capture jointe à la commande)`}`,
    `Nom : ${o.name}`,
    `Téléphone : ${o.phone}`,
    `Adresse : ${o.quartier}, ${o.city}`,
    o.notes ? `Précisions : ${o.notes}` : "",
    o.glowScore != null || o.skinType ? `Glow Score : ${o.glowScore ?? "—"}${o.skinType ? ` · ${o.skinType}` : ""}` : "",
  ].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n").trim();
}
