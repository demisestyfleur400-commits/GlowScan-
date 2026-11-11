import { z } from "zod";

// ════════════════════════════════════════════════════════════════════════
// Compte rendu de consultation (étape 9a, maquette « Derm Compte Rendu »).
// « Un même avis, trois lecteurs, trois documents » : une seule saisie du
// médecin produit la version patient (1a), le dossier du cabinet (1c) et
// l'ordonnance aux normes de l'ONMC (1d). Libellés repris de la maquette.
// ════════════════════════════════════════════════════════════════════════

export type LineStatus = "poursuivi" | "ajoute" | "arrete";
export const LINE_STATUS_LABEL: Record<LineStatus, string> = { poursuivi: "Poursuivi", ajoute: "Ajouté", arrete: "Arrêté" };

/** Moments de prise proposés (le médecin peut en écrire un autre). */
export const LINE_MOMENTS = ["Matin", "Midi", "Soir", "Matin et soir"];

export const reportLineSchema = z.object({
  name: z.string().trim().min(2).max(160),          // « Acide azélaïque 15 % gel »
  qty: z.string().trim().max(80).default(""),       // « 1 tube de 30 g »
  when: z.string().trim().max(40).default(""),      // « Soir »
  how: z.string().trim().max(400).default(""),      // mode d'emploi
  duration: z.string().trim().max(60).default(""),  // « 8 semaines », « au long cours »
  status: z.enum(["poursuivi", "ajoute", "arrete"]).default("ajoute"),
  reason: z.string().trim().max(200).default(""),   // pourquoi (ajouté / arrêté)
});
export type ReportLine = z.infer<typeof reportLineSchema>;

export const reportPayloadSchema = z.object({
  motif: z.string().trim().max(600).default(""),
  exam: z.string().trim().max(1500).default(""),
  diagnosis: z.string().trim().max(200).default(""),       // terme médical
  diagnosisPlain: z.string().trim().max(800).default(""),  // « Ce que j'ai vu », en mots simples
  aiSuggestion: z.string().trim().max(200).nullable().default(null),
  phototype: z.string().trim().max(10).default(""),
  weightKg: z.number().min(1).max(300).nullable().default(null),
  allergies: z.string().trim().max(300).default(""),
  antecedents: z.string().trim().max(400).default(""),
  lines: z.array(reportLineSchema).max(12).default([]),
  avoid: z.string().trim().max(400).default(""),           // produits interdits
  expect: z.string().trim().max(500).default(""),          // « À quoi vous attendre »
  alertIf: z.string().trim().max(400).default(""),         // « Écrivez-moi tout de suite si »
  controlPhotoDate: z.string().trim().max(10).nullable().default(null), // AAAA-MM-JJ
  next: z.object({
    patient: z.string().trim().max(300).default(""),
    secretariat: z.string().trim().max(300).default(""),
    doctor: z.string().trim().max(300).default(""),
  }).default({ patient: "", secretariat: "", doctor: "" }),
  personalNote: z.string().trim().max(1500).default(""),   // mot personnel en tête de la version patient
  withPrescription: z.boolean().default(false),
  // ── Modèle A4 de l'espace médical (D2) : « Relire, corriger, valider » ──
  format: z.enum(["", "a4"]).default(""),
  conclusion: z.string().trim().max(1500).default(""),     // Conclusion du dermatologue
  conduite: z.string().trim().max(1500).default(""),       // Conduite à tenir
  suiviChoice: z.enum(["", "J+14", "J+28", "3 mois", "Aucun suivi"]).default(""),
  suiviText: z.string().trim().max(600).default(""),       // précisions sur le suivi
  meds: z.array(z.object({
    m: z.string().trim().max(160).default(""),  // médicament ou soin
    f: z.string().trim().max(120).default(""),  // forme / dosage
    v: z.string().trim().max(80).default(""),   // voie d'administration
    p: z.string().trim().max(240).default(""),  // posologie
    d: z.string().trim().max(80).default(""),   // durée
    c: z.string().trim().max(400).default(""),  // consignes
  })).max(12).default([]),
});
export type ReportPayload = z.infer<typeof reportPayloadSchema>;

