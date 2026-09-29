// ════════════════════════════════════════════════════════════════════════
// Formules Premium (refonte Organic). Le PRIX et la DURÉE sont décidés ici et
// vérifiés par le serveur : le navigateur n'envoie que le choix de formule.
// Les consultations ne sont pas incluses : chaque médecin fixe son prix.
// ════════════════════════════════════════════════════════════════════════

export type PremiumPlan = "week" | "month";

export const PREMIUM_PLANS: Record<PremiumPlan, { label: string; amountFcfa: number; days: number; note: string; subscriptionPlan: string }> = {
  week: { label: "Semaine", amountFcfa: 500, days: 7, note: "sans engagement", subscriptionPlan: "weekly" },
  month: { label: "Mois", amountFcfa: 2000, days: 30, note: "le plus choisi", subscriptionPlan: "monthly" },
};

/** Formule d'une demande enregistrée, déduite du montant fixé par le serveur. */
export function planOfAmount(amountFcfa: number): PremiumPlan {
  return amountFcfa === PREMIUM_PLANS.week.amountFcfa ? "week" : "month";
}

export const PREMIUM_PERKS = [
  "Analyses illimitées",
  "Scans produit illimités",
  "Assistant GlowScan pour vos questions",
  "Comparaison avant / après détaillée",
  "La routine prescrite par votre médecin reste gratuite",
];

/** Abonnement GlowScan Derm (médecin) : 10 000 FCFA par mois, payable par les gains. */
export const PRO_SUBSCRIPTION_FCFA = 10000;
