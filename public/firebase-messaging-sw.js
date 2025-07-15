// Give the service worker access to Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
firebase.initializeApp({
  apiKey: "AIzaSyC_nk4IyViUofvyIdaYq2iU7WfYCVNTiPE",
  authDomain: "id-bedragarna.firebaseapp.com",
  projectId: "id-bedragarna",
  storageBucket: "id-bedragarna.firebasestorage.app",
  messagingSenderId: "123448584214",
  appId: "1:123448584214:android:d957a0a4dcd1e714e32d37"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || '🚨 ID-BEVAKARNA BRANDLARM!';
  const notificationOptions = {
    body: payload.notification?.body || 'BRANDLARM AKTIVERAT! Kontrollera området omedelbart.',
    icon: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
    badge: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
    image: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
    tag: 'fire-alarm',
    vibrate: [500, 300, 500, 300, 500],
    requireInteraction: true,
    silent: false,
    renotify: true,
    data: {
      url: '/',
      timestamp: Date.now(),
      ...payload.data
    },
    actions: [
      {
        action: 'view',
        title: 'Öppna ID-Bevakarna',
        icon: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png'
      },
      {
        action: 'call',
        title: 'Ring 112',
        icon: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  if (event.action === 'call') {
    // Open phone dialer for emergency call
    event.waitUntil(
      clients.openWindow('tel:112')
    );
  } else {
    // Open the app - focus existing tab if available
    event.waitUntil(
      clients.matchAll({
        type: 'window'
      }).then(clientList => {
        // If the app is already open, focus it
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Handle push events (fallback)
self.addEventListener('push', function(event) {
  console.log('[firebase-messaging-sw.js] Push event received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const notificationTitle = data.notification?.title || '🚨 ID-BEVAKARNA BRANDLARM!';
    const notificationOptions = {
      body: data.notification?.body || 'BRANDLARM AKTIVERAT! Kontrollera området omedelbart.',
      icon: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
      badge: '/lovable-uploads/159221d4-8b15-48f1-bec1-aeb59779cbf0.png',
      vibrate: [500, 300, 500, 300, 500],
      requireInteraction: true,
      silent: false,
      tag: 'fire-alarm',
      renotify: true,
      data: {
        url: '/',
        timestamp: Date.now(),
        ...data.data
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
      ]
    };

    event.waitUntil(
      self.registration.showNotification(notificationTitle, notificationOptions)
    );
  }
});