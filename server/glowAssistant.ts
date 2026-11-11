import type { Express } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { requireProAccess } from "./proRoutes";
import { transcribeAudio } from "./transcribe";

// ════════════════════════════════════════════════════════════════════════
// Assistant clinique Glow (D3) : discussion libre du dermatologue avec Gemini
// sur UN cas. Gemini reçoit tout le dossier de la consultation (anamnèse,
// examen, questionnaire, analyse photo) et les photos ; la conversation est
// multi-tours et la réponse arrive au fil de l'eau (SSE). Même chaîne de
// secours que l'analyse photo : si un modèle sature (quota gratuit) ou
// disparaît, on passe au suivant. Recherche Google quand elle est disponible.
// L'assistant suggère, il ne pose jamais de diagnostic : le médecin décide.
// ════════════════════════════════════════════════════════════════════════

const KEY = process.env.GEMINI_API_KEY || "";
const gemini = KEY ? new GoogleGenerativeAI(KEY) : null;
// Mesuré le 11/11/2026 sur la clé du projet : les « flash-lite » répondent en
// 1 à 2,5 s ; gemini-flash-latest réfléchit longtemps (30 à 70 s) ; 2.0 et 2.5
// sont retirés (404). Surchargeable par GLOW_MODELS dans Railway.
export const GEMINI_CHAIN = (process.env.GLOW_MODELS || "gemini-flash-lite-latest,gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-latest")
  .split(",").map((s) => s.trim()).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
// La recherche Google intégrée a un quota gratuit distinct, vite épuisé (429) :
// désactivée par défaut, activable avec GLOW_SEARCH=1.
const SEARCH = process.env.GLOW_SEARCH === "1";

export const geminiReady = () => !!gemini;

const SYSTEM = `Tu es Glow, l'assistant clinique de GlowScan Derm. Tu travailles AUX CÔTÉS d'un dermatologue qualifié, pendant sa consultation, sur UN patient précis dont le dossier t'est fourni (et les photos, s'il y en a). Tu es expert en dermatologie des peaux noires (phototypes IV à VI), en Afrique subsaharienne.

Ta façon de travailler :
- Tu raisonnes comme un confrère senior : tu argumentes à partir des éléments du dossier et de ce que tu vois sur les photos (lésion élémentaire, topographie, distribution, couleur sur peau foncée).
- Tu proposes des pistes : diagnostics différentiels avec ce qui les soutient et ce qui les contredit, éléments d'examen ou questions à poser au patient pour trancher, examens complémentaires utiles et réalistes en contexte africain, options thérapeutiques avec leurs précautions.
- Tu tiens compte systématiquement : hyperpigmentation post-inflammatoire, risque chéloïdien, usage fréquent de produits éclaircissants (dermocorticoïdes, hydroquinone, mercure), photoprotection, grossesse/allaitement, coût et disponibilité locale des traitements.
- Tu signales clairement toute incohérence (ex. lésions décrites qui ne collent pas avec l'hypothèse, traitement contre-indiqué).
- Tu ne poses JAMAIS de diagnostic définitif et tu ne signes rien : le diagnostic et la prescription appartiennent au dermatologue. Formule en « à envisager », « en faveur de », « à vérifier ».
- Si une question sort de ce cas ou de la médecine, réponds en une phrase que tu restes concentré sur ce dossier.

Style : français médical clair, vouvoiement, direct. Réponses courtes par défaut (5 à 10 lignes), plus longues seulement si le médecin le demande. Tu peux utiliser des listes avec « - » et mettre en **gras** les points clés. Pas de tableau, pas de titre, pas d'émoji. N'ajoute pas de formule de politesse ni de rappel répétitif en fin de message : l'interface affiche déjà que tes réponses sont indicatives.`;

type Turn = { role: "doctor" | "ai"; text: string };
type Img = { mime: string; b64: string };

function imagesOf(list: unknown): Img[] {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 3).map((s) => {
    const m = /^data:(image\/[a-z+]+);base64,(.+)$/i.exec(String(s || ""));
    return m ? { mime: m[1].toLowerCase(), b64: m[2] } : null;
  }).filter((x): x is Img => !!x && x.b64.length < 4_000_000);
}

