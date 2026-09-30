// ════════════════════════════════════════════════════════════════════════
// Devises du réseau (étape 12). Prix de référence en F CFA (XAF) ; affichage et
// paiement dans la monnaie du relais, au taux figé le jour du paiement (table
// fx_rates, saisie par GlowScan pour les devises flottantes).
// ════════════════════════════════════════════════════════════════════════

export type Currency = "XAF" | "XOF" | "CDF" | "BIF";

export const COUNTRY_CURRENCY: Record<string, Currency> = {
  Cameroun: "XAF", Gabon: "XAF", Tchad: "XAF", Congo: "XAF",
  "Bénin": "XOF", "Sénégal": "XOF", "Côte d'Ivoire": "XOF", Togo: "XOF",
  RDC: "CDF", Burundi: "BIF",
};
export const currencyOf = (country: string | null | undefined): Currency => COUNTRY_CURRENCY[String(country || "")] || "XAF";

export const CURRENCY_LABEL: Record<Currency, { symbol: string; name: string; step: number }> = {
  XAF: { symbol: "F CFA", name: "franc CFA (Afrique centrale)", step: 5 },
  XOF: { symbol: "F CFA", name: "franc CFA (Afrique de l'Ouest)", step: 5 },
  CDF: { symbol: "FC", name: "franc congolais", step: 50 },
  BIF: { symbol: "FBu", name: "franc burundais", step: 50 },
};

/** Paiement Mobile Money et recharge du crédit : seulement là où GlowScan a des numéros (Cameroun). */
export const MOMO_COUNTRIES = ["Cameroun"];
export const momoAvailable = (country: string | null | undefined) => MOMO_COUNTRIES.includes(String(country || "Cameroun"));

/** Montant local arrondi au pas de la devise (jamais en dessous du prix de référence converti). */
export function toLocal(xaf: number, rate: number, currency: Currency): number {
  const step = CURRENCY_LABEL[currency].step;
  return Math.ceil((xaf * rate) / step) * step;
}
/** Montant local → F CFA (recharge), arrondi à l'unité inférieure. */
export const toXaf = (local: number, rate: number) => Math.floor(local / (rate || 1));

export function formatMoney(amount: number, currency: Currency): string {
  return `${Math.round(amount).toLocaleString("fr-FR").replace(/ | /g, " ")} ${CURRENCY_LABEL[currency].symbol}`;
}
