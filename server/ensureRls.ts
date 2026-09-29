import { sql } from "drizzle-orm";
import { db } from "./db";

// Sécurité par ligne (migration 0018) sur les tables encore créées à la volée.
// Un ALTER TABLE pose un verrou exclusif même si la RLS est déjà active :
// on ne l'exécute qu'UNE fois par démarrage du serveur et par table.
const done = new Set<string>();
const SAFE = /^[a-z_]+$/;

export async function ensureRls(table: string): Promise<void> {
  if (done.has(table) || !SAFE.test(table)) return;
  done.add(table);
  try { await db.execute(sql.raw(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`)); }
  catch (e: any) { console.warn(`[rls] ${table} : ${e?.message}`); }
}