export const emptyReport = (): ReportPayload => reportPayloadSchema.parse({});

export const reportRef = (id: number) => `GS-CR-${String(id).padStart(5, "0")}`;
export const prescriptionRef = (id: number) => `GS-ORD-${String(id).padStart(5, "0")}`;
/** « GS-ORD-00012 » / « GS-CR-00012 » → 12. */
export function refNumber(ref: string): { kind: "ord" | "cr"; id: number } | null {
  const m = /^GS-(ORD|CR)-(\d{1,9})$/i.exec(String(ref || "").trim());
  return m ? { kind: m[1].toUpperCase() === "ORD" ? "ord" : "cr", id: Number(m[2]) } : null;
}

export const DEFAULT_SPECIALTY = "Spécialiste en dermatologie et vénéréologie";

/** Lignes à délivrer (l'ordonnance ne reprend pas ce qui est arrêté). */
export const activeLines = (p: ReportPayload) => p.lines.filter((l) => l.status !== "arrete");

/** Choix de suivi du modèle A4 et délai en jours (« Aucun suivi » : pas de contrôle). */
export const SUIVI_CHOICES = ["J+14", "J+28", "3 mois", "Aucun suivi"] as const;
export const SUIVI_DAYS: Record<string, number> = { "J+14": 14, "J+28": 28, "3 mois": 91 };
/** Date du contrôle (AAAA-MM-JJ) à partir d'une date de référence. */
export function suiviDate(choice: string, from: Date = new Date()): string | null {
  const n = SUIVI_DAYS[choice];
  if (!n) return null;
  const d = new Date(from); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Les 3 points obligatoires du modèle A4. */
export const a4Points = (p: ReportPayload) => [!!p.conclusion.trim(), !!p.conduite.trim(), !!p.suiviChoice];
/** Médicaments réellement saisis (une ligne vide n'est pas imprimée). */
export const a4Meds = (p: ReportPayload) => p.meds.filter((m) => m.m.trim());

/** Ce qui manque avant de pouvoir signer. */
export function reportMissing(p: ReportPayload, doctor: { licenseNumber?: string | null; cabinetAddress?: string | null }): string[] {
  const out: string[] = [];
  if (p.format === "a4") {
    const [c, t, s] = a4Points(p);
    if (!c) out.push("la conclusion du dermatologue");
    if (!t) out.push("la conduite à tenir");
    if (!s) out.push("les modalités de suivi");
    return out;
  }
  if (!p.diagnosis.trim()) out.push("le diagnostic");
  if (!p.diagnosisPlain.trim()) out.push("« Ce que j'ai vu » en mots simples");
  if (p.withPrescription) {
    if (!activeLines(p).length) out.push("au moins un produit à l'ordonnance");
    if (activeLines(p).some((l) => !l.duration.trim())) out.push("une durée pour chaque produit");
    if (!doctor.licenseNumber?.trim()) out.push("votre n° ONMC (Mon cabinet)");
    if (!doctor.cabinetAddress?.trim()) out.push("l'adresse du cabinet (Mon cabinet)");
  }
  return out;
}

/** Texte brut du traitement (colonne consultations.prescription, anciens écrans). */
export function linesAsText(p: ReportPayload): string {
  const act = activeLines(p).map((l, i) => `${i + 1}. ${l.name}${l.qty ? `, ${l.qty}` : ""}${l.when ? ` · ${l.when}` : ""}${l.how ? ` · ${l.how}` : ""}${l.duration ? ` · Durée : ${l.duration}` : ""}`);
  const stop = p.lines.filter((l) => l.status === "arrete").map((l) => `Arrêter : ${l.name}`);
  const avoid = p.avoid ? [`Ne pas utiliser : ${p.avoid}`] : [];
  return [...act, ...stop, ...avoid].join("\n");
}
