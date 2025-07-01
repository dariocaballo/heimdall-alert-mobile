
// Service Worker för pushnotiser
self.addEventListener('push', function(event) {
  console.log('Push meddelande mottaget:', event);
  
  const options = {
    body: 'BRANDLARM AKTIVERAT! Kontrollera området omedelbart.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [500, 300, 500, 300, 500],
    data: {
      timestamp: Date.now(),
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'Öppna App'
      },
      {
        action: 'call',
        title: 'Ring 112'
      }
    ],
    requireInteraction: true,
    silent: false
  };

  event.waitUntil(
    self.registration.showNotification('🚨 BRANDLARM!', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('Notifikation klickad:', event.action);
  
  event.notification.close();
  
  if (event.action === 'call') {
    // Öppna telefon för att ringa 112
    event.waitUntil(
      clients.openWindow('tel:112')
    );
  } else {
    // Öppna appen
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
