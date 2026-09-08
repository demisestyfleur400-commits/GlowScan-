import { useMemo, useState } from "react";
import { ConsultationLauncher } from "@/components/ConsultationLauncher";
import type { AnalysisResult } from "@shared/schema";

// ════════════════════════════════════════════════════════════════════════
// Score bas (< 60) — parcours de confiance guidé (B2C), 5 écrans.
//   1. Résultat personnalisé + préoccupations RÉELLEMENT détectées
//   2. Explication du résultat (limites de l'IA, non-diagnostic)
//   3. Valeur du dermatologue
//   4. Déroulement de la consultation
//   5. Prix + garantie → ConsultationLauncher réel (paiement Mobile Money)
// Aucune donnée inventée : les préoccupations proviennent des champs réels
// renvoyés par le moteur (condition, conditionSecondaire, balance). Zéro
// formulation alarmante. L'utilisateur reste libre (rappel 24 h).
// ════════════════════════════════════════════════════════════════════════

const DS = {
  ink: "#1a1a2e", body: "#374151", muted: "#6b7280", violet: "#7c3aed",
  surface: "#faf9ff", border: "rgba(124,58,237,0.15)",
};

type Concern = { label: string; explain: string; source: "named" | "derived" };

// ── Copywriting dynamique par famille de préoccupation ──
// Retourne un titre + texte adaptés, en formulation prudente et non alarmante.
function concernCopy(concerns: Concern[]): { title: string; text: string } {
  if (concerns.length === 0) {
    return {
      title: "Votre peau mérite une attention personnalisée",
      text: "L'analyse n'a pas relevé de préoccupation suffisamment nette pour être détaillée ici, mais votre Glow Score invite à un avis professionnel. Un dermatologue peut examiner votre situation et répondre à vos questions.",
    };
  }
  if (concerns.length > 1) {
    return {
      title: "Votre analyse révèle plusieurs points à mieux comprendre",
      text: "Nous avons relevé plusieurs préoccupations possibles. Elles ne signifient pas nécessairement qu'il existe un problème grave, mais un avis professionnel peut vous aider à les interpréter correctement.",
    };
  }
  const c = concerns[0].label.toLowerCase();
  if (/(acn|bouton|imperfection|comédon|comedon|pore)/.test(c)) {
    return {
      title: "Des signes associés aux imperfections ont été observés",
      text: "Cela peut correspondre à plusieurs situations, comme des boutons, des pores obstrués ou une irritation. Un dermatologue peut vous aider à mieux comprendre ce qui se passe et à éviter les produits inadaptés.",
    };
  }
  if (/(pigment|tache|hyperpig|marque|cicatr)/.test(c)) {
    return {
      title: "Des différences de pigmentation ont été observées",
      text: "Les marques et variations de pigmentation peuvent avoir différentes causes. Un professionnel peut vous aider à les identifier et à choisir une approche adaptée à votre peau.",
    };
  }
  if (/(sécheress|secheress|déshydrat|deshydrat|sèche|seche|inconfort)/.test(c)) {
    return {
      title: "Votre peau semble manquer de confort",
      text: "Une sensation de sécheresse peut être liée à plusieurs facteurs, notamment les produits utilisés, l'environnement ou la barrière cutanée. Un dermatologue peut vous aider à déterminer les soins les plus adaptés.",
    };
  }
  if (/(rougeur|irrit|inflamm|sensib)/.test(c)) {
    return {
      title: "Des signes de rougeur ou de sensibilité ont été observés",
      text: "Ces signes peuvent avoir plusieurs explications, comme une réaction à un produit ou une peau réactive. Un dermatologue peut vous aider à en comprendre l'origine et à adapter vos soins.",
    };
  }
  return {
    title: "Une préoccupation a été observée sur votre peau",
    text: "Cette observation peut avoir plusieurs explications. Elle ne constitue pas un diagnostic. Un dermatologue peut vous aider à mieux comprendre votre situation et à choisir une approche adaptée.",
  };
}

