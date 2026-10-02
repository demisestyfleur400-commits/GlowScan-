// ════════════════════════════════════════════════════════════════════════
// Documentation de l'API réseau GlowScan (étape 16) : /developpeurs.
// Format unique pour tous les partenaires ; spécification OpenAPI complète
// sur /api/v1/network/openapi.json.
// ════════════════════════════════════════════════════════════════════════

const BASE = "https://glow-scan.com/api/v1/network";

function Code({ children }: { children: string }) {
  return <pre className="m-0 overflow-x-auto rounded-card bg-organic-text p-organic-4 font-mono text-[12px] leading-relaxed text-organic-bg">{children}</pre>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="flex flex-col gap-organic-2"><h2 className="m-0 text-[22px]">{title}</h2>{children}</section>;
}

export default function Developpeurs() {
  return (
    <main className="min-h-screen bg-organic-bg px-4 py-10 font-body text-organic-text">
      <div className="mx-auto flex max-w-[820px] flex-col gap-organic-6">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-bold uppercase tracking-[.12em] text-organic-accent-700">GlowScan · API réseau</span>
          <h1 className="m-0 text-[clamp(30px,6vw,42px)]">Envoyer un cas, recevoir l'avis</h1>
          <p className="m-0 text-[15px] text-organic-neutral-800">
            Pour tout réseau de télémédecine, hôpital ou ministère : envoyez un cas de dermatologie à un dermatologue du réseau GlowScan et récupérez son avis structuré. Même format pour tous.
          </p>
          <a href="/api/v1/network/openapi.json" className="self-start text-[14px] font-bold text-organic-accent-700">Spécification OpenAPI (JSON)</a>
        </div>

        <Section title="1. Authentification">
          <p className="m-0 text-[14px]">GlowScan vous remet une clé partenaire (une seule fois). Chaque appel porte l'en-tête :</p>
          <Code>{`Authorization: Bearer gsk_xxxxxxxx_…`}</Code>
          <p className="m-0 text-[14px]">Chaque appel est journalisé. Limite par défaut : 60 appels par minute (réponse 429 au-delà). Les cas sont débités du budget du programme auquel votre clé est rattachée.</p>
        </Section>

        <Section title="2. Envoyer un cas">
          <Code>{`POST ${BASE}/cases
Content-Type: application/json

{
  "externalRef": "VOTRE-REF-123",
  "patient": { "age": 7, "sex": "M" },
  "zone": "Cuir chevelu",
  "symptoms": "Plaques depuis 3 semaines",
  "hypothesis": "Pelade",
  "diseaseCode": "pelade",
  "tier": "simple",
  "photos": ["data:image/jpeg;base64,/9j/…"],
  "language": "fr",
  "crossBorderConsent": false
}`}</Code>
          <p className="m-0 text-[14px]">
            Réponse <b>201</b> : <code>{`{ "id": 871, "caseRef": "GS-TE-0871", "status": "awaiting_review", "dueAt": "…" }`}</code>. Renvoyer le même <code>externalRef</code> ne crée pas de doublon.
            Aucun nom ni téléphone de patient n'est attendu. Avis simple : réponse sous 24 h ; urgent : sous 2 h.
            Sans l'accord du patient (<code>crossBorderConsent</code>), le cas reste chez un dermatologue de son pays.
          </p>
          <p className="m-0 text-[14px]">Erreurs : <b>400</b> cas invalide, <b>402</b> budget du programme épuisé, <b>409</b> aucun dermatologue disponible, <b>429</b> trop d'appels.</p>
        </Section>

        <Section title="3. Suivre le cas et récupérer l'avis">
          <Code>{`GET ${BASE}/cases/871
GET ${BASE}/cases/871/opinion`}</Code>
          <p className="m-0 text-[14px]">
            L'avis (format télé-expertise) contient : la réponse à la question, le diagnostic retenu, les diagnostics à écarter, la conduite à tenir, l'orientation, le délai de revue et le dermatologue (nom, n° ONMC).
            Tant qu'il n'est pas rendu : <b>409</b>.
          </p>
        </Section>

        <Section title="4. Webhooks">
          <p className="m-0 text-[14px]">Si vous avez donné une adresse HTTPS, GlowScan vous prévient :</p>
          <ul className="m-0 flex flex-col gap-1 pl-5 text-[14px]">
            <li><code>case.answered</code> : l'avis est rendu (le corps contient l'avis complet) ;</li>
            <li><code>referral.arrived</code> : l'hôpital a confirmé l'arrivée du patient orienté.</li>
          </ul>
          <p className="m-0 text-[14px]">Chaque envoi est signé. Vérifiez l'en-tête avec le secret de webhook remis par GlowScan :</p>
          <Code>{`X-GlowScan-Signature: sha256=<HMAC-SHA256 du corps brut, clé = votre secret>
X-GlowScan-Event: case.answered
X-GlowScan-Delivery: 42`}</Code>
          <p className="m-0 text-[14px]">Répondez par un code 2xx. Sinon, GlowScan réessaie après 1 min, 5 min, 30 min, 2 h puis 12 h.</p>
        </Section>

        <Section title="5. Règles">
          <ul className="m-0 flex flex-col gap-1 pl-5 text-[14px]">
            <li>La télé-expertise conseille un soignant : le soignant local reste responsable du patient.</li>
            <li>Analyse IA indicative : seul l'avis du dermatologue fait foi.</li>
            <li>Pour une clé partenaire : contactez GlowScan sur WhatsApp au +237 674 377 959.</li>
          </ul>
        </Section>
      </div>
    </main>
  );
}
