/**
 * Export du dataset RLHF dermatologique GlowScan — FORMAT VISION ENTRAÎNABLE.
 *
 * Récupère depuis la base uniquement les scans validés par un dermatologue
 * (`is_verified = TRUE`), télécharge leurs photos depuis l'Object Storage,
 * joint les labels démographiques de `training_data` (phototype, tranche
 * d'âge, zone, sexe), applique un seuil qualité, fait un split train/val
 * DÉTERMINISTE, et génère :
 *
 *   dataset/
 *   ├── images/<scan_id>.<ext>     ← photos brutes (EXIF déjà nettoyé à l'upload)
 *   ├── labels.jsonl                ← 1 ligne lisible par scan (audit humain)
 *   ├── train.jsonl                 ← format vision (chat multimodal) — entraînement
 *   ├── val.jsonl                   ← format vision — validation
 *   └── manifest.json               ← comptes, répartition phototype, paramètres
 *
 * Format vision (train/val) — 1 ligne = 1 exemple multimodal :
 *   { "messages": [
 *       { "role":"system", "content": <consigne dermato> },
 *       { "role":"user", "content":[ {type:"text",text:<prompt>},
 *                                    {type:"image_url",image_url:{url:<chemin img>}} ] },
 *       { "role":"assistant", "content": <vérité terrain médecin> } ],
 *     "meta": { phototype, age_range, body_area, sex, split } }
 *
 * Usage :
 *   PROD_DATABASE_URL=postgresql://...  npx tsx scripts/export-dataset.ts
 *
 * Options (env) :
 *   MIN_QUALITY=<0-100>   seuil qualité image (défaut 0 = pas de filtre)
 *   VAL_PCT=<0-100>       part de validation (défaut 15)
 *   EMBED_BASE64=1        embarque l'image en base64 dans le JSONL vision
 *                         (au lieu du chemin) — pour les API qui l'exigent
 */
import "dotenv/config";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";
import { ObjectStorageService } from "../server/replit_integrations/object_storage/objectStorage";

const OUT_DIR = path.resolve(process.cwd(), "dataset");
const IMG_DIR = path.join(OUT_DIR, "images");
const LABELS_FILE = path.join(OUT_DIR, "labels.jsonl");
const TRAIN_FILE = path.join(OUT_DIR, "train.jsonl");
const VAL_FILE = path.join(OUT_DIR, "val.jsonl");
const MANIFEST_FILE = path.join(OUT_DIR, "manifest.json");

const MIN_QUALITY = parseInt(process.env.MIN_QUALITY || "0", 10);
const VAL_PCT = Math.min(100, Math.max(0, parseInt(process.env.VAL_PCT || "15", 10)));
const EMBED_BASE64 = process.env.EMBED_BASE64 === "1";

const SYSTEM_PROMPT =
  "Tu es un assistant dermatologue spécialisé sur la peau africaine (phototypes IV–VI). " +
  "À partir d'une photo et du contexte patient, donne le diagnostic clinique le plus probable, " +
  "sa sévérité, et les points d'attention. Sois précis, prudent, et signale toute urgence.";

// Split déterministe : même id -> toujours le même côté (train/val), reproductible.
function isVal(id: number): boolean {
  if (VAL_PCT <= 0) return false;
  const h = (Math.imul(id, 2654435761) >>> 0) % 100;
  return h < VAL_PCT;
}

function buildUserPrompt(r: any): string {
  const bits: string[] = [];
  const area = r.body_area || r.area;
  if (area) bits.push(`Zone analysée : ${area}.`);
  if (r.age_range) bits.push(`Tranche d'âge : ${r.age_range}.`);
  if (r.patient_sex) bits.push(`Sexe : ${r.patient_sex}.`);
  if (r.skin_phototype) bits.push(`Phototype (estimé) : ${r.skin_phototype}.`);
  bits.push("Analyse la photo et donne ton diagnostic clinique.");
  return bits.join(" ");
}

