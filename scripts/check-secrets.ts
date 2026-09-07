/**
 * Vérifie les secrets de production. Exécutable en local et en CI :
 *   npx tsx scripts/check-secrets.ts
 * Échoue (exit 1) si un secret critique est absent, vide, trop court (<32),
 * ou correspond à une valeur par défaut faible connue.
 *
 * SESSION_SECRET est CRITIQUE (sessions + HMAC des liens de rapports médicaux +
 * tokens de désinscription). ADMIN_KEY / DERMATO_KEY / DATASET_EXPORT_SALT sont
 * recommandés (leur absence fait échouer fermé, pas ouvert) → avertissements.
 */

const WEAK_DEFAULTS = new Set([
  "glowscan-unsub-fallback",
  "glowscan-report-secret-v1",
  "glowscan-report-secret",
  "changeme",
  "secret",
  "glowscan-secret",
  "password",
  "glowscan2024admin",
]);

interface Check { name: string; critical: boolean; }
const CHECKS: Check[] = [
  { name: "SESSION_SECRET", critical: true },
  { name: "ADMIN_KEY", critical: false },
  { name: "DERMATO_KEY", critical: false },
  { name: "DATASET_EXPORT_SALT", critical: false },
];

function evaluate(name: string): { ok: boolean; reason?: string } {
  const v = process.env[name];
  if (!v || v.trim() === "") return { ok: false, reason: "absent ou vide" };
  if (WEAK_DEFAULTS.has(v.trim().toLowerCase())) return { ok: false, reason: "valeur par défaut faible" };
  if (v.length < 32) return { ok: false, reason: `trop court (${v.length} car., min 32)` };
  return { ok: true };
}

let failed = false;
console.log("🔐 Vérification des secrets de production\n");
for (const c of CHECKS) {
  const r = evaluate(c.name);
  const tag = c.critical ? "CRITIQUE" : "recommandé";
  if (r.ok) {
    console.log(`  ✅ ${c.name} (${tag}) : OK`);
  } else if (c.critical) {
    console.log(`  ❌ ${c.name} (${tag}) : ${r.reason}`);
    failed = true;
  } else {
    console.log(`  ⚠️  ${c.name} (${tag}) : ${r.reason}`);
  }
}

if (failed) {
  console.error("\n❌ Échec : un secret CRITIQUE est manquant ou faible. Corrige-le avant de déployer.");
  process.exit(1);
}
console.log("\n✅ Secrets critiques OK.");
process.exit(0);
