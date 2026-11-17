// Session ID stable en localStorage (renouvellement toutes les 24h)
function getStableSessionId(): string {
  try {
    const stored = localStorage.getItem("gs_session_id");
    const storedTs = localStorage.getItem("gs_session_ts");
    const now = Date.now();

    if (stored && storedTs && (now - parseInt(storedTs, 10)) < 24 * 60 * 60 * 1000) {
      return stored;
    }

    const newId = Math.random().toString(36).slice(2) + now.toString(36);
    localStorage.setItem("gs_session_id", newId);
    localStorage.setItem("gs_session_ts", now.toString());
    // Effacer les anciennes clés de tracking de pages
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("gs_tracked_")) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    return newId;
  } catch {
    return "anon_" + Math.random().toString(36).slice(2);
  }
}

export function trackPageVisit(page: string) {
  try {
    const sessionId = getStableSessionId();

    // Éviter de compter la même page deux fois dans la même session
    const trackKey = `gs_tracked_${sessionId}_${page}`;
    if (localStorage.getItem(trackKey)) return;
    localStorage.setItem(trackKey, "1");

    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, sessionId }),
    }).catch(() => {});
  } catch {}
}

/** Étape de l'entonnoir « analyse → consultation payée » (une fois par session et par étape).
 *  Aucune donnée personnelle ni de santé : un nom d'étape fixe et, au plus, un état ou un nombre. */
export type FunnelStep = "result_view" | "cta_derm_click" | "derm_list_view" | "derm_profile_view" | "auth_wall_shown"
  | "booking_started" | "pay_click" | "payment_ref_submitted";
export function trackFunnel(name: FunnelStep, detail?: string | number) {
  try {
    const sessionId = getStableSessionId();
    const key = `gs_tracked_${sessionId}_evt_${name}${detail != null ? `_${detail}` : ""}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    fetch("/api/analytics/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sessionId, detail: detail != null ? String(detail) : undefined }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export function trackWhatsappClick(productId: string, productName: string, brand: string, whatsappNumber: string) {
  fetch("/api/analytics/whatsapp-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, productName, brand, whatsappNumber }),
  }).catch(() => {});
}
