import type { AnalysisResult, Patient } from "@shared/schema";

interface PremiumPdfTemplateProps {
  patient: Patient;
  analysis: AnalysisResult;
  doctorName: string;
  cabinetName: string;
  patientPhoto?: string;
  override?: {
    condition: string;
    score: number;
    explanation: string;
  };
  referenceNumber: string;
  qrCodeSvg?: string;
}

export function PremiumPdfTemplate({
  patient,
  analysis,
  doctorName,
  cabinetName,
  patientPhoto,
  override,
  referenceNumber,
  qrCodeSvg,
}: PremiumPdfTemplateProps): string {
  const NOW = new Date().toLocaleDateString("fr-FR");
  const aiCondition = analysis.condition || "Analyse en cours";
  const aiScore = analysis.score || 50;
  const finalCondition = override?.condition || aiCondition;
  const finalScore = override?.score || aiScore;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #fff;
      color: #333;
      font-size: 11px;
      line-height: 1.4;
    }
    .page {
      width: 210mm;
      height: 297mm;
      padding: 20mm;
      page-break-after: always;
      background: #fff;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #7c3aed;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo {
      font-size: 20px;
      font-weight: 700;
      color: #7c3aed;
      margin-bottom: 5px;
    }
    .cabinet-name {
      font-size: 12px;
      color: #666;
      font-weight: 600;
    }
    .ref-date {
      font-size: 9px;
      color: #999;
      margin-top: 8px;
    }
    .patient-photo {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      margin: 15px auto;
      border: 3px solid #7c3aed;
      object-fit: cover;
      display: block;
    }
    .patient-info {
      text-align: center;
      margin-bottom: 20px;
      padding: 10px;
      background: #f5f5f5;
      border-radius: 8px;
    }
    .patient-name {
      font-size: 14px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .patient-meta {
      font-size: 10px;
      color: #666;
      margin-top: 3px;
    }
    .diagnosis-card {
      border: 2px solid #7c3aed;
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
      background: #f9f7ff;
    }
    .diagnosis-title {
      font-size: 10px;
      font-weight: 700;
      color: #7c3aed;
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 1px;
    }
    .diagnosis-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .diagnosis-item {
      border-right: 1px solid #ddd;
      padding-right: 10px;
    }
    .diagnosis-item:nth-child(even) {
      border-right: none;
      padding-left: 10px;
    }
    .diagnosis-label {
      font-size: 9px;
      color: #999;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .diagnosis-value {
      font-size: 12px;
      font-weight: 600;
      color: #1a1a1a;
    }
    .override-section {
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 10px;
      margin: 10px 0;
      font-size: 10px;
      color: #166534;
    }
    .toxic-ingredients {
      margin: 15px 0;
    }
    .toxic-title {
      font-size: 10px;
      font-weight: 700;
      color: #dc2626;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .ingredient-box {
      display: inline-block;
      background: #fee2e2;
      border: 1px solid #dc2626;
      border-radius: 4px;
      padding: 4px 8px;
      margin: 3px;
      font-size: 9px;
      color: #991b1b;
    }
    .routine-section {
      margin-top: 15px;
      page-break-inside: avoid;
    }
    .routine-title {
      font-size: 11px;
      font-weight: 700;
      color: #7c3aed;
      margin-bottom: 8px;
      text-transform: uppercase;
      border-bottom: 1px solid #ddd;
      padding-bottom: 5px;
    }
    .product-list {
      margin-left: 10px;
      font-size: 9px;
    }
    .product-item {
      margin: 5px 0;
      color: #333;
    }
    .signature-block {
      margin-top: 20px;
      border-top: 1px solid #ddd;
      padding-top: 15px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .signature-field {
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid #000;
      height: 40px;
      margin-bottom: 5px;
    }
    .signature-label {
      font-size: 9px;
      font-weight: 600;
      color: #333;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      font-size: 8px;
      color: #999;
      text-align: center;
    }
    .disclaimer {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 4px;
      padding: 8px;
      margin: 10px 0;
      font-size: 8px;
      color: #92400e;
    }
    .qr-code {
      text-align: center;
      margin: 10px 0;
    }
    .qr-code img {
      max-width: 80px;
      height: auto;
    }
  </style>
</head>
<body>
  <!-- PAGE 1 -->
  <div class="page">
    <div class="header">
      <div class="logo">🔍 GlowScan</div>
      <div class="cabinet-name">${cabinetName}</div>
      <div class="ref-date">
        <strong>Réf:</strong> ${referenceNumber}<br>
        <strong>Date:</strong> ${NOW}
      </div>
    </div>

    ${patientPhoto ? `<img src="${patientPhoto}" class="patient-photo" alt="Patient">` : ""}

    <div class="patient-info">
      <div class="patient-name">${patient.firstName} ${patient.lastName}</div>
      <div class="patient-meta">
        ${patient.age ? `Âge: ${patient.age} ans` : ""}
        ${patient.sex && patient.sex !== "—" ? `| Sexe: ${patient.sex}` : ""}
      </div>
    </div>

    <div class="diagnosis-card">
      <div class="diagnosis-title">📋 Diagnostic</div>
      <div class="diagnosis-grid">
        <div class="diagnosis-item">
          <div class="diagnosis-label">🤖 IA Détecte</div>
          <div class="diagnosis-value">${aiCondition}</div>
        </div>
        <div class="diagnosis-item">
          <div class="diagnosis-label">👨‍⚕️ ${doctorName || "Médecin"}</div>
          <div class="diagnosis-value">${finalCondition}</div>
        </div>
        <div class="diagnosis-item">
          <div class="diagnosis-label">Score IA</div>
          <div class="diagnosis-value">${aiScore}/100</div>
        </div>
        <div class="diagnosis-item">
          <div class="diagnosis-label">Score Final</div>
          <div class="diagnosis-value">${finalScore}/100</div>
        </div>
      </div>
      ${
        override
          ? `
        <div class="override-section" style="margin-top: 10px;">
          <strong>Correction Médicale:</strong><br>
          ${override.explanation}
        </div>
      `
          : ""
      }
    </div>

    ${
      analysis.toxicIngredients && analysis.toxicIngredients.length > 0
        ? `
      <div class="toxic-ingredients">
        <div class="toxic-title">⚠️ Ingrédients à Éviter</div>
        ${analysis.toxicIngredients
          .map(
            (ing: any) =>
              `<div class="ingredient-box">${ing.name || ing}</div>`
          )
          .join("")}
      </div>
    `
        : ""
    }

    <div class="disclaimer">
      🔒 Document médical confidentiel établi et validé par le praticien soussigné · À usage strictement professionnel.
    </div>

    ${qrCodeSvg ? `<div class="qr-code">${qrCodeSvg}</div>` : ""}

    <div class="footer">
      GlowScan DERM — Analyse Dermatologique Augmentée par IA
    </div>
  </div>

  <!-- PAGE 2 -->
  <div class="page">
    <div class="header">
      <div class="logo">💊 Routine Recommandée</div>
      <div class="cabinet-name">${cabinetName}</div>
    </div>

    ${
      analysis.clinicalProtocol?.morning
        ? `
      <div class="routine-section">
        <div class="routine-title">🌅 Matin</div>
        <div class="product-list">
          ${analysis.clinicalProtocol.morning
            .map((step: string) => `<div class="product-item">✓ ${step}</div>`)
            .join("")}
        </div>
      </div>
    `
        : ""
    }

    ${
      analysis.clinicalProtocol?.evening
        ? `
      <div class="routine-section">
        <div class="routine-title">🌙 Soir</div>
        <div class="product-list">
          ${analysis.clinicalProtocol.evening
            .map((step: string) => `<div class="product-item">✓ ${step}</div>`)
            .join("")}
        </div>
      </div>
    `
        : ""
    }

    ${
      analysis.clinicalProtocol?.weekly
        ? `
      <div class="routine-section">
        <div class="routine-title">📅 Hebdomadaire</div>
        <div class="product-list">
          ${analysis.clinicalProtocol.weekly
            .map((step: string) => `<div class="product-item">✓ ${step}</div>`)
            .join("")}
        </div>
      </div>
    `
        : ""
    }

    <div class="signature-block">
      <div class="signature-field">
        <div class="signature-line"></div>
        <div class="signature-label">Signature du Praticien</div>
      </div>
      <div class="signature-field">
        <div class="signature-line"></div>
        <div class="signature-label">Date</div>
      </div>
    </div>

    <div class="footer">
      Ce rapport a été généré par GlowScan DERM — Plateforme de Diagnostic Dermatologique Certifiée
    </div>
  </div>
</body>
</html>
  `.trim();
}