function caseText(c: any): string {
  const s = (v: unknown, n = 1500) => String(v ?? "").trim().slice(0, n);
  const lines = [
    ["Patient", [c?.age ? `${s(c.age, 10)} ans` : "", s(c?.sex, 10) === "F" ? "femme" : s(c?.sex, 10) === "M" ? "homme" : ""].filter(Boolean).join(", ")],
    ["Motif de consultation", s(c?.motif)],
    ["Durée d'évolution", s(c?.duration, 200)],
    ["Anamnèse", s(c?.anamnese)],
    ["Antécédents / dossier clinique", s(c?.antecedents)],
    ["Produits déjà utilisés", s(c?.products, 600)],
    ["Allergies", s(c?.allergies, 300)],
    ["Phototype", s(c?.phototype, 20)],
    ["Examen physique du médecin", s(c?.examen, 2000)],
    ["Réponses au questionnaire", s(c?.questionnaire, 2000)],
    ["Analyse photo Glow (indicative)", s(c?.analysis, 1500)],
    ["Hypothèse du médecin", s(c?.hypothesis, 300)],
    ["Prescription envisagée", s(c?.prescription, 800)],
    ["Notes du médecin", s(c?.notes, 1500)],
  ].filter(([, v]) => v);
  return lines.length ? lines.map(([k, v]) => `- ${k} : ${v}`).join("\n") : "- (dossier encore vide)";
}

/** Génère avec la chaîne de secours ; renvoie le flux du premier modèle qui répond. */
export async function streamWithFallback(contents: any[], onChunk: (t: string) => void, opts: { search: boolean; system: string }) {
  let lastErr: any = null;
  for (const model of GEMINI_CHAIN) {
    for (const search of opts.search && SEARCH ? [true, false] : [false]) {
      let started = false;
      try {
        const m = gemini!.getGenerativeModel({ model, systemInstruction: opts.system });
        const cfg: any = { contents, generationConfig: { temperature: 0.4, maxOutputTokens: 1400 } };
        if (search) cfg.tools = [{ googleSearch: {} }];
        const r: any = await Promise.race([
          m.generateContentStream(cfg),
          new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout")), 20000)),
        ]);
        let full = "";
        for await (const chunk of r.stream) {
          const t = chunk?.text?.() || "";
          if (t) { started = true; full += t; onChunk(t); }
        }
        if (!full.trim()) throw new Error("Réponse vide");
        let source: { url: string; title: string } | null = null;
        try {
          const resp = await r.response;
          const ch = (resp?.candidates?.[0]?.groundingMetadata?.groundingChunks || []).find((c: any) => c?.web?.uri);
          if (ch?.web) source = { url: ch.web.uri, title: ch.web.title || ch.web.uri };
        } catch {}
        return { text: full, model, source };
      } catch (e: any) {
        lastErr = e;
        if (started) throw e; // déjà commencé à répondre : on n'enchaîne pas un 2e texte
        console.warn(`[glow] ${model}${search ? " +search" : ""} indisponible :`, e?.message || e);
      }
    }
  }
  throw lastErr || new Error("Aucun modèle disponible");
}

/** Appel texte simple (JSON ou non) avec la même chaîne de secours. */
export async function geminiText(system: string, prompt: string, opts: { json?: boolean; search?: boolean; maxTokens?: number } = {}) {
  if (!gemini) throw new Error("Gemini non configuré");
  let lastErr: any = null;
  for (const model of GEMINI_CHAIN) {
    for (const search of opts.search && SEARCH ? [true, false] : [false]) {
      try {
        const m = gemini.getGenerativeModel({ model, systemInstruction: system });
        const cfg: any = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: opts.maxTokens || 1200 } };
        if (search) cfg.tools = [{ googleSearch: {} }];
        else if (opts.json) cfg.generationConfig.responseMimeType = "application/json";
        const r: any = await Promise.race([m.generateContent(cfg), new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout")), 25000))]);
        const text = (r.response?.text?.() || "").trim();
        if (!text) throw new Error("Réponse vide");
        return { text, response: r.response, model, grounded: search };
      } catch (e: any) { lastErr = e; console.warn(`[glow text] ${model} indisponible :`, e?.message || e); }
    }
  }
  throw lastErr || new Error("Aucun modèle disponible");
}

