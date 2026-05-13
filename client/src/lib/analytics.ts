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

export function trackWhatsappClick(productId: string, productName: string, brand: string, whatsappNumber: string) {
  fetch("/api/analytics/whatsapp-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, productName, brand, whatsappNumber }),
  }).catch(() => {});
}