// ── Détection des préoccupations à partir des DONNÉES RÉELLES ──
// Named : condition + conditionSecondaire (labels renvoyés par le moteur).
// Derived : axes numériques `balance` clairement élevés (≥ 60), formulés
// comme « signes observés » (jamais un diagnostic). Aucune invention.
function buildConcerns(result: Partial<AnalysisResult>): Concern[] {
  const out: Concern[] = [];
  const seen = new Set<string>();
  const add = (label: string, explain: string, source: Concern["source"]) => {
    const key = label.trim().toLowerCase();
    if (!label.trim() || seen.has(key)) return;
    seen.add(key); out.push({ label: label.trim(), explain, source });
  };

  const isNeutral = (s?: string | null) =>
    !s || /peau saine|aucune|rien|sain|normal|équilibr|equilibr/i.test(s);

  if (!isNeutral(result.condition)) {
    add(result.condition as string, "Signes compatibles avec cette préoccupation. À confirmer par un professionnel.", "named");
  }
  if (!isNeutral(result.conditionSecondaire)) {
    add(result.conditionSecondaire as string, "Élément secondaire relevé par l'analyse. Un avis médical permet de l'interpréter.", "named");
  }

  const b = result.balance;
  if (b) {
    const TH = 60;
    if ((b.inflammation ?? 0) >= TH) add("Rougeurs / irritation", "Certaines zones présentent des signes compatibles avec une rougeur ou une sensibilité.", "derived");
    if ((b.sebum ?? 0) >= TH) add("Excès de sébum", "Des signes compatibles avec une peau qui produit davantage de sébum ont été observés.", "derived");
    if ((b.pores ?? 0) >= TH) add("Pores visibles", "Des pores plus marqués ont été observés sur certaines zones.", "derived");
    if ((b.sensitivity ?? 0) >= TH) add("Sensibilité", "Des signes compatibles avec une peau réactive ont été observés.", "derived");
    if ((b.scars ?? 0) >= TH) add("Marques / cicatrices", "Des marques ou irrégularités de texture ont été observées.", "derived");
  }
  return out;
}

