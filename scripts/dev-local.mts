// Démarrage local de GlowScan : charge .env (racine du repo) dans process.env
// puis lance le serveur. Robuste aux valeurs contenant & ? : / (URLs Supabase).
// Aucune dépendance requise. Usage : npx tsx scripts/dev-local.mts
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const raw of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!(key in process.env)) process.env[key] = val;
  }
  console.log("[dev-local] .env chargé");
} else {
  console.warn("[dev-local] ⚠️ pas de .env à la racine — le serveur va planter sans DATABASE_URL");
}
if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";
if (!process.env.PORT) process.env.PORT = "8080";

await import("../server/index.ts");