function buildGroundTruth(r: any, labelFinal: string | null): string {
  const parts: string[] = [];
  parts.push(`Diagnostic : ${labelFinal || "non précisé"}.`);
  if (r.severity) parts.push(`Sévérité : ${r.severity}.`);
  if (r.expert_note?.trim()) parts.push(`Note du dermatologue : ${r.expert_note.trim()}`);
  return parts.join(" ");
}

async function main() {
  const dbUrl = process.env.PROD_DATABASE_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("❌ Aucun DATABASE_URL/PROD_DATABASE_URL trouvé.");
    process.exit(1);
  }

  console.log(`📦 Export dataset VISION depuis ${process.env.PROD_DATABASE_URL ? "PROD" : "DEV"}`);
  console.log(`   Paramètres : MIN_QUALITY=${MIN_QUALITY} · VAL_PCT=${VAL_PCT}% · EMBED_BASE64=${EMBED_BASE64}`);
  fs.mkdirSync(IMG_DIR, { recursive: true });

  const pool = new Pool({ connectionString: dbUrl });
  // Jointure scans ↔ training_data pour récupérer les labels démographiques
  // et le seuil qualité. LEFT JOIN : un scan validé sans ligne training_data
  // reste exporté (labels démographiques simplement nuls).
  const { rows } = await pool.query(
    `
    SELECT s.id, s.user_id, s.area, s.image_url, s.condition, s.analysis, s.score,
           s.motivation, s.recommendations, s.is_verified, s.expert_note,
           s.expert_corrected_condition, s.expert_reviewer, s.expert_reviewed_at,
           s.created_at,
           t.skin_phototype, t.age_range, t.patient_sex, t.body_area,
           t.severity, t.image_quality, t.derm_validation_status
    FROM scans s
    LEFT JOIN training_data t ON t.scan_id = s.id
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN patients p ON p.id = s.patient_id
    WHERE s.is_verified = TRUE
      AND ($1 = 0 OR COALESCE(t.image_quality, 100) >= $1)
      -- RGPD : consentement dataset OBLIGATOIRE (côté utilisateur B2C OU côté patient DERM).
      AND (COALESCE(u.dataset_consent, FALSE) = TRUE OR COALESCE(p.dataset_consent, FALSE) = TRUE)
    ORDER BY s.id ASC
    `,
    [MIN_QUALITY],
  );

  console.log(`✅ ${rows.length} scan(s) validé(s) éligible(s).`);
  if (rows.length === 0) {
    console.log("ℹ️  Aucun scan validé (ou tous filtrés par le seuil qualité). Demande une validation via /admin → Dataset.");
    await pool.end();
    return;
  }

  const svc = new ObjectStorageService();
  const labelsStream = fs.createWriteStream(LABELS_FILE, { flags: "w" });
  const trainStream = fs.createWriteStream(TRAIN_FILE, { flags: "w" });
  const valStream = fs.createWriteStream(VAL_FILE, { flags: "w" });

  let exported = 0;
  let imageMissing = 0;
  let nTrain = 0;
  let nVal = 0;
  const phototypeDist: Record<string, number> = {};

  for (const r of rows) {
    let imagePath: string | null = null;
    let imageBuf: Buffer | null = null;
    let imageMime = "image/jpeg";
    const url: string = r.image_url || "";

    if (url.startsWith("/objects/scans/")) {
      const filename = url.split("/").pop() as string;
      const ext = path.extname(filename) || ".jpg";
      const localImg = path.join(IMG_DIR, `${r.id}${ext}`);
      try {
        const file = await svc.getObjectEntityFile(url);
        const [buf] = await (file as any).download();
        imageBuf = buf;
        fs.writeFileSync(localImg, buf);
        imagePath = path.relative(OUT_DIR, localImg);
        if (ext.includes("png")) imageMime = "image/png";
      } catch (err) {
        console.warn(`⚠️  Photo introuvable pour scan #${r.id} (${url})`);
        imageMissing++;
      }
    } else if (url.startsWith("data:")) {
      try {
        const m = url.match(/^data:([^;]+);base64,(.*)$/);
        if (m) {
          const ext = m[1].includes("png") ? ".png" : ".jpg";
          imageMime = m[1];
          imageBuf = Buffer.from(m[2], "base64");
          const localImg = path.join(IMG_DIR, `${r.id}${ext}`);
          fs.writeFileSync(localImg, imageBuf);
          imagePath = path.relative(OUT_DIR, localImg);
        }
      } catch {
        imageMissing++;
      }
    } else {
      imageMissing++;
    }

    // Sans image, on ne peut pas produire d'exemple vision : on saute le vision,
    // mais on garde la ligne dans labels.jsonl (traçabilité).
    const labelFinal = r.expert_corrected_condition?.trim() || r.condition || null;

    // ── Ligne lisible (audit humain) ────────────────────────────────────────
    labelsStream.write(JSON.stringify({
      id: r.id,
      created_at: r.created_at,
      area: r.area,
      image: imagePath,
      label_final: labelFinal,
      demographics: {
        phototype: r.skin_phototype,
        age_range: r.age_range,
        sex: r.patient_sex,
        body_area: r.body_area,
      },
      severity: r.severity,
      validation_status: r.derm_validation_status,
      ai_diagnosis: {
        condition: r.condition, score: r.score, analysis: r.analysis,
        motivation: r.motivation, recommendations: r.recommendations,
      },
      expert: {
        reviewer: r.expert_reviewer, reviewed_at: r.expert_reviewed_at,
        note: r.expert_note, corrected_condition: r.expert_corrected_condition,
      },
    }) + "\n");

    // ── Ligne vision (train/val) — seulement si image disponible ─────────────
    if (imagePath) {
      const split = isVal(r.id) ? "val" : "train";
      const imgRef = EMBED_BASE64 && imageBuf
        ? `data:${imageMime};base64,${imageBuf.toString("base64")}`
        : imagePath;

      const visionLine = {
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: [
              { type: "text", text: buildUserPrompt(r) },
              { type: "image_url", image_url: { url: imgRef } },
          ] },
          { role: "assistant", content: buildGroundTruth(r, labelFinal) },
        ],
        meta: {
          scan_id: r.id,
          phototype: r.skin_phototype || null,
          age_range: r.age_range || null,
          sex: r.patient_sex || null,
          body_area: r.body_area || r.area || null,
          split,
        },
      };
      const dest = split === "val" ? valStream : trainStream;
      dest.write(JSON.stringify(visionLine) + "\n");
      if (split === "val") nVal++; else nTrain++;

      const pk = r.skin_phototype || "∅ inconnu";
      phototypeDist[pk] = (phototypeDist[pk] || 0) + 1;
    }

    exported++;
  }

  labelsStream.end();
  trainStream.end();
  valStream.end();

  const manifest = {
    generated_at: new Date().toISOString(),
    source: process.env.PROD_DATABASE_URL ? "prod" : "dev",
    params: { min_quality: MIN_QUALITY, val_pct: VAL_PCT, embed_base64: EMBED_BASE64 },
    counts: {
      eligible_scans: rows.length,
      exported_labels: exported,
      vision_examples: nTrain + nVal,
      train: nTrain,
      val: nVal,
      image_missing: imageMissing,
    },
    phototype_distribution: phototypeDist,
    format: "chat multimodal (messages system/user[text+image]/assistant)",
  };
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  await pool.end();

  console.log(`\n📊 Export terminé :`);
  console.log(`   ✅ ${exported} lignes lisibles     → ${LABELS_FILE}`);
  console.log(`   🧠 ${nTrain} exemples train        → ${TRAIN_FILE}`);
  console.log(`   🧪 ${nVal} exemples val            → ${VAL_FILE}`);
  console.log(`   📸 ${exported - imageMissing} photos téléchargées`);
  if (imageMissing) console.log(`   ⚠️  ${imageMissing} sans image (exclus du vision, gardés dans labels.jsonl)`);
  console.log(`   📈 Répartition phototype : ${JSON.stringify(phototypeDist)}`);
  console.log(`   🗂️  Manifest             → ${MANIFEST_FILE}`);
  console.log(`\n📂 Dataset prêt dans : ${OUT_DIR}`);
}

main().catch((err) => {
  console.error("❌ Échec export dataset :", err);
  process.exit(1);
});
