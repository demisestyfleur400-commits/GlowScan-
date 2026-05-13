/**
 * Export du dataset RLHF dermatologique GlowScan.
 *
 * Récupère depuis la BASE DE PRODUCTION uniquement les scans validés
 * par un dermatologue (`is_verified = TRUE`), télécharge leurs photos
 * depuis l'Object Storage de prod, et génère :
 *
 *   dataset/
 *   ├── images/<scan_id>.<ext>     ← photos brutes
 *   └── labels.jsonl                ← 1 ligne JSON par scan validé
 *
 * Chaque ligne JSONL contient :
 *   - id, created_at, area
 *   - image (chemin local relatif)
 *   - ai_diagnosis : { condition, score, analysis, motivation, recommendations }
 *   - expert : { reviewer, reviewed_at, note, corrected_condition }
 *   - label_final : la condition retenue (corrected_condition si présente, sinon condition)
 *
 * Usage :
 *   PROD_DATABASE_URL=postgresql://...  npx tsx scripts/export-dataset.ts
 *
 * Si PROD_DATABASE_URL n'est pas fourni, le script utilise DATABASE_URL (dev).
 */
import "dotenv/config";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { ObjectStorageService } from "../server/replit_integrations/object_storage/objectStorage";

const OUT_DIR = path.resolve(process.cwd(), "dataset");
const IMG_DIR = path.join(OUT_DIR, "images");
const LABELS_FILE = path.join(OUT_DIR, "labels.jsonl");

async function main() {
  const dbUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ Aucun DATABASE_URL/PROD_DATABASE_URL trouvé.");
    process.exit(1);
  }

  console.log(`📦 Export du dataset depuis ${process.env.PROD_DATABASE_URL ? "PROD" : "DEV"}`);
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const pool = new Pool({ connectionString: dbUrl });
  const { rows } = await pool.query(`
    SELECT id, user_id, area, image_url, condition, analysis, score, motivation,
           recommendations, is_verified, expert_note, expert_corrected_condition,
           expert_reviewer, expert_reviewed_at, created_at
    FROM scans
    WHERE is_verified = TRUE
    ORDER BY id ASC
  `);

  console.log(`✅ ${rows.length} scan(s) validé(s) à exporter.`);
  if (rows.length === 0) {
    console.log("ℹ️  Aucun scan validé pour le moment. Demande au dermato de valider via /admin → Dataset.");
    await pool.end();
    return;
  }

  const svc = new ObjectStorageService();
  const labelsStream = fs.createWriteStream(LABELS_FILE, { flags: "w" });

  let exported = 0;
  let imageMissing = 0;

  for (const r of rows) {
    let imagePath: string | null = null;
    const url: string = r.image_url || "";

    if (url.startsWith("/objects/scans/")) {
      const filename = url.split("/").pop() as string;
      const ext = path.extname(filename) || ".jpg";
      const localImg = path.join(IMG_DIR, `${r.id}${ext}`);
      try {
        const file = await svc.getObjectEntityFile(url);
        const [buf] = await (file as any).download();
        fs.writeFileSync(localImg, buf);
        imagePath = path.relative(OUT_DIR, localImg);
      } catch (err) {
        console.warn(`⚠️  Photo introuvable pour scan #${r.id} (${url})`);
        imageMissing++;
      }
    } else if (url.startsWith("data:")) {
      // Anciens scans avec image en base64 inline
      try {
        const m = url.match(/^data:([^;]+);base64,(.*)$/);
        if (m) {
          const ext = m[1].includes("png") ? ".png" : ".jpg";
          const localImg = path.join(IMG_DIR, `${r.id}${ext}`);
          fs.writeFileSync(localImg, Buffer.from(m[2], "base64"));
          imagePath = path.relative(OUT_DIR, localImg);
        }
      } catch {
        imageMissing++;
      }
    } else {
      imageMissing++;
    }

    const labelFinal = r.expert_corrected_condition?.trim() || r.condition || null;

    const line = {
      id: r.id,
      created_at: r.created_at,
      area: r.area,
      image: imagePath,
      label_final: labelFinal,
      ai_diagnosis: {
        condition: r.condition,
        score: r.score,
        analysis: r.analysis,
        motivation: r.motivation,
        recommendations: r.recommendations,
      },
      expert: {
        reviewer: r.expert_reviewer,
        reviewed_at: r.expert_reviewed_at,
        note: r.expert_note,
        corrected_condition: r.expert_corrected_condition,
      },
    };
    labelsStream.write(JSON.stringify(line) + "\n");
    exported++;
  }

  labelsStream.end();
  await pool.end();

  console.log(`\n📊 Export terminé :`);
  console.log(`   ✅ ${exported} lignes dans ${LABELS_FILE}`);
  console.log(`   📸 ${exported - imageMissing} photos téléchargées dans ${IMG_DIR}`);
  if (imageMissing) console.log(`   ⚠️  ${imageMissing} photo(s) manquante(s) (scans très anciens sans image archivée)`);
  console.log(`\n📂 Dataset prêt dans : ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("❌ Échec export dataset :", err);
  process.exit(1);
});
