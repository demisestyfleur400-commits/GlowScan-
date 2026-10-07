# Prompt pour Claude Code — Ajout de l'événement Meta "Purchase" (Conversions API)

## Contexte
Le flux de paiement réel de GlowScan est aujourd'hui 100% manuel : le patient paie par Mobile Money (il entre un numéro et paie), envoie une capture d'écran sur WhatsApp, puis l'admin confirme manuellement le paiement via l'endpoint `POST /api/admin/consultations/:id/confirm` dans `server/routes.ts`. Monetbil et CinetPay existent dans le code mais ne sont **pas encore opérationnels** — ne pas brancher l'événement sur leurs webhooks.

Comme la confirmation est une action serveur déclenchée par l'admin (pas une action dans le navigateur du patient), le pixel client (`fbq`) ne peut pas la capturer de façon fiable. Il faut utiliser la **Meta Conversions API (CAPI)**, un appel serveur-à-serveur vers Meta au moment exact où le paiement est confirmé.

## Ce qu'il faut faire

### 1. Localiser le point d'accroche
Dans `server/routes.ts`, trouver le handler :
```ts
app.post("/api/admin/consultations/:id/confirm", async (req: any, res) => {
  if (!checkDatasetKey(req)) return res.status(403).json({ message: "Accès refusé" });
  try {
    const id = parseInt(req.params.id);
    const [c] = await db.update(consultations)
      .set({ paymentStatus: "paid", status: "open" })
      .where(eq(consultations.id, id)).returning();
    if (!c) return res.status(404).json({ message: "Consultation introuvable" });
    await notifyConsultationOpened(c);
    res.json({ consultation: c });
  } catch (err) {
    console.error("[consultations confirm] error:", err);
    res.status(500).json({ message: "Erreur serveur" });
  }
});
```
(Numéros de ligne indicatifs ~948-964 dans la version du code que j'ai eue sous les yeux — vérifie l'état actuel du fichier, il a pu bouger.)

Après le `await notifyConsultationOpened(c);` et avant `res.json(...)`, ajouter l'appel CAPI. Il doit être non-bloquant : si Meta répond mal ou timeout, ça ne doit jamais empêcher la confirmation du paiement de réussir pour le patient/médecin.

### 2. Créer une fonction utilitaire `sendPurchaseEvent`
Idéalement dans un nouveau petit fichier `server/metaCapi.ts` (ou à côté des autres helpers dans `routes.ts`), qui fait un POST vers l'API Graph de Meta :

```ts
import { randomUUID } from "crypto";

const META_PIXEL_ID = "2760773324307998"; // déjà confirmé dans client/index.html
const META_CAPI_ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN || "";
const META_CAPI_TEST_EVENT_CODE = process.env.META_CAPI_TEST_EVENT_CODE || undefined; // pour tester dans Events Manager, à retirer en prod

export async function sendPurchaseEvent(params: {
  valueFcfa: number;
  consultationId: number;
  fbp?: string;
  fbc?: string;
  clientIp?: string;
  userAgent?: string;
}) {
  if (!META_CAPI_ACCESS_TOKEN) {
    console.warn("[Meta CAPI] META_CAPI_ACCESS_TOKEN manquant — événement Purchase non envoyé");
    return;
  }
  try {
    const body = {
      data: [
        {
          event_name: "Purchase",
          event_time: Math.floor(Date.now() / 1000),
          event_id: `purchase_${params.consultationId}_${randomUUID()}`, // dédup si un jour un fbq côté client existe aussi
          action_source: "website",
          event_source_url: "https://glow-scan.com/consultation/confirmee",
          user_data: {
            client_ip_address: params.clientIp,
            client_user_agent: params.userAgent,
            fbp: params.fbp,
            fbc: params.fbc,
          },
          custom_data: {
            currency: "XAF",
            value: params.valueFcfa,
          },
        },
      ],
      ...(META_CAPI_TEST_EVENT_CODE ? { test_event_code: META_CAPI_TEST_EVENT_CODE } : {}),
    };

    const resp = await fetch(
      `https://graph.facebook.com/v20.0/${META_PIXEL_ID}/events?access_token=${META_CAPI_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    if (!resp.ok) {
      console.error("[Meta CAPI] échec envoi Purchase:", resp.status, await resp.text());
    }
  } catch (err) {
    console.error("[Meta CAPI] erreur envoi Purchase:", err);
  }
}
```

Node 18+ a `fetch` natif, pas besoin d'installer axios/node-fetch (vérifie quand même la version de Node utilisée en prod sur Railway).

### 3. Appeler la fonction dans le handler
```ts
await notifyConsultationOpened(c);

// Meta Conversions API — événement Purchase
sendPurchaseEvent({
  valueFcfa: c.priceFcfa ?? 0,
  consultationId: c.id,
  clientIp: req.ip,
  userAgent: req.headers["user-agent"],
}); // volontairement pas de "await" bloquant côté réponse HTTP si tu préfères que ce soit fire-and-forget ; sinon await + garder dans le try/catch existant

res.json({ consultation: c });
```

### 4. (Recommandé, amélioration qualité — optionnel pour la v1)
Pour que Meta puisse rattacher ce Purchase (qui arrive parfois des heures/jours après le clic pub, puisqu'il dépend de la confirmation manuelle) au bon utilisateur/campagne, la meilleure pratique est de capturer les cookies `_fbp` et `_fbc` du navigateur **au moment où la consultation est créée** (quand le patient est encore sur le site), de les stocker dans la ligne `consultations` (ajouter deux colonnes `fbp`/`fbc` dans `shared/schema.ts` si elles n'existent pas), puis de les relire et les passer à `sendPurchaseEvent` au moment de la confirmation. Sans ça, l'événement reste valide mais l'attribution à la pub sera moins précise. À faire si tu as le temps, pas bloquant pour lancer la campagne.

### 5. Variables d'environnement à ajouter sur Railway
- `META_CAPI_ACCESS_TOKEN` — à générer dans Meta Events Manager → ton pixel (2760773324307998) → Paramètres → Conversions API → "Générer un token d'accès".
- `META_CAPI_TEST_EVENT_CODE` (optionnel, temporaire) — visible dans Events Manager → Test Events, pour vérifier que l'événement arrive bien avant de lancer la campagne. Retirer une fois validé.

### 6. Test avant de lancer la pub
Dans Meta Events Manager → onglet "Test Events" du pixel, avec `META_CAPI_TEST_EVENT_CODE` renseigné, confirmer un paiement de test et vérifier que l'événement "Purchase" apparaît avec la bonne valeur en XAF. Ensuite retirer la variable de test.

## Ne pas faire
- Ne pas brancher ça sur les webhooks Monetbil/CinetPay (`/api/payments/cinetpay/webhook`, `/api/payments/monetbil/notify`) — ils ne sont pas utilisés actuellement.
- Ne pas faire dépendre la réponse HTTP de confirmation du succès de l'appel Meta.
