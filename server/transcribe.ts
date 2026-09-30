import OpenAI from "openai";

// ════════════════════════════════════════════════════════════════════════
// Transcription des messages vocaux (Whisper via Groq, comme /api/transcribe).
// Langue détectée automatiquement (français ou anglais). Renvoie null si aucun
// service n'est configuré ou en cas d'échec : le vocal reste écoutable.
// ════════════════════════════════════════════════════════════════════════

const groqKey = process.env.GROQ_API_KEY || "";
const openaiKey = process.env.OPENAI_API_KEY || "";
const client = groqKey
  ? new OpenAI({ apiKey: groqKey, baseURL: "https://api.groq.com/openai/v1", timeout: 120000 })
  : openaiKey ? new OpenAI({ apiKey: openaiKey, timeout: 60000 }) : null;

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string | null> {
  if (!client || buffer.length < 800) return null;
  try {
    const mt = (mimeType || "").toLowerCase();
    const ext = mt.includes("mp4") || mt.includes("m4a") ? "m4a" : mt.includes("ogg") ? "ogg" : mt.includes("wav") ? "wav" : mt.includes("mpeg") ? "mp3" : "webm";
    const { toFile } = await import("openai");
    const file = await toFile(buffer, `vocal.${ext}`, { type: (mimeType || "audio/webm").split(";")[0] });
    const model = process.env.TRANSCRIBE_MODEL || (groqKey ? "whisper-large-v3-turbo" : "whisper-1");
    const tr: any = await client.audio.transcriptions.create({ file, model } as any);
    const text = String(tr?.text || "").trim();
    return text || null;
  } catch (e: any) {
    console.error("[transcribe vocal]", e?.error?.message || e?.message || e);
    return null;
  }
}
