// ════════════════════════════════════════════════════════════════════════
// Rapport PDF « Observation médicale » (DERM)
// Reproduit la trame classique d'observation médicale hospitalière (16 rubriques)
// fournie par le cabinet. Les champs disponibles sont pré-remplis ; les rubriques
// non collectées (constantes vitales, autres appareils, paracliniques…) sont
// affichées en lignes vierges à compléter à la main ou à l'écran avant impression.
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
}

const TEAL = "#1a3a3a";

const esc = (s: any): string =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Attribut commun : rend un élément éditable au clic dans le viewer (classe gs-edit
// pour le surlignage au survol/focus). data-gs-edit sert de repère (impression = normal).
const EDITABLE = `contenteditable="true" class="gs-edit" data-gs-edit="1"`;

// Ligne label + valeur (ou pointillés si vide). La VALEUR est éditable au clic.
const row = (label: string, value?: string): string => {
  const v = (value || "").trim();
  const content = v
    ? `<span ${EDITABLE} style="color:#111;flex:1">${esc(v)}</span>`
    : `<span ${EDITABLE} style="color:#111;border-bottom:1px dotted #9ca3af;flex:1;min-height:13px"></span>`;
  return `<div style="display:flex;gap:8px;align-items:baseline;margin-bottom:5px;font-size:10.5px;line-height:1.5">
    <span style="font-weight:700;color:#374151;min-width:180px;flex-shrink:0">${esc(label)}</span>
    ${content}
  </div>`;
};

// Bloc de texte libre (ou N lignes vierges si vide) — éditable au clic.
const freeText = (value?: string, blankLines = 3): string => {
  const v = (value || "").trim();
  if (v) return `<div ${EDITABLE} style="font-size:10.5px;color:#111;line-height:1.7;white-space:pre-wrap">${esc(v)}</div>`;
  return Array.from({ length: blankLines })
    .map(() => `<div ${EDITABLE} style="border-bottom:1px dotted #9ca3af;min-height:16px;font-size:10.5px;color:#111"></div>`)
    .join("");
};

const rubric = (num: string, title: string, inner: string): string =>
  `<div style="margin-bottom:14px;border:1px solid #d1d5db;border-radius:4px;overflow:hidden;break-inside:avoid">
    <div style="background:${TEAL};padding:7px 14px"><span style="font-size:10.5px;font-weight:800;color:#fff;letter-spacing:.4px;text-transform:uppercase">${num} · ${esc(title)}</span></div>
    <div style="background:#fff;padding:11px 14px">${inner}</div>
  </div>`;

const subLabel = (t: string): string =>
  `<div style="font-size:9.5px;font-weight:800;color:${TEAL};text-transform:uppercase;letter-spacing:.4px;margin:8px 0 5px">${esc(t)}</div>`;

/**
 * Construit les 16 rubriques de l'observation médicale (sans wrapper HTML).
 * Réutilisable en pages intégrées (rapport fusionné).
 */
export function buildObservationSections(d: ObservationData): string {
  return `
${rubric("1", "Identification", `
  ${row("Nom et prénom", d.patientName)}
  ${row("Date de naissance", d.dateNaissance)}
  ${row("Lieu de naissance", d.lieuNaissance)}
  ${row("Âge", d.age)}
  ${row("Sexe", d.sex)}
  ${row("Ethnie", d.ethnie)}
  ${row("Profession", d.profession)}
  ${row("Ville de résidence", d.ville)}
  ${row("Adresse & contact", [d.adresse, d.phone].filter(Boolean).join(" · "))}
  ${row("Email", d.email)}
  ${row("Personne à joindre (urgence)", d.contactUrgence)}
  ${row("Religion", d.religion)}
  ${row("Statut marital", d.statutMarital)}
`)}

${rubric("2", "Motif de consultation", freeText(d.motif, 2))}

${rubric("3", "Antécédents", `
  ${subLabel("Personnels")}
  ${row("Cosmétologiques", d.atcdCosmeto)}
  ${row("Médicaux", d.atcdMedicaux)}
  ${row("Chirurgicaux", d.atcdChirurgicaux)}
  ${subLabel("Immuno-allergiques")}
  ${row("Alimentaires", d.allergAlimentaires)}
  ${row("Médicamenteuses", d.allergMedic)}
  ${row("Environnementales", d.allergEnv)}
  ${row("Atopie", d.atopie)}
  ${subLabel("Biologiques & autres")}
  ${row("Groupe sanguin / Rhésus", [d.groupeSanguin, d.rhesus].filter(Boolean).join(" "))}
  ${row("Sérologie HIV", d.serologieHiv)}
  ${row("Gynéco-obstétricaux", d.gynecoObst)}
  ${row("Toxicologiques", d.toxicologiques)}
  ${subLabel("Familiaux")}
  ${freeText(d.atcdFamiliaux, 2)}
`)}

${rubric("4", "Mode de vie", freeText(d.modeVie, 2))}

${rubric("5", "Histoire de la maladie", freeText(d.hma, 4))}

${rubric("6", "Examen clinique — constantes", `
  ${row("Température", d.temperature)}
  ${row("Tension artérielle (TA)", d.ta)}
  ${row("Glycémie à jeun (GAJ)", d.gaj)}
  ${row("Fréquence respiratoire (FR)", d.fr)}
  ${row("Fréquence cardiaque (FC)", d.fc)}
  ${subLabel("État général")}
  ${freeText(d.etatGeneral, 2)}
`)}

${rubric("7", "Examen dermatologique", `
  ${row("Phototype", d.phototype)}
  ${row("Lésions élémentaires", d.lesions)}
  ${row("Localisation / zones", d.zones)}
  ${row("Nombre", d.nombre)}
  ${row("Morphologie", d.morphologie)}
  ${row("Distribution", d.distribution)}
  ${subLabel("Peau")}
  ${freeText(d.examPeau, 2)}
  ${row("Phanères", d.examPhaneres)}
  ${row("Muqueuses", d.examMuqueuses)}
  ${row("Aires ganglionnaires", d.examGanglions)}
  ${d.autresSignes ? subLabel("Autres signes") + freeText(d.autresSignes, 1) : ""}
  ${(d.keloidRisk || d.keloidDetails) ? subLabel("Risque chéloïde") + row("Niveau", d.keloidRisk) + (d.keloidDetails ? freeText(d.keloidDetails, 1) : "") : ""}
`)}

${rubric("8", "Autres appareils", `
  ${row("Pleuro-pulmonaire", d.pleuroPulm)}
  ${row("Digestif", d.digestif)}
  ${row("Neurologique", d.neuro)}
  ${row("Locomoteur", d.locomoteur)}
  ${row("Uro-génital", d.uroGenital)}
  ${row("Tête et cou", d.teteCou)}
  ${row("Thyroïde", d.thyroide)}
  ${row("Examen pelvien", d.pelvien)}
`)}

${rubric("9", "Résumé syndromique", freeText(d.resumeSyndromique, 3))}

${rubric("10", "Hypothèses diagnostiques", `
  ${row("Diagnostic principal", d.hypotheses)}
  ${d.hypothesesSecondaire ? row("Diagnostic secondaire", d.hypothesesSecondaire) : ""}
`)}

${rubric("11", "Diagnostics différentiels", freeText(d.differentiels, 2))}

${rubric("12", "Examens paracliniques", freeText(d.paracliniques, 3))}

${rubric("13", "Résultats", freeText(d.resultats, 3))}

${rubric("14", "Traitement", d.traitementHtml || freeText(undefined, 4))}

${rubric("15", "Surveillance", freeText(d.surveillance, 2))}

${rubric("16", "Évolution", freeText(d.evolution, 3))}

${d.practitionerNotes ? rubric("+", "Notes du praticien", freeText(d.practitionerNotes, 1)) : ""}
`;
}

/**
 * Document PDF autonome complet (mode « Clinique seul »).
 */
export function buildObservationDoc(d: ObservationData): string {
  const header = `
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid ${TEAL};padding-bottom:12px;margin-bottom:16px">
    <div>
      <div style="font-size:17px;font-weight:900;color:${TEAL};letter-spacing:.5px">OBSERVATION MÉDICALE</div>
      <div style="font-size:10px;color:#6b7280;margin-top:3px">${esc(d.cabinetName || "Cabinet de dermatologie")}${d.doctorCity ? " · " + esc(d.doctorCity) : ""}</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#374151">
      <div><b>Dr ${esc(d.doctorName || "…")}</b>${d.overrideBadge || ""}</div>
      ${d.doctorLicense ? `<div style="color:#6b7280">N° ordre : ${esc(d.doctorLicense)}</div>` : ""}
      <div style="color:#6b7280">${esc(d.date || "")}</div>
      ${d.refNum ? `<div style="color:#6b7280">Réf : ${esc(d.refNum)}</div>` : ""}
    </div>
  </div>`;

  const footer = `
  <div style="margin-top:18px;border-top:1px solid #d1d5db;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end">
    <div style="font-size:8.5px;color:#9ca3af;max-width:60%;line-height:1.5">Document médical confidentiel établi et validé par le praticien soussigné · À usage strictement professionnel · À conserver dans le dossier médical du patient.</div>
    <div style="text-align:center">
      <div style="font-size:9px;color:#6b7280;margin-bottom:28px">Signature et cachet du médecin</div>
      <div style="border-top:1px solid #374151;width:150px"></div>
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
