import { sendSmsText } from "../whatsapp";
import { GLOWSCAN_MOMO } from "@shared/splits";
import { formatMoney, momoAvailable, type Currency } from "@shared/currency";

// ════════════════════════════════════════════════════════════════════════
// Encaissement Mobile Money (étape 12). Interface unique pour pouvoir changer
// de prestataire : aujourd'hui ManualMomoProvider (instructions par SMS, ID de
// transaction vérifié à la main par GlowScan) ; demain un agrégateur
// multi-pays, choisi par le fondateur, qui implémentera la même interface.
// Règle : aucun crédit sans ID de transaction opérateur vérifié.
// ════════════════════════════════════════════════════════════════════════

export type Collection = {
  reference: string;            // code visible par la patiente (#B-118, RECH-12…)
  amountXaf: number;
  amountLocal: number;
  currency: Currency;
  country: string | null;
  phone?: string | null;        // payeur (facultatif) : instructions par SMS
  purpose: "relay_case" | "relay_credit";
};
export type CollectionResult = { instructions: string; smsSent: boolean; payUrl: string | null };

export interface PaymentProvider {
  readonly id: string;
  supports(country: string | null): boolean;
  createCollection(c: Collection): Promise<CollectionResult>;
  /** true = paiement confirmé par le prestataire ; null = vérification manuelle par GlowScan. */
  verify(reference: string, operatorTxnId: string): Promise<boolean | null>;
}

export class ManualMomoProvider implements PaymentProvider {
  readonly id = "manual_momo";
  supports(country: string | null) { return momoAvailable(country); }
  async createCollection(c: Collection): Promise<CollectionResult> {
    const amount = formatMoney(c.amountLocal, c.currency);
    const instructions = c.purpose === "relay_case"
      ? `GlowScan ${c.reference} : avis dermatologique, ${amount}. Payez par MTN MoMo au ${GLOWSCAN_MOMO.mtn} ou Orange Money au ${GLOWSCAN_MOMO.orange}, puis donnez l'ID de transaction à votre soignant.`
      : `GlowScan ${c.reference} : recharge de crédit, ${amount}. Payez par MTN MoMo au ${GLOWSCAN_MOMO.mtn} ou Orange Money au ${GLOWSCAN_MOMO.orange}, puis saisissez l'ID de transaction dans l'appli.`;
    let smsSent = false;
    if (c.phone) smsSent = (await sendSmsText(`+${String(c.phone).replace(/\D/g, "")}`, instructions).catch(() => ({ ok: false }))).ok;
    return { instructions, smsSent, payUrl: null };
  }
  async verify(): Promise<boolean | null> { return null; }
}

const providers: PaymentProvider[] = [new ManualMomoProvider()];
/** Prestataire disponible pour ce pays, ou null (Mobile Money indisponible : crédit ou programme). */
export const providerFor = (country: string | null): PaymentProvider | null => providers.find((p) => p.supports(country)) || null;
