import cron from "node-cron";
import webpush from "web-push";
import { storage } from "./storage";
import { db } from "../../db"; // Ajuste le chemin si nécessaire
import { users } from "@shared/models/auth";

function log(msg: string) {
  const t = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  console.log(`[cron ${t}] ${msg}`);
}

async function sendPushToUsers(userIds: Set<string>, notification: { title: string; body: string; url: string }) {
  try {
    const allSubs = await storage.getAllActivePushSubscriptions();
    const targetSubs = allSubs.filter((sub) => sub.userId && userIds.has(sub.userId));
    let sent = 0;
    let failed = 0;
    
    for (const sub of targetSubs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({ ...notification, icon: "/icon-192.png" })
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          await storage.deletePushSubscription(sub.endpoint);
        }
      }
    }
    return { sent, failed };
  } catch (err) {
    log(`❌ Erreur lors de la récupération ou de l'envoi des abonnements Push: ${err}`);
    return { sent: 0, failed: 0 };
  }
}

// J+2 — Ta peau a évolué
async function sendDay2Reminders() {
  log("🔔 Envoi rappels J+2...");
  try {
    const stale2 = await storage.getUsersWithStaleScans(2);
    const stale3 = await storage.getUsersWithStaleScans(3);
    const stale3Ids = new Set(stale3.map((u) => u.userId));
    const day2Only = stale2.filter((u) => u.userId && !stale3Ids.has(u.userId) && !u.userId.includes(":"));
    const ids = new Set(day2Only.map((u) => u.userId));
    
    if (ids.size === 0) {
      log("✅ J+2 : Aucun utilisateur concerné aujourd'hui.");
      return;
    }

    const { sent, failed } = await sendPushToUsers(ids, {
      title: "🌸 Ta peau a évolué",
      body: "Viens voir ! 2 jours se sont écoulés depuis ton dernier scan.",
      url: "/analyze",
    });
    log(`✅ J+2 : ${sent} envoyés, ${failed} échecs (${day2Only.length} utilisateurs)`);
  } catch (err) {
    log(`❌ Erreur rappels J+2 : ${err}`);
  }
}

// J+7 — Essaie SkinBot
async function sendDay7SkinBotReminders() {
  log("🔔 Envoi rappels J+7 SkinBot...");
  try {
    const stale7 = await storage.getUsersWithStaleScans(7);
    const stale8 = await storage.getUsersWithStaleScans(8);
    const stale8Ids = new Set(stale8.map((u) => u.userId));
    const day7Only = stale7.filter((u) => u.userId && !stale8Ids.has(u.userId) && !u.userId.includes(":"));
    const ids = new Set(day7Only.map((u) => u.userId));

    if (ids.size === 0) {
      log("✅ J+7 SkinBot : Aucun utilisateur concerné aujourd'hui.");
      return;
    }

    const { sent, failed } = await sendPushToUsers(ids, {
      title: "🤖 SkinBot t'attend",
      body: "Tu n'as pas encore essayé SkinBot — pose ta première question gratuite !",
      url: "/chat",
    });
    log(`✅ J+7 SkinBot : ${sent} envoyés, ${failed} échecs (${day7Only.length} utilisateurs)`);
  } catch (err) {
    log(`❌ Erreur rappels J+7 : ${err}`);
  }
}

// J+14 — Suivi 2 semaines prêt
async function sendDay14Reminders() {
  log("🔔 Envoi rappels J+14...");
  try {
    const stale14 = await storage.getUsersWithStaleScans(14);
    const stale15 = await storage.getUsersWithStaleScans(15);
    const stale15Ids = new Set(stale15.map((u) => u.userId));
    const day14Only = stale14.filter((u) => u.userId && !stale15Ids.has(u.userId) && !u.userId.includes(":"));
    const ids = new Set(day14Only.map((u) => u.userId));

    if (ids.size === 0) {
      log("✅ J+14 : Aucun utilisateur concerné aujourd'hui.");
      return;
    }

    const { sent, failed } = await sendPushToUsers(ids, {
      title: "📈 Ton suivi de 2 semaines est prêt",
      body: "Reviens voir tes progrès — ta peau a sûrement changé en 14 jours.",
      url: "/profile?tab=evolution",
    });
    log(`✅ J+14 : ${sent} envoyés, ${failed} échecs (${day14Only.length} utilisateurs)`);
  } catch (err) {
    log(`❌ Erreur rappels J+14 : ${err}`);
  }
}

// Rappels produits 72h (commande WhatsApp)
async function sendProductReminders() {
  log("🛍️ Envoi des rappels produits 72h...");
  try {
    const usersList = await storage.getUsersWithScansBetweenHours(60, 84);
    const filteredUsers = usersList.filter((u) => u.userId && !u.userId.includes(":"));
    const userIds = new Set(filteredUsers.map((u) => u.userId));

    if (userIds.size === 0) {
      log("✅ Rappels produits 72h : Aucun utilisateur concerné.");
      return;
    }

    const { sent, failed } = await sendPushToUsers(userIds, {
      title: "🌟 Tes produits t'attendent !",
      body: "Tu as reçu ta routine il y a 3 jours. Tes produits sont encore disponibles — commande maintenant !",
      url: "/",
    });
    log(`✅ Rappels produits 72h : ${sent} envoyés, ${failed} échecs (${filteredUsers.length} utilisateurs)`);
  } catch (err) {
    log(`❌ Erreur rappels produits : ${err}`);
  }
}

