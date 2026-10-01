import dns from "dns/promises";
import net from "net";

// Adresse d'une instance DHIS2 (étape 15) : module sans dépendance (testable seul).
export class Dhis2Error extends Error { constructor(public code: string, message: string) { super(message); } }

// ── Adresse de l'instance : HTTPS, jamais une adresse interne ───────────
function privateIp(ip: string): boolean {
  if (net.isIPv6(ip)) return ip === "::1" || /^f[cd]/i.test(ip) || /^fe80/i.test(ip) || ip.startsWith("::ffff:") && privateIp(ip.slice(7));
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}
export async function checkBaseUrl(raw: string): Promise<string> {
  let u: URL;
  try { u = new URL(raw.trim().replace(/\/+$/, "").replace(/\/api$/, "")); } catch { throw new Dhis2Error("BAD_URL", "Adresse de l'instance invalide."); }
  if (u.protocol !== "https:") throw new Dhis2Error("BAD_URL", "L'adresse doit commencer par https://");
  const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => []);
  if (!addrs.length) throw new Dhis2Error("BAD_URL", "Instance introuvable : vérifiez l'adresse.");
  if (addrs.some((a) => privateIp(a.address))) throw new Dhis2Error("BAD_URL", "Adresse non autorisée.");
  return `${u.origin}${u.pathname === "/" ? "" : u.pathname}`;
}

