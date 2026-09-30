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

/** Ce qui manque avant de pouvoir signer. */
export function reportMissing(p: ReportPayload, doctor: { licenseNumber?: string | null; cabinetAddress?: string | null }): string[] {
  const out: string[] = [];
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