// Rappels routine matin/soir — Vérification par minute
async function sendRoutineReminders(currentHHMM: string) {
  let routinesToCheck = [];
  try {
    routinesToCheck = await storage.getAllRoutinesWithUserAndSteps();
  } catch (dbErr) {
    log(`❌ Erreur critique lors de la récupération des routines de la DB : ${dbErr}`);
    return;
  }

  const matching = routinesToCheck.filter((r) => 
    r.reminderEnabled && 
    r.reminderTime === currentHHMM && 
    r.steps.length > 0 &&
    r.userId &&
    !r.userId.includes(":")
  );

  if (matching.length === 0) return;

  let successfullySentCount = 0;

  for (const r of matching) {
    try {
      const period = r.period === "morning" ? "matin" : "soir";
      const emoji = r.period === "morning" ? "✨" : "🌙";
      
      const { sent } = await sendPushToUsers(new Set([r.userId]), {
        title: `C'est l'heure de ta routine ${period} ${emoji}`,
        body: "Ta peau compte sur toi !",
        url: "/routine",
      });
      
      if (sent > 0) successfullySentCount++;
    } catch (userErr) {
      // Si un utilisateur précis crash (ex: profil supprimé ou inexistant côté tenant), on log et on passe au suivant
      log(`⚠️ Impossible d'envoyer la notification pour l'utilisateur ${r.userId} : ${userErr}`);
    }
  }

  if (successfullySentCount > 0) {
    log(`🔔 Rappels routine ${currentHHMM} : ${successfullySentCount} envoyés avec succès`);
  }
}

// À 22h00 : check routines soir non complétées
async function sendEveningMissedReminders() {
  log("🌙 Vérification des routines du soir manquées...");
  try {
    const all = await storage.getAllRoutinesWithUserAndSteps();
    const evening = all.filter((r) => r.period === "evening" && r.steps.length > 0 && r.userId && !r.userId.includes(":"));
    if (evening.length === 0) return;
    
    const today = new Date(Date.now() + 3600000).toISOString().slice(0, 10); // Fuseau Douala

    let sent = 0;
    for (const r of evening) {
      try {
        const completions = await storage.getCompletionsForDate(r.userId, today);
        const stepIds = new Set(r.steps.map((s) => s.id));
        const doneCount = completions.filter((c) => stepIds.has(c.stepId)).length;
        if (doneCount < r.steps.length) {
          await sendPushToUsers(new Set([r.userId]), {
            title: "Tu n'as pas fait ta routine ce soir 🌙",
            body: "Ta peau en a besoin — coche tes étapes maintenant.",
            url: "/routine",
          });
          sent++;
        }
      } catch (innerErr) {
        log(`⚠️ Erreur routine manquée pour l'user ${r.userId} : ${innerErr}`);
      }
    }
    log(`🌙 Rappels routine soir manquée : ${sent} envoyés`);
  } catch (err) {
    log(`❌ Erreur globale rappels soir manquée : ${err}`);
  }
}

export function startCronJobs() {
  if (process.env.NODE_ENV === "test") return;

  cron.schedule("* * * * *", () => {
    const doualaDate = new Date(Date.now() + 3600000);
    const hh = String(doualaDate.getHours()).padStart(2, "0");
    const mm = String(doualaDate.getMinutes()).padStart(2, "0");
    sendRoutineReminders(`${hh}:${mm}`);
  }, { timezone: "Africa/Douala" });
  log("✅ Cron rappels routines actif — chaque minute (Douala)");

  cron.schedule("0 22 * * *", sendEveningMissedReminders, { timezone: "Africa/Douala" });
  log("✅ Cron rappel soir non complétée actif — 22h00 (Douala)");

  cron.schedule("0 9 * * *", sendDay2Reminders, { timezone: "Africa/Douala" });
  log("✅ Cron J+2 actif — tous les jours à 9h00 (Douala)");

  cron.schedule("30 9 * * *", sendDay7SkinBotReminders, { timezone: "Africa/Douala" });
  log("✅ Cron J+7 SkinBot actif — tous les jours à 9h30 (Douala)");

  cron.schedule("0 10 * * *", sendDay14Reminders, { timezone: "Africa/Douala" });
  log("✅ Cron J+14 actif — tous les jours à 10h00 (Douala)");

  cron.schedule("30 10 * * *", sendProductReminders, { timezone: "Africa/Douala" });
  log("✅ Cron rappels produits 72h actif — tous les jours à 10h30 (Douala)");
}
