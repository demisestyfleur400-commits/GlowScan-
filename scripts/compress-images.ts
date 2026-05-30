/**
 * compress-images.ts — Compression images GlowScan
 * Usage : npx tsx scripts/compress-images.ts
 *
 * - JPEG → recompressé qualité 75, max 900px (gain ~85%)
 * - PNG  → recompressé PNG compressionLevel 9 (gain ~40-60%)
 * Aucun renommage = aucun import cassé.
 */
import sharp from "sharp";
import { readdir, stat, rename } from "fs/promises";
import { join, extname } from "path";

const DIRS = [
  join(process.cwd(), "client", "src", "lib"),
  join(process.cwd(), "client", "public"),
];

const JPEG_QUALITY = 75;
const MAX_DIM = 900;
const SKIP_BELOW_KB = 120;

type Result = { file: string; before: number; after: number };
const results: Result[] = [];

async function compressFile(fp: string, file: string) {
  const ext = extname(file).toLowerCase();
  if (![".jpg", ".jpeg", ".png"].includes(ext)) return;

  const { size } = await stat(fp);
  const kb = Math.round(size / 1024);

  if (size <= SKIP_BELOW_KB * 1024) {
    console.log(`  ✅ ${file} (${kb}KB) — skip`);
    return;
  }

  const tmp = fp + ".tmp";
  const img = sharp(fp).resize(MAX_DIM, MAX_DIM, {
    fit: "inside",
    withoutEnlargement: true,
  });

  try {
    if (ext === ".png") {
      // PNG → PNG compressé (garde le nom, évite de casser les imports)
      await img.png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(tmp);
    } else {
      // JPEG → JPEG recompressé
      await img.jpeg({ quality: JPEG_QUALITY, progressive: true, mozjpeg: true }).toFile(tmp);
    }

    const { size: ns } = await stat(tmp);
    const nkb = Math.round(ns / 1024);
    const pct = Math.round((1 - ns / size) * 100);

    if (ns < size) {
      await rename(tmp, fp);
      results.push({ file, before: kb, after: nkb });
      console.log(`  🗜️  ${file}: ${kb}KB → ${nkb}KB (-${pct}%) ✓`);
    } else {
      // Si le résultat est plus gros, on garde l'original
      const { unlink } = await import("fs/promises");
      await unlink(tmp).catch(() => {});
      console.log(`  ⚠️  ${file} (${kb}KB) — déjà optimal, conservé`);
    }
  } catch (err) {
    console.error(`  ❌ ${file}:`, err);
  }
}

async function compressDir(dir: string) {
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return;
  }
  for (const file of files) {
    await compressFile(join(dir, file), file);
  }
}

console.log("\n🖼️  Compression images GlowScan...\n");
for (const dir of DIRS) {
  const label = dir.split(/[\\/]/).slice(-3).join("/");
  console.log(`📁 ${label}`);
  await compressDir(dir);
  console.log();
}

const totalBefore = results.reduce((a, r) => a + r.before, 0);
const totalAfter  = results.reduce((a, r) => a + r.after,  0);
const saved = totalBefore - totalAfter;

console.log(`✅ ${results.length} images compressées`);
if (results.length > 0) {
  console.log(`   Avant  : ${(totalBefore / 1024).toFixed(1)} MB`);
  console.log(`   Après  : ${(totalAfter  / 1024).toFixed(1)} MB`);
  console.log(`   Économie: ${(saved / 1024).toFixed(1)} MB (-${Math.round((1 - totalAfter / totalBefore) * 100)}%)\n`);
}
