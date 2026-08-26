// ════════════════════════════════════════════════════════════════════════
// Rapport PDF « Observation médicale » (DERM)
// Reproduit la trame classique d'observation médicale hospitalière (16 rubriques).
// N'affiche QUE ce qui est réellement renseigné : toute ligne, sous-section ou
// rubrique vide est entièrement omise (aucune ligne vierge / effet brouillon).
// Les rubriques visibles sont renumérotées en continu (1,2,3…).
//
// Module PARTAGÉ entre :
//  - ProAnalyze  → rapport « Clinique seul » (document autonome, buildObservationDoc)
//  - ResultCard  → section médicale du rapport « Fusionné » (buildObservationSections)
// ════════════════════════════════════════════════════════════════════════

export interface ObservationData {
  // En-tête / cabinet
  date?: string;
  refNum?: string;
  doctorName?: string;
  doctorLicense?: string;
  cabinetName?: string;
  doctorCity?: string;
  overrideBadge?: string; // HTML optionnel (badge « révisé par Dr … »)
  overrideActive?: boolean; // le médecin a corrigé/établi le diagnostic → bandeau en tête

  // Bandeau
  patientPhoto?: string; // data URL de la photo clinique

  // 1 · Identification
  patientName?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  age?: string;
  sex?: string;
  ethnie?: string;
  ville?: string;
  adresse?: string;
  phone?: string;
  email?: string;
  contactUrgence?: string;
  religion?: string;
  statutMarital?: string;
  profession?: string;

  // 2 · Motif
  motif?: string;

  // 3 · Antécédents
  atcdCosmeto?: string;
  atcdMedicaux?: string;
  atcdChirurgicaux?: string;
  allergAlimentaires?: string;
  allergMedic?: string;
  allergEnv?: string;
  atopie?: string;
  groupeSanguin?: string;
  rhesus?: string;
  serologieHiv?: string;
  gynecoObst?: string;
  toxicologiques?: string;
  atcdFamiliaux?: string;

  // 4 · Mode de vie
  modeVie?: string;

  // 5 · Histoire de la maladie
  hma?: string;

  // 6 · Examen clinique (constantes)
  temperature?: string;
  ta?: string;
  gaj?: string;
  fr?: string;
  fc?: string;
  etatGeneral?: string;

  // 7 · Examen dermatologique
  phototype?: string;
  lesions?: string;
  zones?: string;
  nombre?: string;
  morphologie?: string;
  distribution?: string;
  examPeau?: string;
  examPhaneres?: string;
  examMuqueuses?: string;
  examGanglions?: string;
  autresSignes?: string;
  keloidRisk?: string;
  keloidDetails?: string;

  // 8 · Autres appareils (non collectés → lignes vierges)
  pleuroPulm?: string;
  digestif?: string;
  neuro?: string;
  locomoteur?: string;
  uroGenital?: string;
  teteCou?: string;
  thyroide?: string;
  pelvien?: string;

  // 9 · Résumé syndromique
  resumeSyndromique?: string;

  // 10 · Hypothèses diagnostiques
  hypotheses?: string;
  hypothesesSecondaire?: string;

  // 11 · Diagnostics différentiels
  differentiels?: string;

  // 12 · Examens paracliniques
  paracliniques?: string;

  // 13 · Résultats
  resultats?: string;

  // 14 · Traitement
  traitementHtml?: string; // HTML formaté (protocole)

  // 15 · Surveillance
  surveillance?: string;

  // 16 · Évolution
  evolution?: string;

  // Notes libres du praticien (optionnel)
  practitionerNotes?: string;

  // ── Triage (Triage Engineering) ──
  triageLabel?: string;
  triageColor?: string;
  triageReason?: string;

  // ── Briques « Norm Ai » (IA augmentée + traçabilité) ──
  confidence?: string;                                             // niveau de confiance IA
  modelVersion?: string;                                           // version du modèle (audit)
  reasoningSteps?: { observation?: string; rule?: string; conclusion?: string }[];
  appliedRules?: { level?: string; label?: string; action?: string }[];
  validatedBy?: string;                                            // médecin ayant validé
  validatedAt?: string;                                            // date de validation
}