export function LowScoreExperience({ score, scanId, condition, imageUrl, result }: {
  score: number; scanId?: number | null; condition?: string; imageUrl?: string | null;
  result?: Partial<AnalysisResult>;
}) {
  const [step, setStep] = useState(1);
  const [waited, setWaited] = useState(false);

  // Source unique : l'objet result réel (fallback sur les props unitaires).
  const merged: Partial<AnalysisResult> = useMemo(
    () => ({ ...(result || {}), condition: result?.condition ?? condition, score }),
    [result, condition, score]
  );
  const concerns = useMemo(() => buildConcerns(merged), [merged]);
  const lowConfidence = merged.confidence === "low";
  const copy = useMemo(() => concernCopy(concerns), [concerns]);

  const remindLater = async () => {
    setWaited(true);
    try {
      await fetch("/api/b2c/remind-later", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId }),
      });
    } catch {}
  };

  const shell = (children: React.ReactNode) => (
    <div data-testid={`lowscore-step-${step}`} style={{ maxWidth: 460, margin: "0 auto", display: "flex", flexDirection: "column", gap: 18, padding: "8px 0", fontFamily: "-apple-system, system-ui, sans-serif" }}>
      {/* Progression — 5 points, aucune urgence */}
      <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} style={{ width: n === step ? 22 : 7, height: 7, borderRadius: 4, background: n <= step ? DS.violet : "#e5e7eb", transition: "all .3s" }} />
        ))}
      </div>
      {children}
      <p style={{ textAlign: "center", fontSize: 9.5, color: DS.muted, margin: 0 }}>
        Analyse indicative — ne remplace pas un diagnostic médical.
      </p>
    </div>
  );

  const primaryBtn = (label: string, onClick: () => void) => (
    <button onClick={onClick} data-testid={`btn-step-${step}-next`}
      style={{ width: "100%", minHeight: 54, borderRadius: 16, border: "none", background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
      {label}
    </button>
  );

  const backLink = (
    <button onClick={() => setStep((s) => Math.max(1, s - 1))}
      style={{ background: "none", border: "none", color: DS.muted, fontSize: 12.5, fontWeight: 600, cursor: "pointer", padding: 4 }}>
      ← Retour
    </button>
  );

  // ═══════════════ ÉCRAN 1 — RÉSULTAT PERSONNALISÉ ═══════════════
  if (step === 1) {
    return shell(<>
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 92, height: 92, borderRadius: "50%", background: "rgba(124,58,237,0.06)", border: "2px solid rgba(124,58,237,0.3)" }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: DS.violet, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: DS.violet, letterSpacing: "0.1em", marginTop: 2 }}>GLOW SCORE</span>
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "0 6px" }}>
        <p style={{ fontSize: 20, fontWeight: 800, color: DS.ink, lineHeight: 1.35, margin: "0 0 10px" }}>
          Voici ce que GlowScan a observé
        </p>
        <p style={{ fontSize: 14, fontWeight: 500, color: DS.body, lineHeight: 1.6, margin: 0 }}>
          Votre résultat indique que votre peau mérite une attention plus personnalisée. Cette analyse est une première orientation et ne remplace pas l'avis d'un professionnel de santé.
        </p>
      </div>

      {/* Préoccupations observées — uniquement les réelles */}
      {concerns.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: DS.violet, margin: 0, textAlign: "center" }}>
            Préoccupations observées
          </p>
          {concerns.map((c, i) => (
            <div key={i} data-testid={`concern-${i}`} style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: "12px 14px" }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: DS.ink, margin: "0 0 3px" }}>{c.label}</p>
              <p style={{ fontSize: 12.5, color: DS.muted, margin: 0, lineHeight: 1.5 }}>{c.explain}</p>
            </div>
          ))}
          {lowConfidence && (
            <p style={{ fontSize: 11.5, color: DS.muted, textAlign: "center", margin: 0, lineHeight: 1.5 }}>
              Ces observations ont un niveau de confiance limité — raison de plus pour un avis professionnel.
            </p>
          )}
        </div>
      ) : (
        // État neutre : score < 60 mais aucune préoccupation assez fiable
        <div style={{ background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: "14px 16px", textAlign: "center" }}>
          <p style={{ fontSize: 13.5, color: DS.body, margin: 0, lineHeight: 1.55 }}>
            L'analyse n'a pas isolé de préoccupation assez fiable pour être détaillée ici. Un dermatologue peut examiner votre situation et vous orienter avec certitude.
          </p>
        </div>
      )}

      {primaryBtn("Comprendre la suite →", () => setStep(2))}
      {waited ? (
        <p style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "#047857", margin: 0 }}>
          ✅ On garde votre analyse. On vous rappelle demain.
        </p>
      ) : (
        <button onClick={remindLater}
          style={{ background: "none", border: "none", color: DS.muted, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 4 }}>
          Revoir mon résultat plus tard →
        </button>
      )}
    </>);
  }

  // ═══════════════ ÉCRAN 2 — EXPLICATION DU RÉSULTAT ═══════════════
  if (step === 2) {
    return shell(<>
      <p style={{ fontSize: 20, fontWeight: 800, color: DS.ink, textAlign: "center", margin: "4px 0 0", lineHeight: 1.35 }}>
        Ce résultat ne vous définit pas
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 14, color: DS.body, lineHeight: 1.6, margin: 0 }}>
          Le Glow Score est un indicateur créé à partir de votre analyse. Il ne constitue pas un diagnostic et ne permet pas, à lui seul, de déterminer la cause exacte d'une préoccupation cutanée.
        </p>
        <p style={{ fontSize: 14, color: DS.body, lineHeight: 1.6, margin: 0 }}>
          Des problèmes de peau peuvent se ressembler, mais nécessiter des conseils différents. C'est pourquoi un échange avec un dermatologue peut être utile.
        </p>
      </div>
      {primaryBtn("Voir comment un dermatologue peut m'aider →", () => setStep(3))}
      {backLink}
    </>);
  }

  // ═══════════════ ÉCRAN 3 — VALEUR DU DERMATOLOGUE ═══════════════
  if (step === 3) {
    const advantages = [
      { e: "🩺", t: "Un avis humain d'un professionnel" },
      { e: "🎯", t: "Des recommandations adaptées à votre peau" },
      { e: "💬", t: "La possibilité de poser toutes vos questions à un dermatologue" },
    ];
    return shell(<>
      <p style={{ fontSize: 20, fontWeight: 800, color: DS.ink, textAlign: "center", margin: "4px 0 0", lineHeight: 1.35 }}>
        Parler de votre peau avec un professionnel
      </p>
      <p style={{ fontSize: 14, color: DS.body, lineHeight: 1.6, margin: 0 }}>
        Vous pourrez expliquer ce que vous observez, depuis quand cela vous préoccupe et ce que vous avez déjà essayé. Le dermatologue pourra examiner les informations disponibles, répondre à vos questions et vous orienter de manière personnalisée.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {advantages.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center", background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: "12px 14px" }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{a.e}</span>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: DS.ink, margin: 0, lineHeight: 1.4 }}>{a.t}</p>
          </div>
        ))}
      </div>
      {primaryBtn("Continuer vers la consultation →", () => setStep(4))}
      {backLink}
    </>);
  }

  // ═══════════════ ÉCRAN 4 — DÉROULEMENT ═══════════════
  if (step === 4) {
    const steps = [
      "Vous partagez les informations utiles et vos photos si nécessaire.",
      "Le dermatologue examine votre situation.",
      "Vous échangez librement avec lui.",
      "La consultation est clôturée après sa validation.",
      "Le compte rendu PDF vous est envoyé par e-mail (et par WhatsApp si disponible).",
    ];
    return shell(<>
      <p style={{ fontSize: 20, fontWeight: 800, color: DS.ink, textAlign: "center", margin: "4px 0 0", lineHeight: 1.35 }}>
        Comment se passe la consultation ?
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", background: DS.surface, border: `1px solid ${DS.border}`, borderRadius: 14, padding: "12px 14px" }}>
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: DS.violet, color: "#fff", fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
            <p style={{ fontSize: 13.5, color: DS.body, margin: 0, lineHeight: 1.5 }}>{s}</p>
          </div>
        ))}
      </div>
      {primaryBtn("Voir le tarif →", () => setStep(5))}
      {backLink}
    </>);
  }

  // ═══════════════ ÉCRAN 5 — PRIX + GARANTIE + LANCEUR RÉEL ═══════════════
  return shell(<>
    <p style={{ fontSize: 20, fontWeight: 800, color: DS.ink, textAlign: "center", margin: "4px 0 0", lineHeight: 1.35 }}>
      Une consultation dermatologique depuis votre téléphone
    </p>
    <p style={{ fontSize: 14, color: DS.body, lineHeight: 1.6, margin: 0, textAlign: "center" }}>
      La consultation supervisée est proposée <strong style={{ color: DS.ink }}>à partir de 4 800 FCFA</strong>. Le paiement se fait par <strong>MTN Mobile Money</strong> ou <strong>Orange Money</strong>. Le tarif exact du praticien s'affiche ci-dessous avant tout paiement.
    </p>

    {/* Garantie — signal de confiance, sans fausse urgence */}
    <div style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 12, padding: "10px 12px", textAlign: "center" }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#047857", margin: 0, lineHeight: 1.5 }}>
        🛡️ Si aucun dermatologue ne répond dans les 2 heures, le montant est remboursé selon les conditions du service.
      </p>
    </div>

    {/* Le lanceur réel : dermatologues, tarif exact, paiement Mobile Money */}
    <ConsultationLauncher scanId={scanId || undefined} condition={merged.condition || ""} imageUrl={imageUrl || undefined} />

    {waited ? (
      <p style={{ textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "#047857", margin: 0 }}>
        ✅ On garde votre analyse. On vous rappelle demain.
      </p>
    ) : (
      <button onClick={remindLater}
        style={{ background: "none", border: "none", color: DS.muted, fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: 4 }}>
        Je préfère attendre →
      </button>
    )}
    {backLink}
  </>);
}