export function registerGlowAssistantRoutes(app: Express) {
  // Discussion en flux (Server-Sent Events).
  app.post("/api/pro/glow/chat", requireProAccess, async (req: any, res) => {
    if (req.isSecretary) return res.status(403).json({ message: "Réservé au médecin." });
    if (!gemini) return res.status(503).json({ message: "Assistant indisponible : clé Gemini absente." });
    const b = req.body || {};
    const question = String(b.question || "").trim().slice(0, 1500);
    if (!question) return res.status(400).json({ message: "Question vide." });
    const patientId = Number(b.patientId) || null;
    if (patientId) {
      const own = (await db.execute(sql`SELECT id FROM patients WHERE id = ${patientId} AND dermatologist_id = ${req.proAccount.id}`) as any);
      if (!((own?.rows ?? own) || []).length) return res.status(403).json({ message: "Dossier non autorisé." });
    }
    const history: Turn[] = Array.isArray(b.history) ? b.history.slice(-12).map((m: any) => ({ role: m?.role === "ai" ? "ai" : "doctor", text: String(m?.text || "").slice(0, 2500) })).filter((m: Turn) => m.text) : [];
    const imgs = imagesOf(b.images);

    // Le dossier et les photos ouvrent la conversation ; puis l'historique ; puis la question.
    const opening = [
      { text: `Dossier de la consultation en cours :\n${caseText(b.case)}${imgs.length ? `\n\n${imgs.length} photo${imgs.length > 1 ? "s" : ""} de consultation jointe${imgs.length > 1 ? "s" : ""}.` : ""}` },
      ...imgs.map((i) => ({ inlineData: { mimeType: i.mime, data: i.b64 } })),
    ];
    const contents: any[] = [
      { role: "user", parts: opening },
      { role: "model", parts: [{ text: "Dossier lu. Je suis prêt à raisonner avec vous sur ce cas." }] },
      ...history.map((t) => ({ role: t.role === "ai" ? "model" : "user", parts: [{ text: t.text }] })),
      { role: "user", parts: [{ text: question }] },
    ];

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    const send = (o: unknown) => res.write(`data: ${JSON.stringify(o)}\n\n`);
    try {
      const out = await streamWithFallback(contents, (t) => send({ t }), { search: b.search !== false, system: SYSTEM });
      send({ done: true, source: out.source });
      if (patientId) {
        db.execute(sql`INSERT INTO clinical_ai_exchanges (doctor_id, patient_id, consultation_id, question, answer)
          VALUES (${req.proAccount.id}, ${patientId}, NULL, ${question}, ${out.text.slice(0, 8000)})`).catch((e) => console.error("[glow persist]", e?.message));
      }
    } catch (e: any) {
      console.error("[glow chat]", e?.message || e);
      send({ error: "Glow ne répond pas pour le moment (quota des modèles gratuits atteint ou réseau). Réessayez dans une minute." });
    }
    res.end();
  });

  // Question dictée : transcription Whisper (Groq), renvoyée en texte à relire.
  app.post("/api/pro/glow/transcribe", requireProAccess, async (req: any, res) => {
    if (req.isSecretary) return res.status(403).json({ message: "Réservé au médecin." });
    const m = /^data:(audio\/[a-z0-9.+-]+)(;[^,]*)?;base64,(.+)$/i.exec(String(req.body?.audio || ""));
    if (!m) return res.status(400).json({ message: "Enregistrement illisible." });
    const buf = Buffer.from(m[3], "base64");
    if (buf.length > 8_000_000) return res.status(413).json({ message: "Enregistrement trop long." });
    const text = await transcribeAudio(buf, m[1]);
    if (!text) return res.status(503).json({ message: "Transcription indisponible. Tapez votre question." });
    res.json({ text });
  });
}
