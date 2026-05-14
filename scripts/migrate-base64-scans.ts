import { db } from "../server/db";
import { scans } from "../shared/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { Storage } from "@google-cloud/storage";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  } as any,
  projectId: "",
});

async function uploadBase64(base64DataUrl: string): Promise<string | null> {
  const match = base64DataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  let mime = "image/jpeg";
  let b64 = base64DataUrl;
  if (match) {
    mime = match[1].toLowerCase();
    b64 = match[2];
  }
  const buffer = Buffer.from(b64, "base64");
  if (buffer.length === 0) return null;

  const ext = (mime.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const privateDir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!privateDir) throw new Error("PRIVATE_OBJECT_DIR manquant");

  const objectId = `${randomUUID()}.${ext}`;
  const fullPath = `${privateDir.startsWith("/") ? "" : "/"}${privateDir}/scans/${objectId}`;
  const parts = fullPath.split("/").filter(Boolean);
  const bucketName = parts[0];
  const objectName = parts.slice(1).join("/");

  const bucket = objectStorageClient.bucket(bucketName);
  const file = bucket.file(objectName);
  await file.save(buffer, {
    contentType: mime,
    resumable: false,
    metadata: {
      metadata: {
        "custom:aclPolicy": JSON.stringify({ owner: "system", visibility: "private" }),
      },
    },
  });
  return `/objects/scans/${objectId}`;
}

async function main() {
  console.log("🔍 Recherche des scans avec photo en base64...");
  const rows = await db.select({ id: scans.id, imageUrl: scans.imageUrl })
    .from(scans)
    .where(sql`${scans.imageUrl} LIKE 'data:image%'`);

  console.log(`📦 ${rows.length} scans à migrer.`);

  let ok = 0, ko = 0;
  for (const row of rows) {
    try {
      const newPath = await uploadBase64(row.imageUrl as string);
      if (!newPath) { console.log(`⚠️  scan #${row.id} buffer vide → skip`); ko++; continue; }
      await db.update(scans).set({ imageUrl: newPath }).where(eq(scans.id, row.id));
      console.log(`✅ scan #${row.id} → ${newPath}`);
      ok++;
    } catch (err: any) {
      console.error(`❌ scan #${row.id} échec:`, err?.message || err);
      ko++;
    }
  }

  console.log(`\n🎉 Terminé : ${ok} migrés, ${ko} échecs.`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
