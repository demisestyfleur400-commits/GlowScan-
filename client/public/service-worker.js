self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'GlowScan';
  const options = {
    body: data.body || 'Il est temps de prendre soin de votre peau !',
    icon: data.icon || '/favicon.png',
    badge: '/favicon.png',
    // Vibration longue pour les rappels importants (Android Afrique : tue les
    // process en arrière-plan → une vibration marquée aide à ne pas manquer).
    vibrate: data.vibrate || [200, 100, 200, 100, 200],
    // requireInteraction : la notif reste affichée jusqu'à interaction du médecin.
    requireInteraction: data.requireInteraction === true,
    data: {
      url: data.url || '/'
    },
    actions: data.actions || []
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  // Action "Ignorer" → on ferme simplement, sans ouvrir de fenêtre.
  if (event.action === 'close') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          // Navigue la fenêtre existante vers la cible (dossier patient) puis focus.
          if ('navigate' in client) { try { return client.navigate(url).then(function(c){ return (c||client).focus(); }); } catch (e) {} }
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim());
});