const TEAL = "#1a3a3a";

const esc = (s: any): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Attribut commun : rend un élément éditable au clic dans le viewer (classe gs-edit
// pour le surlignage au survol/focus). data-gs-edit sert de repère (impression = normal).
const EDITABLE = `contenteditable="true" class="gs-edit" data-gs-edit="1"`;

// Vrai si la valeur est vide/absente.
const empty = (v?: string) => !v || !String(v).trim();

// Ligne label + valeur. RIEN si la valeur est vide (aucune ligne pointillée).
const row = (label: string, value?: string): string => {
  if (empty(value)) return "";
  return `<div style="display:flex;gap:8px;align-items:baseline;margin-bottom:5px;font-size:10.5px;line-height:1.5">
    <span style="font-weight:700;color:#374151;min-width:180px;flex-shrink:0">${esc(label)}</span>
    <span ${EDITABLE} style="color:#111;flex:1">${esc(String(value).trim())}</span>
  </div>`;
};

// Bloc de texte libre. RIEN si vide (plus de lignes vierges).
const freeText = (value?: string): string => {
  if (empty(value)) return "";
  return `<div ${EDITABLE} style="font-size:10.5px;color:#111;line-height:1.7;white-space:pre-wrap">${esc(String(value).trim())}</div>`;
};

// Sous-section (sous-titre + contenu). RIEN si tout le contenu est vide.
const group = (subtitle: string, ...parts: string[]): string => {
  const inner = parts.filter((p) => p && p.trim()).join("");
  if (!inner.trim()) return "";
  return `<div style="font-size:9.5px;font-weight:800;color:${TEAL};text-transform:uppercase;letter-spacing:.4px;margin:8px 0 5px">${esc(subtitle)}</div>${inner}`;
};

// Brique 1 — trace de raisonnement (observation → règle → conclusion).
const reasoningHtml = (steps?: { observation?: string; rule?: string; conclusion?: string }[]): string => {
  if (!steps || steps.length === 0) return "";
  return steps.map((s, i) => `
    <div style="margin-bottom:8px;padding-bottom:8px;${i < steps.length - 1 ? "border-bottom:1px solid #eef0f2;" : ""}">
      <div style="font-size:9px;font-weight:800;color:${TEAL};text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px">Étape ${i + 1}</div>
      ${s.observation ? `<div style="font-size:10.5px;color:#111;line-height:1.6"><b>Observation :</b> ${esc(s.observation)}</div>` : ""}
      ${s.rule ? `<div style="font-size:10.5px;color:#374151;line-height:1.6"><b>Règle :</b> ${esc(s.rule)}</div>` : ""}
      ${s.conclusion ? `<div style="font-size:10.5px;color:#111;line-height:1.6"><b>→ Conclusion :</b> ${esc(s.conclusion)}</div>` : ""}
    </div>`).join("");
};

// Brique 3 — protocoles cliniques appliqués (règles déclenchées).
const rulesHtml = (rules?: { level?: string; label?: string; action?: string }[]): string => {
  if (!rules || rules.length === 0) return "";
  return rules.map((r) => {
    const col = r.level === "urgent" ? "#dc2626" : r.level === "important" ? "#d97706" : "#7c3aed";
    const tag = r.level === "urgent" ? "URGENT" : r.level === "important" ? "IMPORTANT" : "INFO";
    return `<div style="display:flex;gap:8px;margin-bottom:7px">
      <span style="color:${col};font-weight:900;font-size:12px;flex-shrink:0">✓</span>
      <div style="font-size:10.5px;line-height:1.6">
        <span style="font-size:8px;font-weight:800;color:${col};border:1px solid ${col}66;border-radius:3px;padding:1px 5px;margin-right:5px">${tag}</span>
        <b style="color:#111">${esc(r.label || "")}</b>
        <div style="color:#374151;margin-top:2px">→ ${esc(r.action || "")}</div>
      </div>
    </div>`;
  }).join("");
};

// Rendu pur d'une carte-rubrique (le numéro est calculé par l'appelant).
const card = (num: string, title: string, inner: string): string =>
  `<div style="margin-bottom:14px;border:1px solid #d1d5db;border-radius:4px;overflow:hidden;break-inside:avoid">
    <div style="background:${TEAL};padding:7px 14px"><span style="font-size:10.5px;font-weight:800;color:#fff;letter-spacing:.4px;text-transform:uppercase">${num} · ${esc(title)}</span></div>
    <div style="background:#fff;padding:11px 14px">${inner}</div>
  </div>`;

// Vrai si le HTML ne contient aucun contenu significatif (que des balises vides).
const hasContent = (inner: string) =>
  !!inner.replace(/<[^>]+>/g, "").trim() || /<img|<svg/i.test(inner);

// Fabrique un numéroteur : les rubriques vides sont ignorées ET ne consomment pas
// de numéro → numérotation continue (1,2,3…) sur les seules rubriques affichées.
function makeNumberer() {
  let n = 0;
  return (title: string, ...blocks: string[]): string => {
    const inner = blocks.filter((b) => b && b.trim()).join("");
    if (!hasContent(inner)) return "";
    n += 1;
    return card(String(n), title, inner);
  };
}

/**
 * Construit les 16 rubriques de l'observation médicale (sans wrapper HTML).
 * Réutilisable en pages intégrées (rapport fusionné).
 */
export function buildObservationSections(d: ObservationData): string {
  const rubric = makeNumberer();
  const practitionerLine = [
    d.doctorName ? `Dr ${esc(d.doctorName)}` : "",
    d.doctorLicense ? `N° ordre ${esc(d.doctorLicense)}` : "",
    d.cabinetName ? esc(d.cabinetName) : "",
    d.doctorCity ? esc(d.doctorCity) : "",
  ].filter(Boolean).join(" · ");
  const banner = (d.patientPhoto || practitionerLine || d.patientName || d.date)
    ? `<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;padding-bottom:12px;border-bottom:2px solid ${TEAL}">
        ${d.patientPhoto ? `<img src="${d.patientPhoto}" alt="" style="width:82px;height:82px;object-fit:cover;border-radius:8px;border:2px solid ${TEAL};flex-shrink:0"/>` : ""}
        <div style="flex:1">
          ${d.patientName ? `<div style="font-size:14px;font-weight:900;color:#111">${esc(d.patientName)}</div>` : ""}
          ${practitionerLine ? `<div style="font-size:10px;color:#374151;margin-top:3px">${practitionerLine}${d.overrideBadge || ""}</div>` : ""}
          ${(d.date || d.refNum) ? `<div style="font-size:9.5px;color:#6b7280;margin-top:2px">${esc(d.date || "")}${d.refNum ? " · Réf " + esc(d.refNum) : ""}</div>` : ""}
        </div>
      </div>`
    : "";
  const triageBar = d.triageLabel ? `
  <div style="border-radius:8px;padding:9px 14px;margin-bottom:14px;background:${(d.triageColor || "#059669")}14;border:1px solid ${(d.triageColor || "#059669")}55">
    <span style="font-size:8.5px;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:${d.triageColor || "#059669"}">Triage</span>
    <div style="font-size:13px;font-weight:900;color:#111;margin-top:1px">${esc(d.triageLabel)}</div>
    ${d.triageReason ? `<div style="font-size:9.5px;color:#6b7280;margin-top:1px">${esc(d.triageReason)}</div>` : ""}
  </div>` : "";

  return `
${banner}
${triageBar}
${rubric("Identification",
  row("Nom et prénom", d.patientName),
  row("Date de naissance", d.dateNaissance),
  row("Lieu de naissance", d.lieuNaissance),
  row("Âge", d.age),
  row("Sexe", d.sex),
  row("Ethnie", d.ethnie),
  row("Profession", d.profession),
  row("Ville de résidence", d.ville),
  row("Adresse & contact", [d.adresse, d.phone].filter(Boolean).join(" · ")),
  row("Email", d.email),
  row("Personne à joindre (urgence)", d.contactUrgence),
  row("Religion", d.religion),
  row("Statut marital", d.statutMarital),
)}

${rubric("Motif de consultation", freeText(d.motif))}

${rubric("Antécédents",
  group("Personnels",
    row("Cosmétologiques", d.atcdCosmeto),
    row("Médicaux", d.atcdMedicaux),
    row("Chirurgicaux", d.atcdChirurgicaux),
  ),
  group("Immuno-allergiques",
    row("Alimentaires", d.allergAlimentaires),
    row("Médicamenteuses", d.allergMedic),
    row("Environnementales", d.allergEnv),
    row("Atopie", d.atopie),
  ),
  group("Biologiques & autres",
    row("Groupe sanguin / Rhésus", [d.groupeSanguin, d.rhesus].filter(Boolean).join(" ")),
    row("Sérologie HIV", d.serologieHiv),
    row("Gynéco-obstétricaux", d.gynecoObst),
    row("Toxicologiques", d.toxicologiques),
  ),
  group("Familiaux", freeText(d.atcdFamiliaux)),
)}

${rubric("Mode de vie", freeText(d.modeVie))}

${rubric("Histoire de la maladie", freeText(d.hma))}

${rubric("Examen clinique — constantes",
  row("Température", d.temperature),
  row("Tension artérielle (TA)", d.ta),
  row("Glycémie à jeun (GAJ)", d.gaj),
  row("Fréquence respiratoire (FR)", d.fr),
  row("Fréquence cardiaque (FC)", d.fc),
  group("État général", freeText(d.etatGeneral)),
)}

${rubric("Examen dermatologique",
  row("Phototype", d.phototype),
  row("Lésions élémentaires", d.lesions),
  row("Localisation / zones", d.zones),
  row("Nombre", d.nombre),
  row("Morphologie", d.morphologie),
  row("Distribution", d.distribution),
  group("Peau", freeText(d.examPeau)),
  row("Phanères", d.examPhaneres),
  row("Muqueuses", d.examMuqueuses),
  row("Aires ganglionnaires", d.examGanglions),
  group("Autres signes", freeText(d.autresSignes)),
  group("Risque chéloïde", row("Niveau", d.keloidRisk), freeText(d.keloidDetails)),
)}

${rubric("Autres appareils",
  row("Pleuro-pulmonaire", d.pleuroPulm),
  row("Digestif", d.digestif),
  row("Neurologique", d.neuro),
  row("Locomoteur", d.locomoteur),
  row("Uro-génital", d.uroGenital),
  row("Tête et cou", d.teteCou),
  row("Thyroïde", d.thyroide),
  row("Examen pelvien", d.pelvien),
)}

${rubric("Résumé syndromique", freeText(d.resumeSyndromique))}

${rubric("Hypothèses diagnostiques",
  row("Diagnostic principal", d.hypotheses),
  row("Diagnostic secondaire", d.hypothesesSecondaire),
  row("Niveau de confiance (IA)", d.confidence),
)}

${rubric("Raisonnement clinique assisté (IA)", reasoningHtml(d.reasoningSteps))}

${rubric("Diagnostics différentiels", freeText(d.differentiels))}

${rubric("Alertes cliniques (protocoles appliqués)", rulesHtml(d.appliedRules))}

${rubric("Examens paracliniques", freeText(d.paracliniques))}

${rubric("Résultats", freeText(d.resultats))}

${rubric("Traitement", d.traitementHtml || "")}

${rubric("Surveillance", freeText(d.surveillance))}

${rubric("Évolution", freeText(d.evolution))}

${rubric("Notes & conclusion du praticien", freeText(d.practitionerNotes))}
`;
}

/**
 * Document PDF autonome complet (mode « Clinique seul »).
 */
export function buildObservationDoc(d: ObservationData): string {
  // On n'expose JAMAIS le fournisseur/modèle externe (Gemini, Llama…) dans le rapport.
  const modelShort = "IA GlowScan";

  const header = `
  <div style="text-align:center;border-bottom:2px solid ${TEAL};padding-bottom:10px;margin-bottom:14px">
    <div style="font-size:17px;font-weight:900;color:${TEAL};letter-spacing:.5px">OBSERVATION MÉDICALE</div>
    <div style="font-size:10px;color:#6b7280;margin-top:3px">${esc(d.cabinetName || "Cabinet de dermatologie")}${d.doctorCity ? " · " + esc(d.doctorCity) : ""}</div>
    <div style="font-size:8px;color:#9ca3af;margin-top:3px;letter-spacing:.3px">Rapport clinique assisté par IA · validation et responsabilité du praticien</div>
  </div>
  ${d.overrideActive ? `
  <div style="margin-bottom:14px;background:#e7f6ef;border:1px solid #34a06f;border-left:4px solid #1c7c54;border-radius:6px;padding:10px 14px;display:flex;align-items:center;gap:10px">
    <span style="font-size:16px">✔</span>
    <div>
      <div style="font-size:11px;font-weight:900;color:#0f5132">Diagnostic établi par le médecin</div>
      <div style="font-size:9px;color:#14663f;line-height:1.5">${esc(d.validatedBy || d.doctorName || "Le praticien")} a révisé l'hypothèse de l'IA. Le diagnostic ci-dessous est celui du praticien et fait foi.</div>
    </div>
  </div>` : ""}`;

  // Brique 2 — traçabilité : qui a proposé / validé, avec quelle version.
  const trace = `
  <div style="margin-top:16px;background:#f7faf9;border:1px solid #d8e4e1;border-radius:6px;padding:8px 12px;font-size:8.5px;color:#374151;line-height:1.6">
    <b style="color:${TEAL}">Traçabilité —</b> Diagnostic proposé par ${esc(modelShort)}${d.validatedBy ? ` · Validé/corrigé par <b>${esc(d.validatedBy)}</b>` : " · <b>en attente de validation médecin</b>"}${d.validatedAt ? ` le ${esc(d.validatedAt)}` : ""}. Le diagnostic validé par le praticien fait foi.
  </div>`;

  const footer = `
  ${trace}
  <div style="margin-top:14px;border-top:1px solid #d1d5db;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end">
    <div style="font-size:8.5px;color:#9ca3af;max-width:50%;line-height:1.5">Document médical confidentiel · À usage strictement professionnel · À conserver dans le dossier médical du patient.</div>
    <div style="text-align:center;min-width:180px">
      <div style="font-size:8px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px">Le praticien</div>
      <div style="font-size:12px;font-weight:800;color:#111">${esc(d.validatedBy || d.doctorName || "Dr —")}</div>
      <div style="font-size:8px;color:#6b7280;margin-top:2px">Validé électroniquement${d.validatedAt ? ` le ${esc(d.validatedAt)}` : ""}</div>
      <div style="border-top:1px solid #374151;width:160px;margin:22px auto 3px"></div>
      <div style="font-size:8px;color:#9ca3af">Signature &amp; cachet (si impression)</div>
    </div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"/>
<style>
  @page { margin: 14mm 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
  /* Édition inline : cliquer sur un mot ou une ligne vierge pour le modifier. */
  .gs-edit { outline: none; cursor: text; transition: background .12s; border-radius: 3px; padding: 0 2px; }
  .gs-edit:hover { background: #fff7d6; }
  .gs-edit:focus { background: #fff7d6; box-shadow: 0 0 0 2px rgba(245,158,11,.45); }
  /* Masque les repères d'édition à l'impression / export PDF. */
  @media print { .gs-edit:hover, .gs-edit:focus { background: transparent; box-shadow: none; } }
</style></head>
<body>
${header}
${buildObservationSections(d)}
${footer}
</body></html>`;
}
