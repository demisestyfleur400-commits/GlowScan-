/**
 * Politique de rétention — scans B2C ANONYMES jamais convertis.
 *
 * Cible : scans sans compte (user_id NULL) ET non rattachés à un dossier patient
 * DERM (patient_id NULL), plus vieux que RETENTION_MONTHS (défaut 24 mois).
 *
 * Par défaut : DRY-RUN (liste ce qui serait traité, ne touche à rien).
 * Pour appliquer (anonymisation renforcée : suppression de la photo) :
 *   RETENTION_CONFIRM=ANONYMISER npx tsx scripts/retention-dryrun.ts --apply
 *
 * L'anonymisation met image_url à NULL (retire la photo) tout en gardant la ligne
 * agrégée du dataset. Rien n'est supprimé sans le flag --apply ET la confirmation.
 */
import { db } from "../server/db";
import { sql } from "drizzle-orm";

const MONTHS = Math.max(1, parseInt(process.env.RETENTION_MONTHS || "24", 10));
const APPLY = process.argv.includes("--apply");
const CONFIRMED = process.env.RETENTION_CONFIRM === "ANONYMISER";

const Rows = (x: any): any[] => (x?.rows ?? x ?? []) as any[];

(async () => {
  const cutoffLabel = `${MONTHS} mois`;
  console.log(`🗓️  Rétention — scans B2C anonymes non convertis, plus vieux que ${cutoffLabel}\n`);

  const cand = Rows(await db.execute(sql`
    SELECT id, created_at, (image_url IS NOT NULL AND image_url <> '') AS has_photo
    FROM scans
    WHERE user_id IS NULL
      AND patient_id IS NULL
      AND created_at < (NOW() - (${MONTHS} || ' months')::interval)
    ORDER BY created_at ASC`));

  const total = cand.length;
  const withPhoto = cand.filter((r) => r.has_photo === true).length;
  console.log(`  Candidats : ${total} scan(s) · dont ${withPhoto} avec photo à anonymiser.`);
  if (total > 0) {
    console.log(`  Exemples (max 20) : ${cand.slice(0, 20).map((r) => `#${r.id} (${new Date(r.created_at).toISOString().slice(0, 10)})`).join(", ")}`);
  }

  if (!APPLY) {
    console.log(`\n🔎 DRY-RUN : rien n'a été modifié. Pour anonymiser : RETENTION_CONFIRM=ANONYMISER npx tsx scripts/retention-dryrun.ts --apply`);
    process.exit(0);
  }
  if (!CONFIRMED) {
    console.error(`\n❌ --apply demandé mais RETENTION_CONFIRM=ANONYMISER manquant. Abandon (aucune modification).`);
    process.exit(1);
  }

  const res: any = await db.execute(sql`
    UPDATE scans SET image_url = NULL
    WHERE user_id IS NULL AND patient_id IS NULL
      AND created_at < (NOW() - (${MONTHS} || ' months')::interval)
      AND image_url IS NOT NULL AND image_url <> ''`);
  const affected = (res?.rowCount ?? res?.count ?? withPhoto);
  console.log(`\n✅ Anonymisation appliquée : ${affected} photo(s) retirée(s). Lignes dataset conservées (agrégées).`);
  process.exit(0);
})().catch((e) => { console.error("Erreur rétention:", e); process.exit(1); });
