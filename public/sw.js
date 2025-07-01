
// Service Worker för ID-Bevakarna pushnotiser
self.addEventListener('push', function(event) {
  console.log('Push meddelande mottaget:', event);
  
  const options = {
    body: 'BRANDLARM AKTIVERAT! Kontrollera området omedelbart.',
    icon: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
    badge: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
    vibrate: [500, 300, 500, 300, 500],
    data: {
      timestamp: Date.now(),
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'Öppna ID-Bevakarna'
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
    self.registration.showNotification('🚨 ID-BEVAKARNA BRANDLARM!', options)
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
