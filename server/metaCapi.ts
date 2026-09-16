import { randomUUID } from "crypto";

// ════════════════════════════════════════════════════════════════════════
// Meta Conversions API (CAPI) — envoi serveur-à-serveur de l'événement
// "Purchase" au moment où l'admin confirme un paiement Mobile Money manuel.
// Le pixel navigateur (fbq) ne peut PAS capturer cet achat de façon fiable :
// la confirmation est une action serveur (admin), pas une action du patient
// dans son navigateur. On l'envoie donc directement à Meta.
//
// Non bloquant : toute erreur/timeout est avalée — la confirmation du paiement
// ne doit JAMAIS échouer à cause de Meta.
// ════════════════════════════════════════════════════════════════════════

const META_PIXEL_ID = "2760773324307998"; // identique à client/index.html
const META_CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || "";
// Code de test temporaire (Events Manager → Test Events). À NE PAS définir en prod.
const META_CAPI_TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE || undefined;

export async function sendPurchaseEvent(params: {
  valueFcfa: number;
  consultationId: number;
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  if (!META_CAPI_ACCESS_TOKEN) {
    console.warn("[Meta CAPI] META_CAPI_ACCESS_TOKEN manquant — événement Purchase non envoyé");
    return;
  }
  try {
    const body: any = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          // event_id → déduplication si un fbq côté client envoie un jour le même achat.
          event_id: `purchase_${params.consultationId}_${randomUUID()}`,
          action_source: "website",
          event_source_url: "https://glow-scan.com/consultation/confirmee",
          user_data: {
            client_ip_address: params.clientIp || undefined,
            client_user_agent: params.userAgent || undefined,
            fbp: params.fbp || undefined,
            fbc: params.fbc || undefined,
          },
          custom_data: {
            currency: "XAF", // franc CFA
            value: Number(params.valueFcfa) || 0,
          },
        },
      ],
      ...(META_CAPI_TEST_EVENT_CODE ? { test_event_code: META_CAPI_TEST_EVENT_CODE } : {}),
    };

    // Timeout dur : Meta ne doit jamais faire traîner le process.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    let resp: Response;
    try {
      resp = await fetch(
        `https://graph.facebook.com/v20.0/${META_PIXEL_ID}/events?access_token=${encodeURIComponent(META_CAPI_ACCESS_TOKEN)}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ctrl.signal }
      );
    } finally {
      clearTimeout(timer);
    }
    if (!resp.ok) {
      console.error("[Meta CAPI] échec envoi Purchase:", resp.status, await resp.text().catch(() => ""));
    } else {
      console.log(`[Meta CAPI] Purchase envoyé — consultation #${params.consultationId} · ${params.valueFcfa} XAF`);
    }
  } catch (err) {
    console.error("[Meta CAPI] erreur envoi Purchase:", (err as any)?.message || err);
  }
}
